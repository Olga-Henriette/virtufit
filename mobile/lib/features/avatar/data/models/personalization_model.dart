import 'package:equatable/equatable.dart';

class PersonalizationModel extends Equatable {
  final String avatarId;
  final String userId;
  final String photoReference;
  final String skinTone;
  final String hairColor;
  final List<int> skinRgb;
  final List<int> hairRgb;
  final double confidenceScore;
  final DateTime updatedAt;

  const PersonalizationModel({
    required this.avatarId,
    required this.userId,
    required this.photoReference,
    required this.skinTone,
    required this.hairColor,
    required this.skinRgb,
    required this.hairRgb,
    required this.confidenceScore,
    required this.updatedAt,
  });

  factory PersonalizationModel.fromJson(Map<String, dynamic> json) {
    return PersonalizationModel(
      avatarId:        json['avatarId'] as String,
      userId:          json['userId']   as String,
      photoReference:  json['photoReference'] as String,
      skinTone:        json['skinTone'] as String,
      hairColor:       json['hairColor'] as String,
      skinRgb: (json['skinRgb'] as List<dynamic>? ?? [])
          .map((e) => (e as num).toInt())
          .toList(),
      hairRgb: (json['hairRgb'] as List<dynamic>? ?? [])
          .map((e) => (e as num).toInt())
          .toList(),
      confidenceScore: (json['confidenceScore'] as num).toDouble(),
      updatedAt:       DateTime.parse(json['updatedAt'] as String),
    );
  }

  @override
  List<Object?> get props => [avatarId, skinTone, hairColor];
}