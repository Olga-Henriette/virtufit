"""Tests unitaires du moteur SMPL."""

import pytest
from app.core.morphology.smpl_engine import SMPLEngine
from app.schemas.avatar import GenderEnum, MeasurementsInput


# Fixtures

@pytest.fixture
def engine() -> SMPLEngine:
    return SMPLEngine()


@pytest.fixture
def standard_measurements() -> MeasurementsInput:
    return MeasurementsInput(
        height_cm=175.5,
        weight_kg=70.0,
        chest_cm=95.0,
        waist_cm=80.0,
        hips_cm=98.0,
        shoulder_width_cm=45.0,
        inseam_cm=80.0,
        neck_cm=38.0,
        gender=GenderEnum.NEUTRAL,
    )


@pytest.fixture
def minimal_measurements() -> MeasurementsInput:
    return MeasurementsInput(
        height_cm=160.0,
        weight_kg=55.0,
        chest_cm=84.0,
        waist_cm=68.0,
        hips_cm=90.0,
        shoulder_width_cm=36.0,
    )


# Tests de génération

class TestSMPLEngine:

    def test_generate_returns_valid_response(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie que generate() retourne une réponse complète."""
        result = engine.generate(standard_measurements, "user-test-001")

        assert result.user_id     == "user-test-001"
        assert result.avatar_id   is not None
        assert result.bmi         >  0
        assert result.generation_time_ms > 0

    def test_smpl_betas_count(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie que 10 paramètres bêta sont générés."""
        result = engine.generate(standard_measurements, "user-test-002")
        assert len(result.smpl_parameters.betas) == 10

    def test_smpl_thetas_count(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie que 72 paramètres thêta sont générés."""
        result = engine.generate(standard_measurements, "user-test-003")
        assert len(result.smpl_parameters.thetas) == 72

    def test_betas_within_valid_range(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie que tous les bêtas sont dans [-3, 3]."""
        result = engine.generate(standard_measurements, "user-test-004")
        for beta in result.smpl_parameters.betas:
            assert -3.0 <= beta <= 3.0, f"Beta hors plage : {beta}"

    def test_mesh_vertices_count(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie le nombre de sommets du maillage SMPL."""
        result = engine.generate(standard_measurements, "user-test-005")
        assert result.mesh.vertices_count == 6_890

    def test_mesh_faces_count(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie le nombre de faces du maillage SMPL."""
        result = engine.generate(standard_measurements, "user-test-006")
        assert result.mesh.faces_count == 13_776

    def test_mesh_format_is_gltf(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie que le format du maillage est glTF."""
        result = engine.generate(standard_measurements, "user-test-007")
        assert result.mesh.mesh_format == "gltf"

    def test_bmi_calculation_correct(
        self,
        engine: SMPLEngine,
    ) -> None:
        """Vérifie le calcul de l'IMC (70 kg / 1.75² ≈ 22.86)."""
        m = MeasurementsInput(
            height_cm=175.0,
            weight_kg=70.0,
            chest_cm=95.0,
            waist_cm=80.0,
            hips_cm=98.0,
            shoulder_width_cm=45.0,
        )
        result = engine.generate(m, "user-bmi-test")
        expected_bmi = 70.0 / (1.75 ** 2)
        assert abs(result.bmi - expected_bmi) < 0.1

    def test_different_users_get_different_avatar_ids(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Chaque génération produit un avatar_id unique."""
        r1 = engine.generate(standard_measurements, "user-A")
        r2 = engine.generate(standard_measurements, "user-B")
        assert r1.avatar_id != r2.avatar_id

    def test_mesh_reference_contains_user_id(
        self,
        engine: SMPLEngine,
        standard_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie que la référence du maillage contient le user_id."""
        user_id = "user-ref-test"
        result  = engine.generate(standard_measurements, user_id)
        assert user_id in result.mesh.mesh_reference

    def test_minimal_measurements_work(
        self,
        engine: SMPLEngine,
        minimal_measurements: MeasurementsInput,
    ) -> None:
        """Vérifie que les mensurations minimales (sans optionnels) fonctionnent."""
        result = engine.generate(minimal_measurements, "user-minimal")
        assert result.avatar_id is not None
        assert len(result.smpl_parameters.betas) == 10

    def test_tall_person_has_positive_beta_0(
        self,
        engine: SMPLEngine,
    ) -> None:
        """Une personne grande doit avoir β0 positif (corrélé à la taille)."""
        tall = MeasurementsInput(
            height_cm=200.0,
            weight_kg=80.0,
            chest_cm=100.0,
            waist_cm=85.0,
            hips_cm=100.0,
            shoulder_width_cm=48.0,
        )
        result = engine.generate(tall, "user-tall")
        assert result.smpl_parameters.betas[0] > 0

    def test_short_person_has_negative_beta_0(
        self,
        engine: SMPLEngine,
    ) -> None:
        """Une personne petite doit avoir β0 négatif."""
        short = MeasurementsInput(
            height_cm=150.0,
            weight_kg=50.0,
            chest_cm=80.0,
            waist_cm=65.0,
            hips_cm=85.0,
            shoulder_width_cm=34.0,
        )
        result = engine.generate(short, "user-short")
        assert result.smpl_parameters.betas[0] < 0