import 'package:equatable/equatable.dart';
import '../../data/models/measurement_model.dart';

enum MeasurementsStatus { initial, loading, loaded, submitting, success, error }

class MeasurementsState extends Equatable {
  final MeasurementsStatus status;
  final MeasurementModel?  active;
  final String?            errorMessage;

  const MeasurementsState({
    this.status       = MeasurementsStatus.initial,
    this.active,
    this.errorMessage,
  });

  MeasurementsState copyWith({
    MeasurementsStatus? status,
    MeasurementModel?   active,
    String?             errorMessage,
    bool                clearError = false,
  }) {
    return MeasurementsState(
      status:       status ?? this.status,
      active:       active ?? this.active,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, active, errorMessage];
}