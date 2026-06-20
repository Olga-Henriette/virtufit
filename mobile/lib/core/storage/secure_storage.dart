import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _accessTokenKey  = 'vf_access_token';
  static const _refreshTokenKey = 'vf_refresh_token';
  static const _userIdKey       = 'vf_user_id';

  static FlutterSecureStorage _buildStorage() {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return const FlutterSecureStorage(
        aOptions: AndroidOptions(
          encryptedSharedPreferences: true,
          resetOnError: true,          // reset si clé corrompue
        ),
      );
    }
    return const FlutterSecureStorage();
  }

  final FlutterSecureStorage _storage = _buildStorage();

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required String userId,
  }) async {
    try {
      await Future.wait([
        _storage.write(key: _accessTokenKey,  value: accessToken),
        _storage.write(key: _refreshTokenKey, value: refreshToken),
        _storage.write(key: _userIdKey,       value: userId),
      ]);
    } catch (e) {
      debugPrint('SecureStorage.saveTokens error: $e');
    }
  }

  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: _accessTokenKey);
    } catch (e) {
      debugPrint('SecureStorage.getAccessToken error: $e');
      return null;
    }
  }

  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  Future<String?> getUserId() async {
    try {
      return await _storage.read(key: _userIdKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
    } catch (e) {
      debugPrint('SecureStorage.clearAll error: $e');
    }
  }
}