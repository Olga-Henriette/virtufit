import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/vendor_repository.dart';
import 'catalog_management_event.dart';
import 'catalog_management_state.dart';

class CatalogManagementBloc
    extends Bloc<CatalogManagementEvent, CatalogManagementState> {
  final VendorRepository _repository;

  CatalogManagementBloc(this._repository) : super(const CatalogManagementState()) {
    on<CatalogManagementLoadRequested>(_onLoad);
    on<CatalogManagementDeactivateRequested>(_onDeactivate);
  }

  Future<void> _onLoad(
    CatalogManagementLoadRequested event,
    Emitter<CatalogManagementState>  emit,
  ) async {
    emit(state.copyWith(
      status:   CatalogManagementStatus.loading,
      vendorId: event.vendorId,
      clearError: true,
    ));

    try {
      final items = await _repository.getCatalogue(event.vendorId);
      emit(state.copyWith(
        status: items.isEmpty
          ? CatalogManagementStatus.empty
          : CatalogManagementStatus.loaded,
        items: items,
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       CatalogManagementStatus.error,
        errorMessage: 'Impossible de charger le catalogue.',
      ));
    }
  }

  Future<void> _onDeactivate(
    CatalogManagementDeactivateRequested event,
    Emitter<CatalogManagementState>        emit,
  ) async {
    try {
      await _repository.deactivateClothing(
        clothingId: event.clothingId,
        vendorId:   event.vendorId,
      );
      final updated = state.items
          .where((c) => c.clothingId != event.clothingId)
          .toList();
      emit(state.copyWith(
        items:  updated,
        status: updated.isEmpty
          ? CatalogManagementStatus.empty
          : CatalogManagementStatus.loaded,
      ));
    } catch (_) {
      emit(state.copyWith(
        errorMessage: 'Impossible de désactiver ce vêtement.',
      ));
    }
  }
}