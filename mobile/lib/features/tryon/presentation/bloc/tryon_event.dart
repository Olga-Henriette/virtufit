import 'package:equatable/equatable.dart';
import '../../data/models/tryon_model.dart';

abstract class TryOnEvent extends Equatable {
  const TryOnEvent();
  @override
  List<Object?> get props => [];
}

class TryOnAnimationSelected extends TryOnEvent {
  final TryOnAnimationType animationType;
  const TryOnAnimationSelected(this.animationType);
  @override
  List<Object?> get props => [animationType];
}

class TryOnStartRequested extends TryOnEvent {
  final String userId;
  final String avatarId;
  final String clothingId;

  const TryOnStartRequested({
    required this.userId,
    required this.avatarId,
    required this.clothingId,
  });

  @override
  List<Object?> get props => [userId, avatarId, clothingId];
}