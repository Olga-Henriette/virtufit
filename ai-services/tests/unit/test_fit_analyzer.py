"""Tests unitaires du moteur d'analyse d'ajustement."""

import pytest
from app.core.textile.fit_analyzer    import FitAnalyzer, SIZE_ORDER
from app.core.textile.mass_spring_engine import MassSpringEngine
from app.core.textile.fabric_properties  import get_fabric_properties
from app.schemas.avatar       import MeasurementsInput, GenderEnum
from app.schemas.fit_analysis import (
    FitCategory, TensionLevel, AnatomicZone,
)
from app.schemas.simulation   import (
    AnimationType, AvatarSimData, ClothingSimData,
)


# Fixtures

@pytest.fixture
def analyzer() -> FitAnalyzer:
    return FitAnalyzer()


@pytest.fixture
def standard_measurements() -> MeasurementsInput:
    return MeasurementsInput(
        height_cm=175.0, weight_kg=70.0,
        chest_cm=95.0, waist_cm=80.0,
        hips_cm=98.0, shoulder_width_cm=45.0,
        inseam_cm=80.0, neck_cm=38.0,
        arm_length_cm=62.0, thigh_cm=58.0,
        gender=GenderEnum.NEUTRAL,
    )


@pytest.fixture
def sim_result():
    """Résultat de simulation réel."""
    engine   = MassSpringEngine()
    fabric   = get_fabric_properties("cotton")
    avatar   = AvatarSimData(
        avatar_id="avatar-fit-test",
        smpl_betas=[0.0] * 10,
        height_cm=175.0, weight_kg=70.0,
    )
    clothing = ClothingSimData(
        clothing_id="cloth-fit-test",
        mesh_reference="meshes/test.glb",
        fabric=fabric, category="top",
    )
    return engine.simulate(
        avatar=avatar, clothing=clothing,
        animation=AnimationType.STANDING,
        session_id="session-fit-test",
    )


# Tests principaux

class TestFitAnalyzer:

    def test_analyze_returns_detailed_report(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-test",
            clothing_id="cloth-test",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        assert result.session_id   == sim_result.session_id
        assert result.user_id      == "user-test"
        assert result.clothing_id  == "cloth-test"

    def test_scores_are_in_valid_range(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-scores",
            clothing_id="cloth-scores",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        assert 0.0 <= result.overall_score  <= 100.0
        assert 0.0 <= result.comfort_score  <= 100.0
        assert 0.0 <= result.mobility_score <= 100.0

    def test_fit_category_is_valid(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-cat",
            clothing_id="cloth-cat",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        assert result.fit_category in [c for c in FitCategory]

    def test_zone_analyses_are_present(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-zones",
            clothing_id="cloth-zones",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        assert len(result.zone_analyses) > 0

    def test_zone_tension_values_in_range(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-tv",
            clothing_id="cloth-tv",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        for z in result.zone_analyses:
            assert 0.0 <= z.tension_value <= 1.0
            assert z.tension_level in [l for l in TensionLevel]

    def test_recommendations_not_empty(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-recs",
            clothing_id="cloth-recs",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        assert len(result.recommendations) >= 1

    def test_summary_is_not_empty(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-sum",
            clothing_id="cloth-sum",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        assert len(result.summary) > 0

    def test_size_comparison_has_current_size(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-size",
            clothing_id="cloth-size",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="L",
            animation_type="standing",
        )
        assert result.size_comparison.current_size == "L"

    def test_style_tips_provided(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-tips",
            clothing_id="cloth-tips",
            measurements=standard_measurements,
            fabric_type="silk",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        assert len(result.style_tips) >= 1

    def test_simulation_ms_is_positive(
        self, analyzer: FitAnalyzer,
        sim_result, standard_measurements: MeasurementsInput,
    ) -> None:
        result = analyzer.analyze(
            sim_result=sim_result,
            user_id="user-ms",
            clothing_id="cloth-ms",
            measurements=standard_measurements,
            fabric_type="cotton",
            category="top",
            current_size="M",
            animation_type="standing",
        )
        assert result.simulation_ms > 0


# Tests classify_fit

class TestClassifyFit:

    def test_perfect_score(self) -> None:
        assert FitAnalyzer._classify_fit(95.0) == FitCategory.PERFECT

    def test_good_score(self) -> None:
        assert FitAnalyzer._classify_fit(80.0) == FitCategory.GOOD

    def test_acceptable_score(self) -> None:
        assert FitAnalyzer._classify_fit(65.0) == FitCategory.ACCEPTABLE

    def test_tight_score(self) -> None:
        assert FitAnalyzer._classify_fit(45.0) == FitCategory.TIGHT

    def test_loose_score(self) -> None:
        assert FitAnalyzer._classify_fit(20.0) == FitCategory.LOOSE

    def test_boundary_90_is_perfect(self) -> None:
        assert FitAnalyzer._classify_fit(90.0) == FitCategory.PERFECT

    def test_boundary_75_is_good(self) -> None:
        assert FitAnalyzer._classify_fit(75.0) == FitCategory.GOOD


# Tests classify_tension

class TestClassifyTension:

    def test_zero_tension_is_none(self) -> None:
        assert FitAnalyzer._classify_tension(0.05) == TensionLevel.NONE

    def test_low_tension(self) -> None:
        assert FitAnalyzer._classify_tension(0.20) == TensionLevel.LOW

    def test_medium_tension(self) -> None:
        assert FitAnalyzer._classify_tension(0.40) == TensionLevel.MEDIUM

    def test_high_tension(self) -> None:
        assert FitAnalyzer._classify_tension(0.70) == TensionLevel.HIGH

    def test_critical_tension(self) -> None:
        assert FitAnalyzer._classify_tension(0.90) == TensionLevel.CRITICAL


# Tests compare_sizes

class TestCompareSizes:

    def test_no_suggestion_for_good_fit(self, analyzer: FitAnalyzer) -> None:
        result = analyzer._compare_sizes(
            current_size="M",
            overall_score=85.0,
            zone_analyses=[],
            category="top",
        )
        assert result.suggested_size is None

    def test_size_up_for_tight_fit(self, analyzer: FitAnalyzer) -> None:
        from app.schemas.fit_analysis import ZoneAnalysis
        high_zone = ZoneAnalysis(
            zone=AnatomicZone.CHEST,
            tension_value=0.75,
            tension_level=TensionLevel.HIGH,
            fit_delta_cm=-3.0,
            is_constraining=True,
        )
        result = analyzer._compare_sizes(
            current_size="M",
            overall_score=40.0,
            zone_analyses=[high_zone],
            category="top",
        )
        assert result.suggested_size == "L"

    def test_size_order_boundaries(self, analyzer: FitAnalyzer) -> None:
        """XS ne peut pas descendre, XXXL ne peut pas monter."""
        result_xs = analyzer._compare_sizes(
            current_size="XS",
            overall_score=40.0,
            zone_analyses=[],
            category="top",
        )
        assert result_xs.size_down is None

        result_xxxl = analyzer._compare_sizes(
            current_size="XXXL",
            overall_score=95.0,
            zone_analyses=[],
            category="top",
        )
        assert result_xxxl.size_up is None

    def test_size_order_is_complete(self) -> None:
        """Toutes les tailles standard sont dans SIZE_ORDER."""
        for size in ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]:
            assert size in SIZE_ORDER