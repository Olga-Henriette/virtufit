import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/catalogue_repository.dart';
import 'catalogue_event.dart';
import 'catalogue_state.dart';

class CatalogueBloc extends Bloc<CatalogueEvent, CatalogueState> {
  final CatalogueRepository _repository;
  CatalogueBloc(this._repository) : super(const CatalogueState()) {
    on<CatalogueLoadRequested>(_onLoad);
    on<CatalogueCategoryFilterChanged>(_onCategoryChanged);
  }

  Future<void> _onLoad(
    CatalogueLoadRequested event,
    Emitter<CatalogueState>  emit,
  ) async {
    emit(state.copyWith(
      status:   CatalogueStatus.loading,
      vendorId: event.vendorId,
      clearError: true,
    ));

    try {
      final items = await _repository.findByVendor(
        vendorId: event.vendorId,
        category: event.category,
      );
      emit(state.copyWith(
        status: items.isEmpty ? CatalogueStatus.empty : CatalogueStatus.loaded,
        items:  items,
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       CatalogueStatus.error,
        errorMessage: 'Impossible de charger le catalogue.',
      ));
    }
  }

  Future<void> _onCategoryChanged(
    CatalogueCategoryFilterChanged event,
    Emitter<CatalogueState>          emit,
  ) async {
    emit(state.copyWith(
      activeCategory: event.category,
      clearCategory:  event.category == null,
    ));
    add(CatalogueLoadRequested(
      vendorId: state.vendorId,
      category: event.category,
    ));
  }
}