import 'package:equatable/equatable.dart';

abstract class AvatarViewerEvent extends Equatable {
  const AvatarViewerEvent();
  @override
  List<Object?> get props => [];
}

class AvatarViewerLoadRequested extends AvatarViewerEvent {
  final String userId;
  const AvatarViewerLoadRequested(this.userId);
  @override
  List<Object?> get props => [userId];
}

class AvatarViewerRefreshRequested extends AvatarViewerEvent {
  final String userId;
  const AvatarViewerRefreshRequested(this.userId);
  @override
  List<Object?> get props => [userId];
}