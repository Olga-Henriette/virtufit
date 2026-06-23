import 'dart:io';
import 'package:equatable/equatable.dart';

abstract class PersonalizationEvent extends Equatable {
  const PersonalizationEvent();
  @override
  List<Object?> get props => [];
}

class PersonalizationPhotoSelected extends PersonalizationEvent {
  final File photo;
  const PersonalizationPhotoSelected(this.photo);
  @override
  List<Object?> get props => [photo.path];
}

class PersonalizationUploadRequested extends PersonalizationEvent {
  final String userId;
  const PersonalizationUploadRequested(this.userId);
  @override
  List<Object?> get props => [userId];
}

class PersonalizationSkipped extends PersonalizationEvent {
  const PersonalizationSkipped();
}