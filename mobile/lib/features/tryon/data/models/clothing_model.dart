import 'package:equatable/equatable.dart';

class ColorInfo extends Equatable {
  final List<int> dominantRgb;
  final List<List<int>> palette;
  final bool isPatterned;
  final String? patternType;

  const ColorInfo({
    required this.dominantRgb,
    required this.palette,
    required this.isPatterned,
    this.patternType,
  });

  factory ColorInfo.fromJson(Map<String, dynamic> json) {
    return ColorInfo(
      dominantRgb: (json['dominantRgb'] as List<dynamic>)
          .map((e) => (e as num).toInt())
          .toList(),
      palette: (json['palette'] as List<dynamic>)
          .map((row) => (row as List<dynamic>)
              .map((e) => (e as num).toInt())
              .toList())
          .toList(),
      isPatterned: json['isPatterned'] as bool,
      patternType: json['patternType'] as String?,
    );
  }

  @override
  List<Object?> get props => [dominantRgb, isPatterned];
}

class ClothingModel extends Equatable {
  final String     clothingId;
  final String     vendorId;
  final String     name;
  final String     category;
  final String     fabricType;
  final String     estimatedSize;
  final ColorInfo  colorInfo;
  final double     elasticityCoeff;
  final double     frictionCoeff;
  final String?    meshReference;
  final String?    textureReference;
  final bool       isDigitized;
  final DateTime   createdAt;

  const ClothingModel({
    required this.clothingId,
    required this.vendorId,
    required this.name,
    required this.category,
    required this.fabricType,
    required this.estimatedSize,
    required this.colorInfo,
    required this.elasticityCoeff,
    required this.frictionCoeff,
    this.meshReference,
    this.textureReference,
    required this.isDigitized,
    required this.createdAt,
  });

  factory ClothingModel.fromJson(Map<String, dynamic> json) {
    return ClothingModel(
      clothingId:       json['clothingId'] as String,
      vendorId:         json['vendorId']   as String,
      name:             json['name']       as String,
      category:         json['category']   as String,
      fabricType:       json['fabricType'] as String,
      estimatedSize:    json['estimatedSize'] as String,
      colorInfo:        ColorInfo.fromJson(json['colorInfo'] as Map<String, dynamic>),
      elasticityCoeff:  (json['elasticityCoeff'] as num).toDouble(),
      frictionCoeff:    (json['frictionCoeff']   as num).toDouble(),
      meshReference:    json['meshReference']    as String?,
      textureReference: json['textureReference'] as String?,
      isDigitized:      json['isDigitized'] as bool,
      createdAt:        DateTime.parse(json['createdAt'] as String),
    );
  }

  @override
  List<Object?> get props => [clothingId, name, isDigitized];
}

enum ClothingCategory { top, bottom, dress, outerwear, underwear }

extension ClothingCategoryX on ClothingCategory {
  String get apiValue => name;

  String get label {
    switch (this) {
      case ClothingCategory.top:        return 'Hauts';
      case ClothingCategory.bottom:     return 'Bas';
      case ClothingCategory.dress:      return 'Robes';
      case ClothingCategory.outerwear:  return 'Vestes';
      case ClothingCategory.underwear:  return 'Sous-vêtements';
    }
  }
}