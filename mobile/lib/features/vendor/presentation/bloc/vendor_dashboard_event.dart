import 'package:equatable/equatable.dart';

abstract class VendorDashboardEvent extends Equatable {
  const VendorDashboardEvent();
  @override
  List<Object?> get props => [];
}

class VendorDashboardLoadRequested extends VendorDashboardEvent {
  final String vendorId;
  const VendorDashboardLoadRequested(this.vendorId);
  @override
  List<Object?> get props => [vendorId];
}