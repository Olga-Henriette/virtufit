import 'package:equatable/equatable.dart';

class ZoneAnalysisModel extends Equatable {
  final String  zone;
  final double  tensionValue;
  final String  tensionLevel;
  final double  fitDeltaCm;
  final bool    isConstraining;
  final String? recommendation;

  const ZoneAnalysisModel({
    required this.zone,
    required this.tensionValue,
    required this.tensionLevel,
    required this.fitDeltaCm,
    required this.isConstraining,
    this.recommendation,
  });

  factory ZoneAnalysisModel.fromJson(Map<String, dynamic> json) {
    return ZoneAnalysisModel(
      zone:           json['zone'] as String,
      tensionValue:   (json['tensionValue'] as num).toDouble(),
      tensionLevel:   json['tensionLevel'] as String,
      fitDeltaCm:     (json['fitDeltaCm'] as num).toDouble(),
      isConstraining: json['isConstraining'] as bool,
      recommendation: json['recommendation'] as String?,
    );
  }

  @override
  List<Object?> get props => [zone, tensionLevel];
}

class SizeComparisonModel extends Equatable {
  final String  currentSize;
  final String? suggestedSize;
  final String? sizeDown;
  final String? sizeUp;
  final double  confidence;

  const SizeComparisonModel({
    required this.currentSize,
    this.suggestedSize,
    this.sizeDown,
    this.sizeUp,
    required this.confidence,
  });

  factory SizeComparisonModel.fromJson(Map<String, dynamic> json) {
    return SizeComparisonModel(
      currentSize:   json['currentSize'] as String,
      suggestedSize: json['suggestedSize'] as String?,
      sizeDown:      json['sizeDown'] as String?,
      sizeUp:        json['sizeUp'] as String?,
      confidence:    (json['confidence'] as num).toDouble(),
    );
  }

  @override
  List<Object?> get props => [currentSize, suggestedSize];
}

class FitReportModel extends Equatable {
  final String                  sessionId;
  final String                  userId;
  final String                  clothingId;
  final double                  overallScore;
  final String                  fitCategory;
  final double                  comfortScore;
  final double                  mobilityScore;
  final List<ZoneAnalysisModel> zoneAnalyses;
  final SizeComparisonModel     sizeComparison;
  final String                  summary;
  final List<String>            recommendations;
  final List<String>            styleTips;
  final String                  fabricType;
  final double                  simulationMs;
  final DateTime                analyzedAt;

  const FitReportModel({
    required this.sessionId,
    required this.userId,
    required this.clothingId,
    required this.overallScore,
    required this.fitCategory,
    required this.comfortScore,
    required this.mobilityScore,
    required this.zoneAnalyses,
    required this.sizeComparison,
    required this.summary,
    required this.recommendations,
    required this.styleTips,
    required this.fabricType,
    required this.simulationMs,
    required this.analyzedAt,
  });

  factory FitReportModel.fromJson(Map<String, dynamic> json) {
    return FitReportModel(
      sessionId:    json['sessionId']    as String,
      userId:       json['userId']       as String,
      clothingId:   json['clothingId']   as String,
      overallScore: (json['overallScore'] as num).toDouble(),
      fitCategory:  json['fitCategory']  as String,
      comfortScore: (json['comfortScore'] as num).toDouble(),
      mobilityScore: (json['mobilityScore'] as num).toDouble(),
      zoneAnalyses: (json['zoneAnalyses'] as List<dynamic>)
          .map((e) => ZoneAnalysisModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      sizeComparison: SizeComparisonModel.fromJson(
        json['sizeComparison'] as Map<String, dynamic>,
      ),
      summary:         json['summary'] as String,
      recommendations: (json['recommendations'] as List<dynamic>)
          .map((e) => e as String).toList(),
      styleTips: (json['styleTips'] as List<dynamic>)
          .map((e) => e as String).toList(),
      fabricType:   json['fabricType'] as String,
      simulationMs: (json['simulationMs'] as num).toDouble(),
      analyzedAt:   DateTime.parse(json['analyzedAt'] as String),
    );
  }

  @override
  List<Object?> get props => [sessionId, overallScore];
}