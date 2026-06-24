import 'package:equatable/equatable.dart';
import '../../data/models/fit_report_model.dart';

enum FitAnalysisStatus { loading, loaded, comparing, comparisonReady, error }

class FitAnalysisState extends Equatable {
  final FitAnalysisStatus               status;
  final FitReportModel?                 report;
  final Map<String, FitReportModel>?    comparison;
  final String?                         errorMessage;

  const FitAnalysisState({
    this.status       = FitAnalysisStatus.loading,
    this.report,
    this.comparison,
    this.errorMessage,
  });

  FitAnalysisState copyWith({
    FitAnalysisStatus?            status,
    FitReportModel?               report,
    Map<String, FitReportModel>?  comparison,
    String?                       errorMessage,
    bool                          clearError = false,
  }) {
    return FitAnalysisState(
      status:       status      ?? this.status,
      report:       report      ?? this.report,
      comparison:   comparison  ?? this.comparison,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, report, comparison, errorMessage];
}