import 'package:equatable/equatable.dart';
import '../../data/models/avatar_model.dart';
import '../../data/models/morphotype_model.dart';

enum MorphotypeStatus { idle, generating, success, error }

class MorphotypeState extends Equatable {
  final MorphotypeStatus status;
  final MorphotypeCode?  selectedCode;
  final AvatarModel?     generatedAvatar;
  final String?          errorMessage;

  const MorphotypeState({
    this.status          = MorphotypeStatus.idle,
    this.selectedCode,
    this.generatedAvatar,
    this.errorMessage,
  });

  MorphotypeState copyWith({
    MorphotypeStatus? status,
    MorphotypeCode?   selectedCode,
    AvatarModel?      generatedAvatar,
    String?           errorMessage,
    bool              clearError = false,
  }) {
    return MorphotypeState(
      status:          status       ?? this.status,
      selectedCode:    selectedCode ?? this.selectedCode,
      generatedAvatar: generatedAvatar ?? this.generatedAvatar,
      errorMessage:    clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, selectedCode, generatedAvatar, errorMessage];
}