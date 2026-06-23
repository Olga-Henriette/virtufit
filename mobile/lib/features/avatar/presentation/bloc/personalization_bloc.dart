import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import '../../data/repositories/avatar_repository.dart';
import 'personalization_event.dart';
import 'personalization_state.dart';

class PersonalizationBloc
    extends Bloc<PersonalizationEvent, PersonalizationState> {
  final AvatarRepository _repository;

  // L'initialisation formelle directe d'un champ privé élimine l'avertissement
  PersonalizationBloc(this._repository) : super(const PersonalizationState()) {
    on<PersonalizationPhotoSelected>(_onPhotoSelected);
    on<PersonalizationUploadRequested>(_onUpload);
    on<PersonalizationSkipped>(_onSkip);
  }

  void _onPhotoSelected(
    PersonalizationPhotoSelected event,
    Emitter<PersonalizationState>  emit,
  ) {
    emit(state.copyWith(
      status:        PersonalizationStatus.photoSelected,
      selectedPhoto: event.photo,
      clearError:    true,
    ));
  }

  Future<void> _onUpload(
    PersonalizationUploadRequested event,
    Emitter<PersonalizationState>    emit,
  ) async {
    final photo = state.selectedPhoto;
    if (photo == null) {
      emit(state.copyWith(
        status:       PersonalizationStatus.error,
        errorMessage: 'Sélectionnez une photo d\'abord.',
      ));
      return;
    }

    emit(state.copyWith(status: PersonalizationStatus.uploading, clearError: true));

    try {
      final result = await _repository.uploadPersonalizationPhoto(
        userId:    event.userId,
        photoFile: photo,
      );
      emit(state.copyWith(
        status: PersonalizationStatus.success,
        result: result,
      ));
    } on DioException catch (e) {
      emit(state.copyWith(
        status:       PersonalizationStatus.error,
        errorMessage: _extractError(e),
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       PersonalizationStatus.error,
        errorMessage: 'Échec de l\'analyse de la photo.',
      ));
    }
  }

  void _onSkip(
    PersonalizationSkipped        event,
    Emitter<PersonalizationState> emit,
  ) {
    emit(state.copyWith(status: PersonalizationStatus.skipped));
  }

  String _extractError(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final msg = data['message'];
      if (msg is String)                 return msg;
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
    }
    switch (e.response?.statusCode) {
      case 404: return 'Aucun avatar actif trouvé. Générez d\'abord un avatar.';
      case 400: return 'Format de photo non supporté (JPEG, PNG, WebP uniquement).';
      default:  return 'Service d\'analyse indisponible. Réessayez.';
    }
  }
}