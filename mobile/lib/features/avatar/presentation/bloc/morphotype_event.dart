import 'package:equatable/equatable.dart';
import '../../data/models/morphotype_model.dart';

abstract class MorphotypeEvent extends Equatable {
  const MorphotypeEvent();
  @override
  List<Object?> get props => [];
}

class MorphotypeSelected extends MorphotypeEvent {
  final MorphotypeCode code;
  const MorphotypeSelected(this.code);
  @override
  List<Object?> get props => [code];
}

class MorphotypeGenerateRequested extends MorphotypeEvent {
  final String userId;
  final double targetHeightCm;
  final double targetWeightKg;

  const MorphotypeGenerateRequested({
    required this.userId,
    required this.targetHeightCm,
    required this.targetWeightKg,
  });

  @override
  List<Object?> get props => [userId, targetHeightCm, targetWeightKg];
}