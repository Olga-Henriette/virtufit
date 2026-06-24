import 'package:equatable/equatable.dart';

enum TryOnAnimationType { standing, walking, rotating }

extension TryOnAnimationTypeX on TryOnAnimationType {
  String get apiValue => name;

  String get label {
    switch (this) {
      case TryOnAnimationType.standing: return 'Debout';
      case TryOnAnimationType.walking:  return 'En marche';
      case TryOnAnimationType.rotating: return 'Rotation 360°';
    }
  }

  String get description {
    switch (this) {
      case TryOnAnimationType.standing: return 'Vue statique simple';
      case TryOnAnimationType.walking:  return 'Évalue le confort en mouvement';
      case TryOnAnimationType.rotating: return 'Vue complète à 360 degrés';
    }
  }
}

class TensionZoneModel extends Equatable {
  final String  zoneName;
  final String  tensionLevel;
  final double  tensionValue;
  final String? recommendation;

  const TensionZoneModel({
    required this.zoneName,
    required this.tensionLevel,
    required this.tensionValue,
    this.recommendation,
  });

  factory TensionZoneModel.fromJson(Map<String, dynamic> json) {
    return TensionZoneModel(
      zoneName:       json['zoneName']     as String,
      tensionLevel:   json['tensionLevel'] as String,
      tensionValue:   (json['tensionValue'] as num).toDouble(),
      recommendation: json['recommendation'] as String?,
    );
  }

  @override
  List<Object?> get props => [zoneName, tensionLevel];
}

class FitAnalysisModel extends Equatable {
  final String              overallFit;
  final double              fitScore;
  final List<TensionZoneModel> tensionZones;
  final List<String>        recommendations;
  final String?             sizeSuggestion;

  const FitAnalysisModel({
    required this.overallFit,
    required this.fitScore,
    required this.tensionZones,
    required this.recommendations,
    this.sizeSuggestion,
  });

  factory FitAnalysisModel.fromJson(Map<String, dynamic> json) {
    return FitAnalysisModel(
      overallFit: json['overallFit'] as String,
      fitScore:   (json['fitScore'] as num).toDouble(),
      tensionZones: (json['tensionZones'] as List<dynamic>)
          .map((e) => TensionZoneModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      recommendations: (json['recommendations'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      sizeSuggestion: json['sizeSuggestion'] as String?,
    );
  }

  @override
  List<Object?> get props => [overallFit, fitScore];
}

class TryOnSessionModel extends Equatable {
  final String          sessionId;
  final String          userId;
  final String          clothingId;
  final String          avatarId;
  final String          status;
  final String          animationType;
  final FitAnalysisModel fitAnalysis;
  final int             frameCount;
  final double          simulationMs;
  final DateTime        createdAt;
  final DateTime        completedAt;

  const TryOnSessionModel({
    required this.sessionId,
    required this.userId,
    required this.clothingId,
    required this.avatarId,
    required this.status,
    required this.animationType,
    required this.fitAnalysis,
    required this.frameCount,
    required this.simulationMs,
    required this.createdAt,
    required this.completedAt,
  });

  factory TryOnSessionModel.fromJson(Map<String, dynamic> json) {
    return TryOnSessionModel(
      sessionId:     json['sessionId']   as String,
      userId:        json['userId']      as String,
      clothingId:    json['clothingId']  as String,
      avatarId:      json['avatarId']    as String,
      status:        json['status']      as String,
      animationType: json['animationType'] as String,
      fitAnalysis:   FitAnalysisModel.fromJson(
        json['fitAnalysis'] as Map<String, dynamic>,
      ),
      frameCount:    json['frameCount'] as int,
      simulationMs:  (json['simulationMs'] as num).toDouble(),
      createdAt:     DateTime.parse(json['createdAt'] as String),
      completedAt:   DateTime.parse(json['completedAt'] as String),
    );
  }

  @override
  List<Object?> get props => [sessionId, status];
}