import 'package:equatable/equatable.dart';

abstract class CatalogManagementEvent extends Equatable {
  const CatalogManagementEvent();
  @override
  List<Object?> get props => [];
}

class CatalogManagementLoadRequested extends CatalogManagementEvent {
  final String vendorId;
  const CatalogManagementLoadRequested(this.vendorId);
  @override
  List<Object?> get props => [vendorId];
}

class CatalogManagementDeactivateRequested extends CatalogManagementEvent {
  final String clothingId;
  final String vendorId;
  const CatalogManagementDeactivateRequested({
    required this.clothingId,
    required this.vendorId,
  });
  @override
  List<Object?> get props => [clothingId, vendorId];
}