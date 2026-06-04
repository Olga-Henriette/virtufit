"""
Catalogue des morphotypes prédéfinis VirtuFit.

Chaque morphotype est défini avec des mensurations de référence
pour un adulte de 170 cm. Les mensurations réelles sont ensuite
calculées par mise à l'échelle selon la taille cible.
"""

from app.schemas.avatar import GenderEnum, MeasurementsInput
from app.schemas.morphotype import MorphotypeCode, MorphotypeDefinition

# Définition du catalogue complet

MORPHOTYPE_CATALOGUE: dict[MorphotypeCode, MorphotypeDefinition] = {

    # Morphotypes Masculins

    MorphotypeCode.MALE_ECTOMORPH: MorphotypeDefinition(
        code=MorphotypeCode.MALE_ECTOMORPH,
        label="Ectomorphe",
        description=(
            "Silhouette mince et longiligne. Épaules étroites, "
            "peu de masse musculaire, métabolisme rapide."
        ),
        gender=GenderEnum.MALE,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=58.0,
            chest_cm=84.0,
            waist_cm=72.0,
            hips_cm=85.0,
            shoulder_width_cm=38.0,
            inseam_cm=80.0,
            neck_cm=34.0,
            arm_length_cm=60.0,
            thigh_cm=48.0,
            gender=GenderEnum.MALE,
        ),
        scale_factors={
            "chest_cm":          0.49,
            "waist_cm":          0.42,
            "hips_cm":           0.50,
            "shoulder_width_cm": 0.22,
            "inseam_cm":         0.47,
        },
    ),

    MorphotypeCode.MALE_MESOMORPH: MorphotypeDefinition(
        code=MorphotypeCode.MALE_MESOMORPH,
        label="Mésomorphe",
        description=(
            "Silhouette athlétique et musclée. Épaules larges, "
            "taille fine, bonne définition musculaire naturelle."
        ),
        gender=GenderEnum.MALE,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=74.0,
            chest_cm=98.0,
            waist_cm=80.0,
            hips_cm=95.0,
            shoulder_width_cm=46.0,
            inseam_cm=78.0,
            neck_cm=39.0,
            arm_length_cm=61.0,
            thigh_cm=58.0,
            gender=GenderEnum.MALE,
        ),
        scale_factors={
            "chest_cm":          0.58,
            "waist_cm":          0.47,
            "hips_cm":           0.56,
            "shoulder_width_cm": 0.27,
            "inseam_cm":         0.46,
        },
    ),

    MorphotypeCode.MALE_ENDOMORPH: MorphotypeDefinition(
        code=MorphotypeCode.MALE_ENDOMORPH,
        label="Endomorphe",
        description=(
            "Silhouette ronde et corpulente. Tendance à stocker "
            "les graisses, ossature large, membres courts."
        ),
        gender=GenderEnum.MALE,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=90.0,
            chest_cm=108.0,
            waist_cm=98.0,
            hips_cm=108.0,
            shoulder_width_cm=48.0,
            inseam_cm=74.0,
            neck_cm=43.0,
            arm_length_cm=59.0,
            thigh_cm=68.0,
            gender=GenderEnum.MALE,
        ),
        scale_factors={
            "chest_cm":          0.64,
            "waist_cm":          0.58,
            "hips_cm":           0.64,
            "shoulder_width_cm": 0.28,
            "inseam_cm":         0.44,
        },
    ),

    # Morphotypes Féminins

    MorphotypeCode.FEMALE_HOURGLASS: MorphotypeDefinition(
        code=MorphotypeCode.FEMALE_HOURGLASS,
        label="Sablier",
        description=(
            "Silhouette équilibrée avec poitrine et hanches "
            "proportionnelles et taille bien marquée."
        ),
        gender=GenderEnum.FEMALE,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=62.0,
            chest_cm=90.0,
            waist_cm=68.0,
            hips_cm=92.0,
            shoulder_width_cm=38.0,
            inseam_cm=76.0,
            neck_cm=32.0,
            arm_length_cm=56.0,
            thigh_cm=56.0,
            gender=GenderEnum.FEMALE,
        ),
        scale_factors={
            "chest_cm":          0.53,
            "waist_cm":          0.40,
            "hips_cm":           0.54,
            "shoulder_width_cm": 0.22,
            "inseam_cm":         0.45,
        },
    ),

    MorphotypeCode.FEMALE_PEAR: MorphotypeDefinition(
        code=MorphotypeCode.FEMALE_PEAR,
        label="Poire",
        description=(
            "Hanches plus larges que les épaules. "
            "Volume concentré sur le bas du corps."
        ),
        gender=GenderEnum.FEMALE,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=65.0,
            chest_cm=85.0,
            waist_cm=70.0,
            hips_cm=100.0,
            shoulder_width_cm=36.0,
            inseam_cm=76.0,
            neck_cm=31.0,
            arm_length_cm=56.0,
            thigh_cm=62.0,
            gender=GenderEnum.FEMALE,
        ),
        scale_factors={
            "chest_cm":          0.50,
            "waist_cm":          0.41,
            "hips_cm":           0.59,
            "shoulder_width_cm": 0.21,
            "inseam_cm":         0.45,
        },
    ),

    MorphotypeCode.FEMALE_APPLE: MorphotypeDefinition(
        code=MorphotypeCode.FEMALE_APPLE,
        label="Pomme",
        description=(
            "Volume concentré sur le haut du corps et l'abdomen. "
            "Épaules larges, hanches plus fines."
        ),
        gender=GenderEnum.FEMALE,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=70.0,
            chest_cm=100.0,
            waist_cm=90.0,
            hips_cm=96.0,
            shoulder_width_cm=41.0,
            inseam_cm=74.0,
            neck_cm=33.0,
            arm_length_cm=56.0,
            thigh_cm=58.0,
            gender=GenderEnum.FEMALE,
        ),
        scale_factors={
            "chest_cm":          0.59,
            "waist_cm":          0.53,
            "hips_cm":           0.57,
            "shoulder_width_cm": 0.24,
            "inseam_cm":         0.44,
        },
    ),

    MorphotypeCode.FEMALE_RECTANGLE: MorphotypeDefinition(
        code=MorphotypeCode.FEMALE_RECTANGLE,
        label="Rectangle",
        description=(
            "Silhouette droite avec peu de différence entre "
            "poitrine, taille et hanches."
        ),
        gender=GenderEnum.FEMALE,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=60.0,
            chest_cm=86.0,
            waist_cm=78.0,
            hips_cm=88.0,
            shoulder_width_cm=37.0,
            inseam_cm=76.0,
            neck_cm=31.0,
            arm_length_cm=56.0,
            thigh_cm=52.0,
            gender=GenderEnum.FEMALE,
        ),
        scale_factors={
            "chest_cm":          0.51,
            "waist_cm":          0.46,
            "hips_cm":           0.52,
            "shoulder_width_cm": 0.22,
            "inseam_cm":         0.45,
        },
    ),

    # Morphotypes Neutres

    MorphotypeCode.NEUTRAL_AVERAGE: MorphotypeDefinition(
        code=MorphotypeCode.NEUTRAL_AVERAGE,
        label="Moyen",
        description=(
            "Silhouette standard équilibrée. "
            "Proportions corporelles dans la moyenne."
        ),
        gender=GenderEnum.NEUTRAL,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=66.0,
            chest_cm=90.0,
            waist_cm=76.0,
            hips_cm=92.0,
            shoulder_width_cm=41.0,
            inseam_cm=77.0,
            neck_cm=35.0,
            arm_length_cm=58.0,
            thigh_cm=54.0,
            gender=GenderEnum.NEUTRAL,
        ),
        scale_factors={
            "chest_cm":          0.53,
            "waist_cm":          0.45,
            "hips_cm":           0.54,
            "shoulder_width_cm": 0.24,
            "inseam_cm":         0.45,
        },
    ),

    MorphotypeCode.NEUTRAL_ATHLETIC: MorphotypeDefinition(
        code=MorphotypeCode.NEUTRAL_ATHLETIC,
        label="Athlétique",
        description=(
            "Silhouette sportive avec bonne tonicité musculaire. "
            "Épaules marquées, taille fine, membres longs."
        ),
        gender=GenderEnum.NEUTRAL,
        reference_measurements=MeasurementsInput(
            height_cm=170.0,
            weight_kg=68.0,
            chest_cm=93.0,
            waist_cm=74.0,
            hips_cm=92.0,
            shoulder_width_cm=44.0,
            inseam_cm=80.0,
            neck_cm=36.0,
            arm_length_cm=61.0,
            thigh_cm=57.0,
            gender=GenderEnum.NEUTRAL,
        ),
        scale_factors={
            "chest_cm":          0.55,
            "waist_cm":          0.44,
            "hips_cm":           0.54,
            "shoulder_width_cm": 0.26,
            "inseam_cm":         0.47,
        },
    ),
}