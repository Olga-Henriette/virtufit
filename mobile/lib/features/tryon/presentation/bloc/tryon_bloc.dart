import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import '../../data/repositories/tryon_repository.dart';
import 'tryon_event.dart';
import 'tryon_state.dart';

class TryOnBloc extends Bloc<TryOnEvent, TryOnState> {
  final TryOnRepository _repository;

  TryOnBloc(this._repository) : super(const TryOnState()) {
    on<TryOnAnimationSelected>(_onAnimationSelected);
    on<TryOnStartRequested>(_onStart);
  }

  void _onAnimationSelected(
    TryOnAnimationSelected event,
    Emitter<TryOnState>     emit,
  ) {
    emit(state.copyWith(selectedAnimation: event.animationType));
  }

  Future<void> _onStart(
    TryOnStartRequested event,
    Emitter<TryOnState>  emit,
  ) async {
    emit(state.copyWith(status: TryOnStatus.starting, clearError: true));

    try {
      final session = await _repository.startTryOn(
        userId:        event.userId,
        avatarId:      event.avatarId,
        clothingId:    event.clothingId,
        animationType: state.selectedAnimation,
      );
      emit(state.copyWith(status: TryOnStatus.success, session: session));
    } on DioException catch (e) {
      emit(state.copyWith(
        status:       TryOnStatus.error,
        errorMessage: _extractError(e),
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       TryOnStatus.error,
        errorMessage: 'L\'essayage virtuel a échoué. Réessayez.',
      ));
    }
  }

  String _extractError(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final msg = data['message'];
      if (msg is String)                 return msg;
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
    }
    switch (e.response?.statusCode) {
      case 404: return 'Avatar ou vêtement introuvable.';
      case 503: return 'Service de simulation indisponible. Réessayez.';
      default:
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout) {
          return 'La simulation prend plus de temps que prévu.';
        }
        return 'Une erreur est survenue pendant l\'essayage.';
    }
  }
}