import 'package:equatable/equatable.dart';

abstract class FitAnalysisEvent extends Equatable {
  const FitAnalysisEvent();
  @override
  List<Object?> get props => [];
}

class FitAnalysisLoadRequested extends FitAnalysisEvent {
  final String sessionId;
  const FitAnalysisLoadRequested(this.sessionId);
  @override
  List<Object?> get props => [sessionId];
}

class FitAnalysisCompareSizesRequested extends FitAnalysisEvent {
  final List<String> sizes;
  const FitAnalysisCompareSizesRequested(this.sizes);
  @override
  List<Object?> get props => [sizes];
}