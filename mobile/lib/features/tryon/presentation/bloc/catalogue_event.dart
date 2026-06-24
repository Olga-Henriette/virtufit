import 'package:equatable/equatable.dart';

abstract class CatalogueEvent extends Equatable {
  const CatalogueEvent();
  @override
  List<Object?> get props => [];
}

class CatalogueLoadRequested extends CatalogueEvent {
  final String vendorId;
  final String? category;
  const CatalogueLoadRequested({required this.vendorId, this.category});
  @override
  List<Object?> get props => [vendorId, category];
}

class CatalogueCategoryFilterChanged extends CatalogueEvent {
  final String? category;
  const CatalogueCategoryFilterChanged(this.category);
  @override
  List<Object?> get props => [category];
}