"""Tests de validation des schémas Pydantic des mensurations."""

import pytest
from pydantic import ValidationError
from app.schemas.avatar import MeasurementsInput, GenderEnum


class TestMeasurementsInputSchema:

    def test_valid_full_measurements(self) -> None:
        """Un jeu complet de mensurations valides doit passer."""
        m = MeasurementsInput(
            height_cm=175.5,
            weight_kg=70.0,
            chest_cm=95.0,
            waist_cm=80.0,
            hips_cm=98.0,
            shoulder_width_cm=45.0,
            inseam_cm=80.0,
            neck_cm=38.0,
            arm_length_cm=62.0,
            thigh_cm=58.0,
            gender=GenderEnum.NEUTRAL,
        )
        assert m.height_cm == 175.5
        assert m.gender    == GenderEnum.NEUTRAL

    def test_optional_fields_default_to_none(self) -> None:
        """Les champs optionnels doivent être None par défaut."""
        m = MeasurementsInput(
            height_cm=175.0,
            weight_kg=70.0,
            chest_cm=95.0,
            waist_cm=80.0,
            hips_cm=98.0,
            shoulder_width_cm=45.0,
        )
        assert m.inseam_cm     is None
        assert m.neck_cm       is None
        assert m.arm_length_cm is None
        assert m.thigh_cm      is None

    def test_height_below_minimum_raises(self) -> None:
        """Une taille < 50 doit lever ValidationError."""
        with pytest.raises(ValidationError):
            MeasurementsInput(
                height_cm=30.0,  # < 50
                weight_kg=70.0,
                chest_cm=95.0,
                waist_cm=80.0,
                hips_cm=98.0,
                shoulder_width_cm=45.0,
            )

    def test_height_above_maximum_raises(self) -> None:
        """Une taille > 250 doit lever ValidationError."""
        with pytest.raises(ValidationError):
            MeasurementsInput(
                height_cm=300.0,  # > 250
                weight_kg=70.0,
                chest_cm=95.0,
                waist_cm=80.0,
                hips_cm=98.0,
                shoulder_width_cm=45.0,
            )

    def test_boundary_values_accepted(self) -> None:
        """Les valeurs aux limites exactes doivent être acceptées."""
        m = MeasurementsInput(
            height_cm=50.0,   # min
            weight_kg=20.0,   # min
            chest_cm=40.0,
            waist_cm=40.0,
            hips_cm=40.0,
            shoulder_width_cm=20.0,
        )
        assert m.height_cm == 50.0

    def test_gender_defaults_to_neutral(self) -> None:
        """Le genre doit être NEUTRAL par défaut."""
        m = MeasurementsInput(
            height_cm=175.0,
            weight_kg=70.0,
            chest_cm=95.0,
            waist_cm=80.0,
            hips_cm=98.0,
            shoulder_width_cm=45.0,
        )
        assert m.gender == GenderEnum.NEUTRAL

    def test_invalid_gender_raises(self) -> None:
        """Un genre invalide doit lever ValidationError."""
        with pytest.raises(ValidationError):
            MeasurementsInput(
                height_cm=175.0,
                weight_kg=70.0,
                chest_cm=95.0,
                waist_cm=80.0,
                hips_cm=98.0,
                shoulder_width_cm=45.0,
                gender="invalid_gender",  # type: ignore
            )