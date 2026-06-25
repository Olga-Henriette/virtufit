import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  late final Dio _dio;
  final SecureStorage _storage;

  static String get _baseUrl {
    if (kDebugMode) {
      return 'http://192.168.0.135:3000/api/v1';
    }
    return 'https://api.virtufit.com/api/v1';
  }

  ApiClient({required this._storage}) {
    _dio = Dio(BaseOptions(
      baseUrl:        _baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
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

  /// Pour les uploads multipart (FormData) — timeout étendu et JAMAIS
  /// retryable automatiquement (un FormData ne peut être envoyé qu'une fois).
  Future<Response> postForm(
    String path, {
    required FormData data,
    Duration sendTimeout    = const Duration(minutes: 5),
    Duration receiveTimeout = const Duration(minutes: 6),
    void Function(int sent, int total)? onSendProgress,
  }) {
    return _dio.post(
      path,
      data: data,
      options: Options(
        sendTimeout:    sendTimeout,
        receiveTimeout: receiveTimeout,
        extra: {'noAuthRetry': true},
      ),
      onSendProgress: onSendProgress,
    );
  }
}

class _AuthInterceptor extends Interceptor {
  final SecureStorage _storage;
  final Dio           _mainDio;

  _AuthInterceptor(this._storage, this._mainDio);

  @override
  Future<void> onRequest(
    RequestOptions             options,
    RequestInterceptorHandler  handler,
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
    final requestPath = err.requestOptions.path;
    final noRetry      = err.requestOptions.extra['noAuthRetry'] == true;

    // Ne JAMAIS retry une requête marquée noAuthRetry (FormData/upload)
    // ni les routes d'auth elles-mêmes.
    final shouldAttemptRefresh = err.response?.statusCode == 401 &&
        !noRetry &&
        !requestPath.contains('/auth/login') &&
        !requestPath.contains('/auth/refresh');

    if (shouldAttemptRefresh) {
      final refreshDio = Dio(BaseOptions(baseUrl: _mainDio.options.baseUrl));

      try {
        final refreshToken = await _storage.getRefreshToken();
        if (refreshToken == null) {
          handler.next(err);
          return;
        }

        final response = await refreshDio.post(
          '/auth/refresh',
          data: {'refreshToken': refreshToken},
        );

        final newAccess  = response.data['data']['accessToken']  as String;
        final newRefresh = response.data['data']['refreshToken'] as String;
        final userId      = await _storage.getUserId() ?? '';

        await _storage.saveTokens(
          accessToken:  newAccess,
          refreshToken: newRefresh,
          userId:       userId,
        );

        err.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
        final retried = await _mainDio.fetch(err.requestOptions);
        handler.resolve(retried);
        return;
      } catch (_) {
        await _storage.clearAll();
      } finally {
        refreshDio.close();
      }
    }

    handler.next(err);
  }
}