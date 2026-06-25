import 'dart:io';
import 'package:equatable/equatable.dart';
import '../../../tryon/data/models/clothing_model.dart';

enum ClothingUploadStatus { idle, uploading, success, error }

class ClothingUploadState extends Equatable {
  final ClothingUploadStatus status;
  final List<File>           photos;
  final ClothingModel?       result;
  final String?              errorMessage;

  const ClothingUploadState({
    this.status       = ClothingUploadStatus.idle,
    this.photos        = const [],
    this.result,
    this.errorMessage,
  });

  ClothingUploadState copyWith({
    ClothingUploadStatus? status,
    List<File>?           photos,
    ClothingModel?        result,
    String?               errorMessage,
    bool                  clearError = false,
  }) {
    return ClothingUploadState(
      status:       status  ?? this.status,
      photos:       photos  ?? this.photos,
      result:       result  ?? this.result,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, photos, result, errorMessage];
}