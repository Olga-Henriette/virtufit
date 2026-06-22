import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import '../../data/repositories/measurements_repository.dart';
import 'measurements_event.dart';
import 'measurements_state.dart';

class MeasurementsBloc extends Bloc<MeasurementsEvent, MeasurementsState> {
  final MeasurementsRepository repository;

  MeasurementsBloc({required this.repository})
      : super(const MeasurementsState()) {
    on<MeasurementsLoadActiveRequested>(_onLoadActive);
    on<MeasurementsSubmitRequested>(_onSubmit);
    on<MeasurementsReset>(_onReset);
  }

  Future<void> _onLoadActive(
    MeasurementsLoadActiveRequested event,
    Emitter<MeasurementsState>        emit,
  ) async {
    emit(state.copyWith(status: MeasurementsStatus.loading));
    try {
      final active = await repository.getActive(event.userId);
      emit(state.copyWith(
        status: MeasurementsStatus.loaded,
        active: active,
      ));
    } catch (_) {
      emit(state.copyWith(status: MeasurementsStatus.loaded));
    }
  }

  Future<void> _onSubmit(
    MeasurementsSubmitRequested event,
    Emitter<MeasurementsState>   emit,
  ) async {
    emit(state.copyWith(
      status:     MeasurementsStatus.submitting,
      clearError: true,
    ));
    try {
      final created = await repository.create(
        userId:       event.userId,
        measurements: event.measurements,
      );
      emit(state.copyWith(
        status: MeasurementsStatus.success,
        active: created,
      ));
    } on DioException catch (e) {
      emit(state.copyWith(
        status:       MeasurementsStatus.error,
        errorMessage: _extractError(e),
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       MeasurementsStatus.error,
        errorMessage: 'Impossible d\'enregistrer les mensurations.',
      ));
    }
  }

  void _onReset(
    MeasurementsReset           event,
    Emitter<MeasurementsState>  emit,
  ) {
    emit(const MeasurementsState());
  }

  String _extractError(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final msg = data['message'];
      if (msg is String)                 return msg;
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
    }
    return 'Vérifiez vos mensurations et réessayez.';
  }
}