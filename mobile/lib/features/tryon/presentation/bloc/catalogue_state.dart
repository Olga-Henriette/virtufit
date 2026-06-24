import 'package:equatable/equatable.dart';
import '../../data/models/clothing_model.dart';

enum CatalogueStatus { initial, loading, loaded, empty, error }

class CatalogueState extends Equatable {
  final CatalogueStatus     status;
  final List<ClothingModel> items;
  final String?             activeCategory;
  final String              vendorId;
  final String?             errorMessage;

  const CatalogueState({
    this.status         = CatalogueStatus.initial,
    this.items           = const [],
    this.activeCategory,
    this.vendorId        = '',
    this.errorMessage,
  });

  CatalogueState copyWith({
    CatalogueStatus?     status,
    List<ClothingModel>? items,
    String?              activeCategory,
    String?              vendorId,
    String?              errorMessage,
    bool                 clearError    = false,
    bool                 clearCategory = false,
  }) {
    return CatalogueState(
      status:         status   ?? this.status,
      items:          items    ?? this.items,
      activeCategory: clearCategory ? null : (activeCategory ?? this.activeCategory),
      vendorId:       vendorId ?? this.vendorId,
      errorMessage:   clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, items, activeCategory, vendorId, errorMessage];
}