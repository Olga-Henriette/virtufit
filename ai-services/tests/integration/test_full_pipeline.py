"""Tests d'intégration du pipeline AI Services complet.

Valide le flux de bout en bout sans dépendances externes.
"""

import pytest
from app.core.morphology.smpl_engine         import SMPLEngine
from app.core.morphology.morphotype_service  import MorphotypeService
from app.core.morphology.photo_analyzer      import PhotoAnalyzer
from app.core.textile.digitization_pipeline  import DigitizationPipeline
from app.core.textile.mass_spring_engine     import MassSpringEngine
from app.core.textile.collision_engine       import build_avatar_proxy
from app.core.textile.fit_analyzer           import FitAnalyzer
from app.core.textile.fabric_properties      import get_fabric_properties
from app.core.compute.device_manager         import get_device_manager
from app.core.compute.simulation_cache       import SimulationCache, build_simulation_key
from app.core.compute.task_queue             import TaskQueue
from app.schemas.avatar       import AvatarGenerationRequest, GenderEnum, MeasurementsInput
from app.schemas.morphotype   import MorphotypeAvatarRequest, MorphotypeCode
from app.schemas.simulation   import (
    AnimationType, AvatarSimData, ClothingSimData,
)
from app.schemas.clothing     import ClothingCategory, ViewAngle
import io
from PIL import Image


# Helpers

def _make_image_bytes(rgb=(180, 140, 110), size=(300, 400)) -> bytes:
    img = Image.new("RGB", size, rgb)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def standard_measurements() -> MeasurementsInput:
    return MeasurementsInput(
        height_cm=175.0, weight_kg=70.0,
        chest_cm=95.0,   waist_cm=80.0,
        hips_cm=98.0,    shoulder_width_cm=45.0,
        inseam_cm=80.0,  neck_cm=38.0,
        gender=GenderEnum.NEUTRAL,
    )


# Pipeline 1 : Mensurations → Avatar → Simulation → Fit Analysis

class TestFullMorphologyPipeline:

    def test_measurements_to_avatar_to_simulation(
        self, standard_measurements: MeasurementsInput
    ) -> None:
        """
        Flux complet :
        Mensurations → SMPL → Avatar → Mass-Spring → Fit Analysis
        """
        # Étape 1 : Génération avatar SMPL
        engine = SMPLEngine()
        avatar_result = engine.generate(
            standard_measurements, "integration-user-001"
        )

        assert avatar_result.avatar_id is not None
        assert len(avatar_result.smpl_parameters.betas) == 10
        assert avatar_result.bmi > 0

        # Étape 2 : Construction du proxy avatar
        avatar_sim = AvatarSimData(
            avatar_id=avatar_result.avatar_id,
            smpl_betas=avatar_result.smpl_parameters.betas,
            height_cm=standard_measurements.height_cm,
            weight_kg=standard_measurements.weight_kg,
        )
        proxy = build_avatar_proxy(avatar_sim)
        assert len(proxy.capsules) == 14

        # Étape 3 : Simulation physique
        fabric   = get_fabric_properties("cotton")
        clothing = ClothingSimData(
            clothing_id="cloth-integration-001",
            mesh_reference="meshes/integration.glb",
            fabric=fabric,
            category="top",
        )

        mss_engine = MassSpringEngine()
        sim_result = mss_engine.simulate(
            avatar=avatar_sim,
            clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="session-integration-001",
        )

        assert sim_result.status      == "completed"
        assert sim_result.frame_count == 10
        assert 0.0 <= sim_result.fit_analysis.fit_score <= 100.0

        # Étape 4 : Analyse d'ajustement détaillée
        analyzer = FitAnalyzer()
        fit_report = analyzer.analyze(
            sim_result=sim_result,
            user_id="integration-user-001",
            clothing_id="cloth-integration-001",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )

        assert fit_report.overall_score  >= 0.0
        assert fit_report.comfort_score  >= 0.0
        assert fit_report.mobility_score >= 0.0
        assert len(fit_report.recommendations) > 0
        assert len(fit_report.style_tips)      > 0
        assert fit_report.size_comparison.current_size == "M"

    def test_morphotype_to_simulation(self) -> None:
        """
        Flux morphotype :
        MorphotypeCode → Mise à l'échelle → SMPL → Simulation
        """
        service = MorphotypeService()
        request = MorphotypeAvatarRequest(
            user_id="integration-morph-001",
            morphotype_code=MorphotypeCode.NEUTRAL_ATHLETIC,
            target_height_cm=180.0,
            target_weight_kg=78.0,
        )

        avatar_result = service.generate_from_morphotype(request)
        assert avatar_result.user_id   == "integration-morph-001"
        assert avatar_result.avatar_id is not None

        # Simulation depuis le résultat morphotype
        avatar_sim = AvatarSimData(
            avatar_id=avatar_result.avatar_id,
            smpl_betas=avatar_result.smpl_parameters.betas,
            height_cm=180.0,
            weight_kg=78.0,
        )

        fabric   = get_fabric_properties("denim")
        clothing = ClothingSimData(
            clothing_id="cloth-morph-integration",
            mesh_reference="meshes/morph.glb",
            fabric=fabric,
            category="bottom",
        )

        mss = MassSpringEngine()
        result = mss.simulate(
            avatar=avatar_sim,
            clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="session-morph-integration",
        )

        assert result.status == "completed"


# Pipeline 2 : Photo → Personnalisation → Simulation

