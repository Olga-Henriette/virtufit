import 'package:equatable/equatable.dart';
import '../../data/models/tryon_model.dart';

enum TryOnStatus { idle, starting, success, error }

class TryOnState extends Equatable {
  final TryOnStatus        status;
  final TryOnAnimationType selectedAnimation;
  final TryOnSessionModel? session;
  final String?            errorMessage;

  const TryOnState({
    this.status            = TryOnStatus.idle,
    this.selectedAnimation = TryOnAnimationType.standing,
    this.session,
    this.errorMessage,
  });

  TryOnState copyWith({
    TryOnStatus?        status,
    TryOnAnimationType?  selectedAnimation,
    TryOnSessionModel?   session,
    String?              errorMessage,
    bool                 clearError = false,
  }) {
    return TryOnState(
      status:            status            ?? this.status,
      selectedAnimation: selectedAnimation ?? this.selectedAnimation,
      session:           session           ?? this.session,
      errorMessage:      clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, selectedAnimation, session, errorMessage];
}