import 'dart:io';
import 'package:equatable/equatable.dart';

abstract class ClothingUploadEvent extends Equatable {
  const ClothingUploadEvent();
  @override
  List<Object?> get props => [];
}

class ClothingUploadPhotoAdded extends ClothingUploadEvent {
  final File photo;
  const ClothingUploadPhotoAdded(this.photo);
  @override
  List<Object?> get props => [photo.path];
}

class ClothingUploadPhotoRemoved extends ClothingUploadEvent {
  final int index;
  const ClothingUploadPhotoRemoved(this.index);
  @override
  List<Object?> get props => [index];
}

class ClothingUploadSubmitted extends ClothingUploadEvent {
  final String vendorId;
  final String name;
  final String category;
  const ClothingUploadSubmitted({
    required this.vendorId,
    required this.name,
    required this.category,
  });
  @override
  List<Object?> get props => [vendorId, name, category];
}

class ClothingUploadReset extends ClothingUploadEvent {
  const ClothingUploadReset();
}