import 'package:equatable/equatable.dart';
import '../../data/models/measurement_model.dart';

abstract class MeasurementsEvent extends Equatable {
  const MeasurementsEvent();
  @override
  List<Object?> get props => [];
}

class MeasurementsLoadActiveRequested extends MeasurementsEvent {
  final String userId;
  const MeasurementsLoadActiveRequested(this.userId);
  @override
  List<Object?> get props => [userId];
}

class MeasurementsSubmitRequested extends MeasurementsEvent {
  final String userId;
  final MeasurementModel measurements;
  const MeasurementsSubmitRequested({
    required this.userId,
    required this.measurements,
  });
  @override
  List<Object?> get props => [userId, measurements];
}

class MeasurementsReset extends MeasurementsEvent {
  const MeasurementsReset();
}