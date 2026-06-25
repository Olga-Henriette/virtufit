import 'package:equatable/equatable.dart';
import '../../../tryon/data/models/clothing_model.dart';

enum CatalogManagementStatus { loading, loaded, empty, error }

class CatalogManagementState extends Equatable {
  final CatalogManagementStatus status;
  final List<ClothingModel>     items;
  final String                  vendorId;
  final String?                 errorMessage;

  const CatalogManagementState({
    this.status       = CatalogManagementStatus.loading,
    this.items         = const [],
    this.vendorId       = '',
    this.errorMessage,
  });

  CatalogManagementState copyWith({
    CatalogManagementStatus? status,
    List<ClothingModel>?     items,
    String?                  vendorId,
    String?                  errorMessage,
    bool                     clearError = false,
  }) {
    return CatalogManagementState(
      status:       status   ?? this.status,
      items:        items    ?? this.items,
      vendorId:     vendorId ?? this.vendorId,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, items, vendorId, errorMessage];
}