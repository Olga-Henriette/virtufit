import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_storage.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient     _apiClient;
  final SecureStorage _storage;

  AuthRepository({
    required this._apiClient,
    required this._storage,
  });     

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    final result = AuthResult.fromJson(response.data as Map<String, dynamic>);
    await _storage.saveTokens(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.user.id,
    );
    return result;
  }

  Future<AuthResult> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
  }) async {
    final response = await _apiClient.post(
      '/auth/register',
      data: {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'role': role,
      },
    );
    final result = AuthResult.fromJson(response.data as Map<String, dynamic>);
    await _storage.saveTokens(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.user.id,
    );
    return result;
  }

  Future<void> logout() async {
    try {
      await _apiClient.post('/auth/logout');
    } catch (_) {
      // Logout local même si le backend échoue
    } finally {
      await _storage.clearAll();
    }
  }

  Future<UserModel> getProfile() async {
    final response = await _apiClient.get('/auth/me');
    final data = response.data as Map<String, dynamic>;
    return UserModel.fromJson(data['data'] as Map<String, dynamic>);
  }

  Future<bool> hasActiveSession() async {
    final token = await _storage.getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<UserModel?> restoreSession() async {
    if (!await hasActiveSession()) return null;
    try {
      return await getProfile();
    } catch (_) {
      await _storage.clearAll();
      return null;
    }
  }
}
