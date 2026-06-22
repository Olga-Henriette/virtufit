import 'package:equatable/equatable.dart';

enum Gender { male, female, neutral }

class MeasurementModel extends Equatable {
  final String? id;
  final String  userId;
  final double  heightCm;
  final double  weightKg;
  final double  chestCm;
  final double  waistCm;
  final double  hipsCm;
  final double  shoulderWidthCm;
  final double? inseamCm;
  final double? neckCm;
  final double? armLengthCm;
  final double? thighCm;
  final Gender  gender;
  final bool    isActive;
  final DateTime? createdAt;

  const MeasurementModel({
    this.id,
    required this.userId,
    required this.heightCm,
    required this.weightKg,
    required this.chestCm,
    required this.waistCm,
    required this.hipsCm,
    required this.shoulderWidthCm,
    this.inseamCm,
    this.neckCm,
    this.armLengthCm,
    this.thighCm,
    this.gender = Gender.neutral,
    this.isActive = true,
    this.createdAt,
  });

  double get bmi => weightKg / ((heightCm / 100) * (heightCm / 100));

  Map<String, dynamic> toJson() {
    return {
      'heightCm':        heightCm,
      'weightKg':        weightKg,
      'chestCm':         chestCm,
      'waistCm':         waistCm,
      'hipsCm':          hipsCm,
      'shoulderWidthCm': shoulderWidthCm,
      if (inseamCm    != null) 'inseamCm':    inseamCm,
      if (neckCm      != null) 'neckCm':      neckCm,
      if (armLengthCm != null) 'armLengthCm': armLengthCm,
      if (thighCm     != null) 'thighCm':     thighCm,
    };
  }

  factory MeasurementModel.fromJson(Map<String, dynamic> json) {
    return MeasurementModel(
      id:              json['id'] as String?,
      userId:          json['userId'] as String,
      heightCm:        (json['heightCm'] as num).toDouble(),
      weightKg:        (json['weightKg'] as num).toDouble(),
      chestCm:         (json['chestCm'] as num).toDouble(),
      waistCm:         (json['waistCm'] as num).toDouble(),
      hipsCm:          (json['hipsCm'] as num).toDouble(),
      shoulderWidthCm: (json['shoulderWidthCm'] as num).toDouble(),
      inseamCm:        (json['inseamCm']    as num?)?.toDouble(),
      neckCm:          (json['neckCm']      as num?)?.toDouble(),
      armLengthCm:     (json['armLengthCm'] as num?)?.toDouble(),
      thighCm:         (json['thighCm']     as num?)?.toDouble(),
      gender: Gender.values.firstWhere(
        (g) => g.name == (json['gender'] as String? ?? 'neutral'),
        orElse: () => Gender.neutral,
      ),
      isActive:  json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null
        ? DateTime.parse(json['createdAt'] as String)
        : null,
    );
  }

  MeasurementModel copyWith({
    double? heightCm,
    double? weightKg,
    double? chestCm,
    double? waistCm,
    double? hipsCm,
    double? shoulderWidthCm,
    double? inseamCm,
    double? neckCm,
    double? armLengthCm,
    double? thighCm,
    Gender? gender,
  }) {
    return MeasurementModel(
      id:              id,
      userId:          userId,
      heightCm:        heightCm        ?? this.heightCm,
      weightKg:        weightKg        ?? this.weightKg,
      chestCm:         chestCm         ?? this.chestCm,
      waistCm:         waistCm         ?? this.waistCm,
      hipsCm:          hipsCm          ?? this.hipsCm,
      shoulderWidthCm: shoulderWidthCm ?? this.shoulderWidthCm,
      inseamCm:        inseamCm        ?? this.inseamCm,
      neckCm:          neckCm          ?? this.neckCm,
      armLengthCm:     armLengthCm     ?? this.armLengthCm,
      thighCm:         thighCm         ?? this.thighCm,
      gender:          gender          ?? this.gender,
      isActive:        isActive,
      createdAt:       createdAt,
    );
  }

  @override
  List<Object?> get props => [id, userId, heightCm, weightKg, isActive];
}