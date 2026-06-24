import 'package:equatable/equatable.dart';
import '../../data/models/tryon_model.dart';

enum TryOnHistoryStatus { loading, loaded, empty, error }

class TryOnHistoryState extends Equatable {
  final TryOnHistoryStatus       status;
  final List<TryOnSessionModel>  sessions;
  final String?                  errorMessage;

  const TryOnHistoryState({
    this.status       = TryOnHistoryStatus.loading,
    this.sessions      = const [],
    this.errorMessage,
  });

  TryOnHistoryState copyWith({
    TryOnHistoryStatus?      status,
    List<TryOnSessionModel>? sessions,
    String?                  errorMessage,
    bool                     clearError = false,
  }) {
    return TryOnHistoryState(
      status:       status   ?? this.status,
      sessions:     sessions ?? this.sessions,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, sessions, errorMessage];
}