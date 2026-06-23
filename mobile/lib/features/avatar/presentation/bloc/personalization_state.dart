import 'dart:io';
import 'package:equatable/equatable.dart';
import '../../data/models/personalization_model.dart';

enum PersonalizationStatus { idle, photoSelected, uploading, success, error, skipped }

class PersonalizationState extends Equatable {
  final PersonalizationStatus status;
  final File?                 selectedPhoto;
  final PersonalizationModel? result;
  final String?                errorMessage;

  const PersonalizationState({
    this.status        = PersonalizationStatus.idle,
    this.selectedPhoto,
    this.result,
    this.errorMessage,
  });

  PersonalizationState copyWith({
    PersonalizationStatus? status,
    File?                  selectedPhoto,
    PersonalizationModel?  result,
    String?                errorMessage,
    bool                   clearError = false,
  }) {
    return PersonalizationState(
      status:        status        ?? this.status,
      selectedPhoto: selectedPhoto ?? this.selectedPhoto,
      result:        result        ?? this.result,
      errorMessage:  clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, selectedPhoto, result, errorMessage];
}