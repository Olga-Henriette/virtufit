import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/avatar_repository.dart';
import 'avatar_viewer_event.dart';
import 'avatar_viewer_state.dart';

class AvatarViewerBloc extends Bloc<AvatarViewerEvent, AvatarViewerState> {
  final AvatarRepository _repository;

  AvatarViewerBloc(this._repository) : super(const AvatarViewerState()) {
    on<AvatarViewerLoadRequested>(_onLoad);
    on<AvatarViewerRefreshRequested>(_onLoad);
  }

  Future<void> _onLoad(
    AvatarViewerEvent          event,
    Emitter<AvatarViewerState> emit,
  ) async {
    emit(state.copyWith(status: AvatarViewerStatus.loading, clearError: true));

    final userId = switch (event) {
      AvatarViewerLoadRequested(userId: final id)    => id,
      AvatarViewerRefreshRequested(userId: final id) => id,
      _ => null,
    };
    if (userId == null) return;

    try {
      final avatar = await _repository.getActive(userId);
      if (avatar == null) {
        emit(state.copyWith(status: AvatarViewerStatus.notFound));
      } else {
        emit(state.copyWith(status: AvatarViewerStatus.loaded, avatar: avatar));
      }
    } catch (_) {
      emit(state.copyWith(
        status:       AvatarViewerStatus.error,
        errorMessage: 'Impossible de charger l\'avatar.',
      ));
    }
  }
}