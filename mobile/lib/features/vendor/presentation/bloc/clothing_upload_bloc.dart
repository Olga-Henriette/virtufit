import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../../data/repositories/vendor_repository.dart';
import 'clothing_upload_event.dart';
import 'clothing_upload_state.dart';

const _defaultAngles = ['front', 'back', 'left', 'right', 'detail'];

class ClothingUploadBloc
    extends Bloc<ClothingUploadEvent, ClothingUploadState> {
  final VendorRepository _repository;
  final _uuid = const Uuid();

  ClothingUploadBloc(this._repository)
      :super(const ClothingUploadState()) {
    on<ClothingUploadPhotoAdded>(_onPhotoAdded);
    on<ClothingUploadPhotoRemoved>(_onPhotoRemoved);
    on<ClothingUploadSubmitted>(_onSubmit);
    on<ClothingUploadReset>(_onReset);
  }

  void _onPhotoAdded(
    ClothingUploadPhotoAdded event,
    Emitter<ClothingUploadState> emit,
  ) {
    if (state.photos.length >= 5) return;
    emit(state.copyWith(
      photos: [...state.photos, event.photo],
      clearError: true,
    ));
  }

  void _onPhotoRemoved(
    ClothingUploadPhotoRemoved event,
    Emitter<ClothingUploadState> emit,
  ) {
    final updated = [...state.photos]..removeAt(event.index);
    emit(state.copyWith(photos: updated));
  }

  Future<void> _onSubmit(
    ClothingUploadSubmitted event,
    Emitter<ClothingUploadState> emit,
  ) async {
    if (state.photos.length < 2) {
      emit(state.copyWith(
        status:       ClothingUploadStatus.error,
        errorMessage: 'Ajoutez au moins 2 photos.',
      ));
      return;
    }

    emit(state.copyWith(status: ClothingUploadStatus.uploading, clearError: true));

    try {
      final angles = List.generate(
        state.photos.length,
        (i) => _defaultAngles[i.clamp(0, _defaultAngles.length - 1)],
      );

      final result = await _repository.digitizeClothing(
        clothingId: _uuid.v4(),
        vendorId:   event.vendorId,
        category:   event.category,
        name:       event.name,
        photos:     state.photos,
        viewAngles: angles,
      );

      emit(state.copyWith(status: ClothingUploadStatus.success, result: result));
    } on DioException catch (e) {
      emit(state.copyWith(
        status:       ClothingUploadStatus.error,
        errorMessage: _extractError(e),
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       ClothingUploadStatus.error,
        errorMessage: 'Échec de la numérisation. Réessayez.',
      ));
    }
  }

  void _onReset(
    ClothingUploadReset event,
    Emitter<ClothingUploadState> emit,
  ) {
    emit(const ClothingUploadState());
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
      return 'L\'analyse prend plus de temps que prévu. Réessayez.';
    }
    return 'Service de numérisation indisponible.';
  }
}