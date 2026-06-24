import 'package:equatable/equatable.dart';

abstract class TryOnHistoryEvent extends Equatable {
  const TryOnHistoryEvent();
  @override
  List<Object?> get props => [];
}

class TryOnHistoryLoadRequested extends TryOnHistoryEvent {
  final String userId;
  const TryOnHistoryLoadRequested(this.userId);
  @override
  List<Object?> get props => [userId];
}

class TryOnHistoryRefreshRequested extends TryOnHistoryEvent {
  final String userId;
  const TryOnHistoryRefreshRequested(this.userId);
  @override
  List<Object?> get props => [userId];
} 