import 'package:equatable/equatable.dart';

class VendorCatalogueStats extends Equatable {
  final String vendorId;
  final int    totalClothingItems;
  final int    digitizedItems;
  final int    totalTryOns;
  final double avgFitScoreAcrossCatalogue;
  final double overallSatisfactionRate;

  const VendorCatalogueStats({
    required this.vendorId,
    required this.totalClothingItems,
    required this.digitizedItems,
    required this.totalTryOns,
    required this.avgFitScoreAcrossCatalogue,
    required this.overallSatisfactionRate,
  });

  factory VendorCatalogueStats.fromJson(Map<String, dynamic> json) {
    return VendorCatalogueStats(
      vendorId:           json['vendorId'] as String,
      totalClothingItems: json['totalClothingItems'] as int,
      digitizedItems:     json['digitizedItems'] as int,
      totalTryOns:        json['totalTryOns'] as int,
      avgFitScoreAcrossCatalogue:
          (json['avgFitScoreAcrossCatalogue'] as num).toDouble(),
      overallSatisfactionRate:
          (json['overallSatisfactionRate'] as num).toDouble(),
    );
  }

  @override
  List<Object?> get props => [vendorId, totalClothingItems];
}

class ClothingPerformance extends Equatable {
  final String clothingId;
  final String name;
  final String category;
  final int    totalTryOns;
  final double avgFitScore;
  final double satisfactionRate;
  final String? recommendedSizeAdjustment;

  const ClothingPerformance({
    required this.clothingId,
    required this.name,
    required this.category,
    required this.totalTryOns,
    required this.avgFitScore,
    required this.satisfactionRate,
    this.recommendedSizeAdjustment,
  });

  factory ClothingPerformance.fromJson(Map<String, dynamic> json) {
    return ClothingPerformance(
      clothingId:       json['clothingId'] as String,
      name:             json['name'] as String,
      category:         json['category'] as String,
      totalTryOns:      json['totalTryOns'] as int,
      avgFitScore:      (json['avgFitScore'] as num).toDouble(),
      satisfactionRate: (json['satisfactionRate'] as num).toDouble(),
      recommendedSizeAdjustment: json['recommendedSizeAdjustment'] as String?,
    );
  }

  @override
  List<Object?> get props => [clothingId, avgFitScore];
}

class TensionHotspot extends Equatable {
  final String zoneName;
  final int    affectedItems;
  final double percentageAffected;
  final String severityLevel;

  const TensionHotspot({
    required this.zoneName,
    required this.affectedItems,
    required this.percentageAffected,
    required this.severityLevel,
  });

  factory TensionHotspot.fromJson(Map<String, dynamic> json) {
    return TensionHotspot(
      zoneName:          json['zoneName'] as String,
      affectedItems:     json['affectedItems'] as int,
      percentageAffected: (json['percentageAffected'] as num).toDouble(),
      severityLevel:     json['severityLevel'] as String,
    );
  }

  @override
  List<Object?> get props => [zoneName];
}

class VendorDashboardModel extends Equatable {
  final VendorCatalogueStats        catalogueStats;
  final List<ClothingPerformance>   topPerformers;
  final List<ClothingPerformance>   needsAttention;
  final List<TensionHotspot>        tensionHotspots;
  final List<String>                recommendations;
  final DateTime                    generatedAt;

  const VendorDashboardModel({
    required this.catalogueStats,
    required this.topPerformers,
    required this.needsAttention,
    required this.tensionHotspots,
    required this.recommendations,
    required this.generatedAt,
  });

  factory VendorDashboardModel.fromJson(Map<String, dynamic> json) {
    return VendorDashboardModel(
      catalogueStats: VendorCatalogueStats.fromJson(
        json['catalogueStats'] as Map<String, dynamic>,
      ),
      topPerformers: (json['topPerformers'] as List<dynamic>)
          .map((e) => ClothingPerformance.fromJson(e as Map<String, dynamic>))
          .toList(),
      needsAttention: (json['needsAttention'] as List<dynamic>)
          .map((e) => ClothingPerformance.fromJson(e as Map<String, dynamic>))
          .toList(),
      tensionHotspots: (json['tensionHotspots'] as List<dynamic>)
          .map((e) => TensionHotspot.fromJson(e as Map<String, dynamic>))
          .toList(),
      recommendations: (json['recommendations'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      generatedAt: DateTime.parse(json['generatedAt'] as String),
    );
  }

  @override
  List<Object?> get props => [catalogueStats];
}