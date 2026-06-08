import pytest
from app.core.textile.mass_spring_engine import MassSpringEngine
from app.core.textile.fabric_properties import get_fabric_properties
from app.schemas.simulation import (
    AnimationType,
    AvatarSimData,
    ClothingSimData,
    FabricProperties,
)


# Fixtures

@pytest.fixture
def engine() -> MassSpringEngine:
    return MassSpringEngine()


@pytest.fixture
def cotton_fabric() -> FabricProperties:
    return get_fabric_properties("cotton")


@pytest.fixture
def denim_fabric() -> FabricProperties:
    return get_fabric_properties("denim")


@pytest.fixture
def standard_avatar() -> AvatarSimData:
    return AvatarSimData(
        avatar_id="avatar-test-001",
        smpl_betas=[0.0] * 10,
        height_cm=175.0,
        weight_kg=70.0,
    )


def _make_clothing(fabric: FabricProperties) -> ClothingSimData:
    return ClothingSimData(
        clothing_id="cloth-test-001",
        mesh_reference="meshes/clothing/test.glb",
        fabric=fabric,
        category="top",
    )


# Tests du moteur

class TestMassSpringEngine:

    def test_simulate_returns_completed_status(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-test-001",
        )
        assert result.status == "completed"

    def test_simulate_returns_correct_frame_count_standing(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-standing",
        )
        assert result.frame_count == 10
        assert len(result.frames) == 10

    def test_simulate_returns_correct_frame_count_walking(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.WALKING,
            session_id="session-walking",
        )
        assert result.frame_count == 30

    def test_simulate_returns_correct_frame_count_rotating(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.ROTATING,
            session_id="session-rotating",
        )
        assert result.frame_count == 20

    def test_fit_score_in_valid_range(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-score",
        )
        assert 0.0 <= result.fit_analysis.fit_score <= 100.0

    def test_overall_fit_is_valid_value(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-fit",
        )
        assert result.fit_analysis.overall_fit in ("good", "tight", "loose")

    def test_tension_zones_are_present(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-zones",
        )
        assert len(result.fit_analysis.tension_zones) > 0

    def test_tension_values_in_valid_range(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-tension",
        )
        for zone in result.fit_analysis.tension_zones:
            assert 0.0 <= zone.tension_value <= 1.0
            assert zone.tension_level in ("low", "medium", "high")

    def test_recommendations_are_present(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-recs",
        )
        assert len(result.fit_analysis.recommendations) > 0

    def test_simulation_ms_is_positive(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
        cotton_fabric: FabricProperties,
    ) -> None:
        result = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-time",
        )
        assert result.simulation_ms > 0

    def test_denim_is_stiffer_than_silk(
        self,
        engine: MassSpringEngine,
        standard_avatar: AvatarSimData,
    ) -> None:
        """Le denim (rigide) doit produire plus de tension que la soie."""
        denim = get_fabric_properties("denim")
        silk  = get_fabric_properties("silk")

        r_denim = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(denim),
            animation=AnimationType.STANDING,
            session_id="session-denim",
        )
        r_silk = engine.simulate(
            avatar=standard_avatar,
            clothing=_make_clothing(silk),
            animation=AnimationType.STANDING,
            session_id="session-silk",
        )

        # Le denim rigide doit produire plus d'énergie dans le système
        denim_energy = sum(f.energy for f in r_denim.frames)
        silk_energy  = sum(f.energy for f in r_silk.frames)
        assert denim_energy >= silk_energy

    def test_tall_avatar_produces_valid_simulation(
        self,
        engine: MassSpringEngine,
        cotton_fabric: FabricProperties,
    ) -> None:
        """Un avatar très grand doit simuler sans erreur."""
        tall_avatar = AvatarSimData(
            avatar_id="avatar-tall",
            smpl_betas=[1.5] + [0.0] * 9,
            height_cm=200.0,
            weight_kg=90.0,
        )
        result = engine.simulate(
            avatar=tall_avatar,
            clothing=_make_clothing(cotton_fabric),
            animation=AnimationType.STANDING,
            session_id="session-tall",
        )
        assert result.status == "completed"


# Tests du catalogue de tissus

class TestFabricProperties:

    def test_all_fabrics_in_catalogue(self) -> None:
        """Tous les types de tissu doivent être dans le catalogue."""
        fabrics = [
            "cotton", "denim", "wool", "silk",
            "polyester", "linen", "unknown",
        ]
        for fabric_type in fabrics:
            props = get_fabric_properties(fabric_type)
            assert props.fabric_type == fabric_type

    def test_unknown_fabric_returns_default(self) -> None:
        """Un type inconnu doit retourner les valeurs par défaut."""
        props = get_fabric_properties("leather")
        assert props.fabric_type == "unknown"

    def test_denim_has_highest_stiffness(self) -> None:
        """Le denim doit être le tissu le plus rigide du catalogue."""
        denim   = get_fabric_properties("denim")
        silk    = get_fabric_properties("silk")
        cotton  = get_fabric_properties("cotton")
        assert denim.stiffness > silk.stiffness
        assert denim.stiffness > cotton.stiffness

    def test_silk_has_lowest_friction(self) -> None:
        """La soie doit avoir la friction la plus faible."""
        silk   = get_fabric_properties("silk")
        denim  = get_fabric_properties("denim")
        cotton = get_fabric_properties("cotton")
        assert silk.friction_coeff < denim.friction_coeff
        assert silk.friction_coeff < cotton.friction_coeff

    def test_all_coefficients_in_valid_range(self) -> None:
        """Tous les coefficients doivent être dans [0, 1]."""
        fabrics = [
            "cotton", "denim", "wool", "silk",
            "polyester", "linen", "unknown",
        ]
        for fabric_type in fabrics:
            props = get_fabric_properties(fabric_type)
            assert 0.0 <= props.elasticity_coeff <= 1.0
            assert 0.0 <= props.friction_coeff    <= 1.0
            assert 0.0 <= props.stiffness         <= 1.0
            assert 0.0 <= props.damping           <= 0.5