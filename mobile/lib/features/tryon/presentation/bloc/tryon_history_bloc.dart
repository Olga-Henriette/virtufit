import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/tryon_repository.dart';
import 'tryon_history_event.dart';
import 'tryon_history_state.dart';

class TryOnHistoryBloc extends Bloc<TryOnHistoryEvent, TryOnHistoryState> {
  final TryOnRepository _repository;

  TryOnHistoryBloc(this._repository) : super(const TryOnHistoryState()) {
    on<TryOnHistoryLoadRequested>(_onLoad);
    on<TryOnHistoryRefreshRequested>(_onLoad);
  }

  Future<void> _onLoad(
    TryOnHistoryEvent          event,
    Emitter<TryOnHistoryState> emit,
  ) async {
    emit(state.copyWith(status: TryOnHistoryStatus.loading, clearError: true));

    final userId = switch (event) {
      TryOnHistoryLoadRequested(userId: final id)    => id,
      TryOnHistoryRefreshRequested(userId: final id) => id,
      _ => null,
    };
    if (userId == null) return;

    try {
      final sessions = await _repository.findHistory(userId: userId, limit: 50);
      emit(state.copyWith(
        status:   sessions.isEmpty ? TryOnHistoryStatus.empty : TryOnHistoryStatus.loaded,
        sessions: sessions,
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       TryOnHistoryStatus.error,
        errorMessage: 'Impossible de charger l\'historique.',
      ));
    }
  }
}