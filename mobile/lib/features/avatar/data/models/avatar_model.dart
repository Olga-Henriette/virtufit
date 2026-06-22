import 'package:equatable/equatable.dart';

class SmplParameters extends Equatable {
  final List<double> betas;
  final List<double> thetas;

  const SmplParameters({required this.betas, required this.thetas});

  factory SmplParameters.fromJson(Map<String, dynamic> json) {
    return SmplParameters(
      betas:  (json['betas']  as List).map((e) => (e as num).toDouble()).toList(),
      thetas: (json['thetas'] as List).map((e) => (e as num).toDouble()).toList(),
    );
  }

  @override
  List<Object?> get props => [betas, thetas];
}

class AvatarMesh extends Equatable {
  final int    verticesCount;
  final int    facesCount;
  final String meshFormat;
  final String meshReference;

  const AvatarMesh({
    required this.verticesCount,
    required this.facesCount,
    required this.meshFormat,
    required this.meshReference,
  });

  factory AvatarMesh.fromJson(Map<String, dynamic> json) {
    return AvatarMesh(
      verticesCount: json['verticesCount'] as int,
      facesCount:    json['facesCount']    as int,
      meshFormat:    json['meshFormat']    as String,
      meshReference: json['meshReference'] as String,
    );
  }

  @override
  List<Object?> get props => [meshReference];
}

class AvatarModel extends Equatable {
  final String          avatarId;
  final String          userId;
  final SmplParameters  smplParameters;
  final AvatarMesh       mesh;
  final double          bmi;
  final String          gender;
  final double          heightCm;
  final double          weightKg;
  final double          generationTimeMs;
  final bool            isActive;
  final DateTime?       createdAt;

  const AvatarModel({
    required this.avatarId,
    required this.userId,
    required this.smplParameters,
    required this.mesh,
    required this.bmi,
    required this.gender,
    required this.heightCm,
    required this.weightKg,
    required this.generationTimeMs,
    required this.isActive,
    this.createdAt,
  });

  factory AvatarModel.fromJson(Map<String, dynamic> json) {
    return AvatarModel(
      avatarId:        json['avatarId'] as String,
      userId:          json['userId']   as String,
      smplParameters:  SmplParameters.fromJson(
        json['smplParameters'] as Map<String, dynamic>,
      ),
      mesh:            AvatarMesh.fromJson(json['mesh'] as Map<String, dynamic>),
      bmi:             (json['bmi'] as num).toDouble(),
      gender:          json['gender'] as String,
      heightCm:        (json['heightCm'] as num).toDouble(),
      weightKg:        (json['weightKg'] as num).toDouble(),
      generationTimeMs: (json['generationTimeMs'] as num).toDouble(),
      isActive:        json['isActive'] as bool,
      createdAt:       json['createdAt'] != null
        ? DateTime.parse(json['createdAt'] as String)
        : null,
    );
  }

  String get bmiCategory {
    if (bmi < 18.5) return 'Maigreur';
    if (bmi < 25.0) return 'Normal';
    if (bmi < 30.0) return 'Surpoids';
    return 'Obésité';
  }

  @override
  List<Object?> get props => [avatarId, userId, isActive];
}