import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import '../../data/repositories/avatar_repository.dart';
import 'morphotype_event.dart';
import 'morphotype_state.dart';

class MorphotypeBloc extends Bloc<MorphotypeEvent, MorphotypeState> {
  final AvatarRepository _repository;

  MorphotypeBloc(this._repository) : super(const MorphotypeState()) {
    
    on<MorphotypeSelected>(_onSelected);
    on<MorphotypeGenerateRequested>(_onGenerate);
  }

  void _onSelected(
    MorphotypeSelected event,
    Emitter<MorphotypeState> emit,
  ) {
    emit(state.copyWith(selectedCode: event.code, clearError: true));
  }

  Future<void> _onGenerate(
    MorphotypeGenerateRequested event,
    Emitter<MorphotypeState>     emit,
  ) async {
    final code = state.selectedCode;
    if (code == null) {
      emit(state.copyWith(
        status:       MorphotypeStatus.error,
        errorMessage: 'Sélectionnez un morphotype.',
      ));
      return;
    }

    emit(state.copyWith(status: MorphotypeStatus.generating, clearError: true));

    try {
      final avatar = await _repository.generateFromMorphotype(
        userId:         event.userId,
        morphotypeCode: code,
        targetHeightCm: event.targetHeightCm,
        targetWeightKg: event.targetWeightKg,
      );
      emit(state.copyWith(
        status:          MorphotypeStatus.success,
        generatedAvatar: avatar,
      ));
    } on DioException catch (e) {
      emit(state.copyWith(
        status:       MorphotypeStatus.error,
        errorMessage: _extractError(e),
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       MorphotypeStatus.error,
        errorMessage: 'Génération impossible. Réessayez.',
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
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Le service IA prend plus de temps que prévu. Réessayez.';
    }
    return 'Service de génération d\'avatar indisponible.';
  }
}