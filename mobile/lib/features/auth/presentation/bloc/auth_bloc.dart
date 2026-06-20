import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import '../../data/repositories/auth_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';
import '../../data/models/user_model.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({required this._authRepository})
      : super(const AuthState()) {
    on<AuthCheckStatusRequested>(_onCheckStatus);
    on<AuthLoginRequested>(_onLogin);
    on<AuthRegisterRequested>(_onRegister);
    on<AuthLogoutRequested>(_onLogout);
  }

  Future<void> _onCheckStatus(
    AuthCheckStatusRequested event,
    Emitter<AuthState>        emit,
  ) async {
    emit(state.copyWith(isLoading: true));

    UserModel? user;
    try {
      user = await _authRepository
          .restoreSession()
          .timeout(const Duration(seconds: 8));
    } catch (_) {
      user = null;
    }

    if (user != null) {
      emit(state.copyWith(
        status:    AuthStatus.authenticated,
        user:      user,
        isLoading: false,
      ));
    } else {
      emit(state.copyWith(
        status:    AuthStatus.unauthenticated,
        isLoading: false,
        clearUser: true,
      ));
    }
  }

  Future<void> _onLogin(
    AuthLoginRequested event,
    Emitter<AuthState>  emit,
  ) async {
    emit(state.copyWith(isLoading: true, clearError: true));
    try {
      final result = await _authRepository.login(
        email:    event.email,
        password: event.password,
      );
      emit(state.copyWith(
        status:    AuthStatus.authenticated,
        user:      result.user,
        isLoading: false,
      ));
    } on DioException catch (e) {
      emit(state.copyWith(
        status:       AuthStatus.unauthenticated,
        errorMessage: _extractError(e),
        isLoading:    false,
      ));
    } catch (_) {
      emit(state.copyWith(
        status:       AuthStatus.unauthenticated,
        errorMessage: 'Une erreur inattendue est survenue.',
        isLoading:    false,
      ));
    }
  }

  Future<void> _onRegister(
    AuthRegisterRequested event,
    Emitter<AuthState>     emit,
  ) async {
    emit(state.copyWith(isLoading: true, clearError: true));
    try {
      final result = await _authRepository.register(
        email:     event.email,
        password:  event.password,
        firstName: event.firstName,
        lastName:  event.lastName,
        role:      event.role,
      );
      emit(state.copyWith(
        status:    AuthStatus.authenticated,
        user:      result.user,
        isLoading: false,
      ));
    } on DioException catch (e) {
      emit(state.copyWith(
        errorMessage: _extractError(e),
        isLoading:    false,
      ));
    } catch (_) {
      emit(state.copyWith(
        errorMessage: 'Inscription impossible. Réessayez.',
        isLoading:    false,
      ));
    }
  }

  Future<void> _onLogout(
    AuthLogoutRequested event,
    Emitter<AuthState>   emit,
  ) async {
    await _authRepository.logout();
    emit(state.copyWith(
      status:     AuthStatus.unauthenticated,
      clearUser:  true,
      clearError: true,
    ));
  }

  String _extractError(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final msg = data['message'];
      if (msg is String)                 return msg;
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
    }
    switch (e.response?.statusCode) {
      case 401: return 'Email ou mot de passe incorrect.';
      case 409: return 'Un compte existe déjà avec cet email.';
      case 422: return 'Données invalides.';
      default:  return 'Connexion impossible. Vérifiez votre réseau.';
    }
  }
}