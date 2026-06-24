import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/tryon_repository.dart';
import 'fit_analysis_event.dart';
import 'fit_analysis_state.dart';

class FitAnalysisBloc extends Bloc<FitAnalysisEvent, FitAnalysisState> {
  final TryOnRepository _repository;
  String? _sessionId;

  FitAnalysisBloc(this._repository) : super(const FitAnalysisState()) {
    on<FitAnalysisLoadRequested>(_onLoad);
    on<FitAnalysisCompareSizesRequested>(_onCompare);
  }

  Future<void> _onLoad(
    FitAnalysisLoadRequested event,
    Emitter<FitAnalysisState>  emit,
  ) async {
    _sessionId = event.sessionId;
    emit(state.copyWith(status: FitAnalysisStatus.loading, clearError: true));

    try {
      final report = await _repository.getFitReport(event.sessionId);
      emit(state.copyWith(status: FitAnalysisStatus.loaded, report: report));
    } catch (_) {
      emit(state.copyWith(
        status:       FitAnalysisStatus.error,
        errorMessage: 'Impossible de charger le rapport d\'ajustement.',
      ));
    }
  }

  Future<void> _onCompare(
    FitAnalysisCompareSizesRequested event,
    Emitter<FitAnalysisState>          emit,
  ) async {
    if (_sessionId == null) return;
    emit(state.copyWith(status: FitAnalysisStatus.comparing, clearError: true));

    try {
      final comparison = await _repository.compareSizes(
        sessionId: _sessionId!,
        sizes:     event.sizes,
      );
      emit(state.copyWith(
        status:     FitAnalysisStatus.comparisonReady,
        comparison: comparison,
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       FitAnalysisStatus.error,
        errorMessage: 'Impossible de comparer les tailles.',
      ));
    }
  }
}