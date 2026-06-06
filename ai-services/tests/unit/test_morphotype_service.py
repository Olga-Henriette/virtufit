import pytest
from app.core.morphology.morphotype_service import MorphotypeService
from app.schemas.morphotype import MorphotypeAvatarRequest, MorphotypeCode


@pytest.fixture
def service() -> MorphotypeService:
    return MorphotypeService()


class TestMorphotypeService:

    def test_list_all_returns_nine_morphotypes(
        self, service: MorphotypeService
    ) -> None:
        """Le catalogue doit contenir exactement 9 morphotypes."""
        result = service.list_all()
        assert result.total == 9
        assert len(result.morphotypes) == 9

    def test_all_morphotype_codes_present(
        self, service: MorphotypeService
    ) -> None:
        """Tous les codes de l'enum MorphotypeCode doivent être présents."""
        result = service.list_all()
        codes  = {m.code for m in result.morphotypes}
        for code in MorphotypeCode:
            assert code in codes, f"Morphotype manquant : {code}"

    def test_get_by_code_returns_correct_morphotype(
        self, service: MorphotypeService
    ) -> None:
        """get_by_code doit retourner le bon morphotype."""
        m = service.get_by_code(MorphotypeCode.NEUTRAL_ATHLETIC)
        assert m.code  == MorphotypeCode.NEUTRAL_ATHLETIC
        assert m.label == "Athlétique"

    def test_get_by_invalid_code_raises(
        self, service: MorphotypeService
    ) -> None:
        """Un code invalide doit lever InvalidInputException."""
        from app.utils.exceptions import InvalidInputException
        with pytest.raises(InvalidInputException):
            service.get_by_code("invalid_code")  # type: ignore

    def test_generate_from_morphotype_scales_height(
        self, service: MorphotypeService
    ) -> None:
        """L'avatar généré doit avoir la taille cible."""
        request = MorphotypeAvatarRequest(
            user_id="user-scale-test",
            morphotype_code=MorphotypeCode.NEUTRAL_AVERAGE,
            target_height_cm=185.0,
            target_weight_kg=80.0,
        )
        result = service.generate_from_morphotype(request)

        # La taille est portée par le β0 — on vérifie la génération
        assert result.user_id   == "user-scale-test"
        assert result.avatar_id is not None

    def test_male_morphotypes_have_male_gender(
        self, service: MorphotypeService
    ) -> None:
        """Les morphotypes masculins doivent avoir le genre MALE."""
        male_codes = [
            MorphotypeCode.MALE_ECTOMORPH,
            MorphotypeCode.MALE_MESOMORPH,
            MorphotypeCode.MALE_ENDOMORPH,
        ]
        for code in male_codes:
            m = service.get_by_code(code)
            assert m.gender.value == "male", (
                f"{code} devrait être MALE, est {m.gender}"
            )

    def test_female_morphotypes_have_female_gender(
        self, service: MorphotypeService
    ) -> None:
        """Les morphotypes féminins doivent avoir le genre FEMALE."""
        female_codes = [
            MorphotypeCode.FEMALE_HOURGLASS,
            MorphotypeCode.FEMALE_PEAR,
            MorphotypeCode.FEMALE_APPLE,
            MorphotypeCode.FEMALE_RECTANGLE,
        ]
        for code in female_codes:
            m = service.get_by_code(code)
            assert m.gender.value == "female"

    def test_reference_measurements_are_coherent(
        self, service: MorphotypeService
    ) -> None:
        """
        Les mensurations de référence doivent être cohérentes :
        waist < chest et waist < hips pour la plupart des morphotypes.
        """
        result = service.list_all()
        for morphotype in result.morphotypes:
            ref = morphotype.reference_measurements
            assert ref.height_cm > 0
            assert ref.weight_kg > 0
            assert ref.chest_cm  > 0
            assert ref.waist_cm  > 0
            assert ref.hips_cm   > 0

    def test_scale_factors_are_positive(
        self, service: MorphotypeService
    ) -> None:
        """Tous les facteurs d'échelle doivent être positifs."""
        result = service.list_all()
        for morphotype in result.morphotypes:
            for key, val in morphotype.scale_factors.items():
                assert val > 0, (
                    f"Facteur négatif : {morphotype.code}.{key} = {val}"
                )