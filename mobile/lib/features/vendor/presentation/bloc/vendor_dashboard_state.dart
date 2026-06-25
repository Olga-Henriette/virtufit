import 'package:equatable/equatable.dart';
import '../../data/models/vendor_dashboard_model.dart';

enum VendorDashboardStatus { loading, loaded, empty, error }

class VendorDashboardState extends Equatable {
  final VendorDashboardStatus status;
  final VendorDashboardModel? dashboard;
  final String?               errorMessage;

  const VendorDashboardState({
    this.status       = VendorDashboardStatus.loading,
    this.dashboard,
    this.errorMessage,
  });

  VendorDashboardState copyWith({
    VendorDashboardStatus? status,
    VendorDashboardModel?  dashboard,
    String?                errorMessage,
  }) {
    return VendorDashboardState(
      status:       status    ?? this.status,
      dashboard:    dashboard ?? this.dashboard,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, dashboard, errorMessage];
}