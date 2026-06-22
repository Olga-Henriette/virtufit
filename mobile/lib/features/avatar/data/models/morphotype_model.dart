import 'package:equatable/equatable.dart';

enum MorphotypeGender { male, female, neutral }

enum MorphotypeCode {
  maleEctomorph,
  maleMesomorph,
  maleEndomorph,
  femaleHourglass,
  femalePear,
  femaleApple,
  femaleRectangle,
  neutralAverage,
  neutralAthletic,
}

extension MorphotypeCodeX on MorphotypeCode {
  String get apiValue {
    switch (this) {
      case MorphotypeCode.maleEctomorph:   return 'male_ectomorph';
      case MorphotypeCode.maleMesomorph:   return 'male_mesomorph';
      case MorphotypeCode.maleEndomorph:   return 'male_endomorph';
      case MorphotypeCode.femaleHourglass: return 'female_hourglass';
      case MorphotypeCode.femalePear:      return 'female_pear';
      case MorphotypeCode.femaleApple:     return 'female_apple';
      case MorphotypeCode.femaleRectangle: return 'female_rectangle';
      case MorphotypeCode.neutralAverage:  return 'neutral_average';
      case MorphotypeCode.neutralAthletic: return 'neutral_athletic';
    }
  }
}

class MorphotypeOption extends Equatable {
  final MorphotypeCode    code;
  final String            label;
  final String            description;
  final MorphotypeGender  gender;

  const MorphotypeOption({
    required this.code,
    required this.label,
    required this.description,
    required this.gender,
  });

  @override
  List<Object?> get props => [code];
}

/// Catalogue statique — miroir exact de morphotype_catalogue.py
const List<MorphotypeOption> morphotypeCatalogue = [
  MorphotypeOption(
    code:        MorphotypeCode.maleEctomorph,
    label:       'Ectomorphe',
    description: 'Silhouette mince et longiligne. Épaules étroites, '
                  'peu de masse musculaire, métabolisme rapide.',
    gender: MorphotypeGender.male,
  ),
  MorphotypeOption(
    code:        MorphotypeCode.maleMesomorph,
    label:       'Mésomorphe',
    description: 'Silhouette athlétique et musclée. Épaules larges, '
                  'taille fine, bonne définition musculaire naturelle.',
    gender: MorphotypeGender.male,
  ),
  MorphotypeOption(
    code:        MorphotypeCode.maleEndomorph,
    label:       'Endomorphe',
    description: 'Silhouette ronde et corpulente. Tendance à stocker '
                  'les graisses, ossature large, membres courts.',
    gender: MorphotypeGender.male,
  ),
  MorphotypeOption(
    code:        MorphotypeCode.femaleHourglass,
    label:       'Sablier',
    description: 'Silhouette équilibrée avec poitrine et hanches '
                  'proportionnelles et taille bien marquée.',
    gender: MorphotypeGender.female,
  ),
  MorphotypeOption(
    code:        MorphotypeCode.femalePear,
    label:       'Poire',
    description: 'Hanches plus larges que les épaules. '
                  'Volume concentré sur le bas du corps.',
    gender: MorphotypeGender.female,
  ),
  MorphotypeOption(
    code:        MorphotypeCode.femaleApple,
    label:       'Pomme',
    description: 'Volume concentré sur le haut du corps et l\'abdomen. '
                  'Épaules larges, hanches plus fines.',
    gender: MorphotypeGender.female,
  ),
  MorphotypeOption(
    code:        MorphotypeCode.femaleRectangle,
    label:       'Rectangle',
    description: 'Silhouette droite avec peu de différence entre '
                  'poitrine, taille et hanches.',
    gender: MorphotypeGender.female,
  ),
  MorphotypeOption(
    code:        MorphotypeCode.neutralAverage,
    label:       'Moyen',
    description: 'Silhouette standard équilibrée. '
                  'Proportions corporelles dans la moyenne.',
    gender: MorphotypeGender.neutral,
  ),
  MorphotypeOption(
    code:        MorphotypeCode.neutralAthletic,
    label:       'Athlétique',
    description: 'Silhouette sportive avec bonne tonicité musculaire. '
                  'Épaules marquées, taille fine, membres longs.',
    gender: MorphotypeGender.neutral,
  ),
];