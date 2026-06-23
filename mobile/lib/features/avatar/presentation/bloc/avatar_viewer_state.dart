import 'package:equatable/equatable.dart';
import '../../data/models/avatar_model.dart';

enum AvatarViewerStatus { initial, loading, loaded, notFound, error }

class AvatarViewerState extends Equatable {
  final AvatarViewerStatus status;
  final AvatarModel?        avatar;
  final String?             errorMessage;

  const AvatarViewerState({
    this.status       = AvatarViewerStatus.initial,
    this.avatar,
    this.errorMessage,
  });

  AvatarViewerState copyWith({
    AvatarViewerStatus? status,
    AvatarModel?        avatar,
    String?             errorMessage,
    bool                clearError = false,
  }) {
    return AvatarViewerState(
      status:       status ?? this.status,
      avatar:       avatar ?? this.avatar,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, avatar, errorMessage];
}