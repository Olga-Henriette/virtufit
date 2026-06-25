import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import '../../data/repositories/vendor_repository.dart';
import 'vendor_dashboard_event.dart';
import 'vendor_dashboard_state.dart';

class VendorDashboardBloc
    extends Bloc<VendorDashboardEvent, VendorDashboardState> {
  final VendorRepository _repository;

  VendorDashboardBloc(this._repository)
      : super(const VendorDashboardState()) {
    on<VendorDashboardLoadRequested>(_onLoad);
  }

  Future<void> _onLoad(
    VendorDashboardLoadRequested event,
    Emitter<VendorDashboardState>  emit,
  ) async {
    emit(state.copyWith(status: VendorDashboardStatus.loading));

    try {
      final dashboard = await _repository.getDashboard(vendorId: event.vendorId);
      emit(state.copyWith(
        status:    VendorDashboardStatus.loaded,
        dashboard: dashboard,
      ));
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        emit(state.copyWith(status: VendorDashboardStatus.empty));
      } else {
        emit(state.copyWith(
          status:       VendorDashboardStatus.error,
          errorMessage: 'Impossible de charger le dashboard.',
        ));
      }
    } catch (_) {
      emit(state.copyWith(
        status:       VendorDashboardStatus.error,
        errorMessage: 'Une erreur inattendue est survenue.',
      ));
    }
  }
}