class TestPersonalizationPipeline:

    def test_photo_to_visual_features(self) -> None:
        """Analyse de photo et extraction des features."""
        analyzer      = PhotoAnalyzer()
        image_bytes   = _make_image_bytes(rgb=(200, 160, 130))
        result        = analyzer.analyze(image_bytes, "integration-photo-001")

        assert result.visual_features.skin_tone  is not None
        assert result.visual_features.hair_color is not None
        assert 0.0 <= result.visual_features.confidence_score <= 1.0
        assert result.analysis_time_ms > 0


# Pipeline 3 : Photos vêtement → Numérisation → Simulation

class TestDigitizationSimulationPipeline:

    def test_clothing_digitization_to_simulation(self) -> None:
        """
        Flux vêtement :
        Photos → Numérisation → Propriétés tissu → Simulation
        """
        # Numérisation
        pipeline = DigitizationPipeline()
        photos   = [
            _make_image_bytes(rgb=(45, 80, 150), size=(500, 700)),
            _make_image_bytes(rgb=(45, 78, 148), size=(500, 700)),
        ]

        digitized = pipeline.process(
            images_bytes=photos,
            view_angles=[ViewAngle.FRONT, ViewAngle.BACK],
            clothing_id="cloth-digit-integration",
            vendor_id="vendor-integration-001",
            category=ClothingCategory.TOP,
        )

        assert digitized.clothing_id  == "cloth-digit-integration"
        assert digitized.fabric_type  is not None
        assert digitized.mesh_reference.endswith(".glb")
        assert len(digitized.photo_analyses) >= 1

        # Simulation depuis les propriétés du tissu
        fabric_props = get_fabric_properties(digitized.fabric_type)

        avatar_sim = AvatarSimData(
            avatar_id="avatar-digit-test",
            smpl_betas=[0.0] * 10,
            height_cm=170.0,
            weight_kg=65.0,
        )
        clothing_sim = ClothingSimData(
            clothing_id=digitized.clothing_id,
            mesh_reference=digitized.mesh_reference,
            fabric=fabric_props,
            category="top",
        )

        mss    = MassSpringEngine()
        result = mss.simulate(
            avatar=avatar_sim,
            clothing=clothing_sim,
            animation=AnimationType.STANDING,
            session_id="session-digit-integration",
        )

        assert result.status      == "completed"
        assert result.frame_count == 10


# Pipeline 4 : Cache → Optimisation → Monitoring

class TestOptimizationPipeline:

    def test_cache_reduces_computation(self) -> None:
        """Le cache doit retourner instantanément au deuxième appel."""
        import time

        cache = SimulationCache(max_entries=10, ttl_seconds=60)

        # Prépare un résultat simulé
        mss = MassSpringEngine()
        fabric = get_fabric_properties("cotton")
        avatar = AvatarSimData(
            avatar_id="av-cache-int",
            smpl_betas=[0.0] * 10,
            height_cm=175.0, weight_kg=70.0,
        )
        clothing = ClothingSimData(
            clothing_id="cl-cache-int",
            mesh_reference="meshes/cache.glb",
            fabric=fabric, category="top",
        )

        # Premier calcul
        t0     = time.perf_counter()
        result = mss.simulate(
            avatar=avatar, clothing=clothing,
            animation=AnimationType.STANDING,
            session_id="session-cache-int-1",
        )
        t1 = time.perf_counter()
        first_ms = (t1 - t0) * 1000

        # Stocke en cache
        key = build_simulation_key(
            fabric_type="cotton", elasticity_coeff=0.25,
            friction_coeff=0.55,  stiffness=0.35,
            smpl_betas=[0.0]*10,  height_cm=175.0,
            weight_kg=70.0,       animation_type="standing",
        )
        cache.set(key, result)

        # Deuxième appel → doit être instantané
        t2     = time.perf_counter()
        cached = cache.get(key)
        t3     = time.perf_counter()
        cache_ms = (t3 - t2) * 1000

        assert cached is not None
        assert cache_ms < first_ms   # Le cache est plus rapide

    def test_device_manager_provides_valid_info(self) -> None:
        """Le DeviceManager retourne des informations cohérentes."""
        dm = get_device_manager()

        assert dm.device_type in ("cuda", "mps", "cpu")
        assert len(dm.device_name) > 0

        mem = dm.get_memory_usage()
        assert 0.0 <= mem.get("percent", 0) <= 100.0


# Pipeline 5 : File de tâches → Workers → Résultats

class TestAsyncPipeline:

    def test_task_queue_full_lifecycle(self) -> None:
        """
        Cycle de vie complet d'une tâche :
        Soumission → Traitement → Complétion
        """
        import uuid
        from app.schemas.tasks import TaskPriority, TaskRequest, TaskStatus, TaskType

        queue = TaskQueue()
        task  = TaskRequest(
            task_id=str(uuid.uuid4()),
            task_type=TaskType.SIMULATION,
            priority=TaskPriority.HIGH,
            payload={"test": "integration"},
            user_id="integration-async-user",
        )

        # Soumission
        result = queue.submit(task)
        assert result.status == TaskStatus.PENDING

        # Consommation
        next_task = queue.get_next(timeout=1.0)
        assert next_task is not None
        assert next_task.task_id == task.task_id

        # Statut en traitement
        status = queue.get_status(task.task_id)
        assert status.status == TaskStatus.PROCESSING

        # Complétion
        queue.complete(task.task_id, {"fit_score": 85.0})
        final = queue.get_result(task.task_id)
        assert final.status == TaskStatus.COMPLETED
        assert final.result == {"fit_score": 85.0}