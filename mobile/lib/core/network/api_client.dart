import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  late final Dio _dio;
  final SecureStorage _storage;

  static const _baseUrl = 'http://192.168.0.135:3000/api/v1';

  ApiClient({required this._storage}) {
    _dio = Dio(BaseOptions(
      baseUrl:        _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers:        {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.addAll([
      _AuthInterceptor(_storage, _dio),
      if (kDebugMode)
        LogInterceptor(
          requestBody:  true,
          responseBody: true,
          logPrint:     (o) => debugPrint(o.toString()),
        ),
    ]);
  }

  Future<Response> get(String path, {Map<String, dynamic>? params}) =>
      _dio.get(path, queryParameters: params);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> patch(String path, {dynamic data}) =>
      _dio.patch(path, data: data);

  Future<Response> delete(String path) => _dio.delete(path);
}

class _AuthInterceptor extends Interceptor {
  final SecureStorage _storage;
  final Dio           _dio;

  _AuthInterceptor(this._storage, this._dio);

  @override
  Future<void> onRequest(
    RequestOptions          options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException            err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      try {
        final refreshToken = await _storage.getRefreshToken();
        if (refreshToken == null) {
          handler.next(err);
          return;
        }
        final response = await _dio.post(
          '/auth/refresh',
          data: {'refreshToken': refreshToken},
        );
        final newAccess  = response.data['data']['accessToken']  as String;
        final newRefresh = response.data['data']['refreshToken'] as String;
        final userId     = await _storage.getUserId() ?? '';

        await _storage.saveTokens(
          accessToken:  newAccess,
          refreshToken: newRefresh,
          userId:       userId,
        );

        err.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
        final retried = await _dio.fetch(err.requestOptions);
        handler.resolve(retried);
        return;
      } catch (_) {
        await _storage.clearAll();
      }
    }
    handler.next(err);
  }
}