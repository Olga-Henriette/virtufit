import '../../../../core/network/api_client.dart';
import '../models/tryon_model.dart';
import '../models/fit_report_model.dart';

class TryOnRepository {
  final ApiClient _apiClient;

  TryOnRepository({required this._apiClient});

  // Démarrer un essayage
  Future<TryOnSessionModel> startTryOn({
    required String userId,
    required String avatarId,
    required String clothingId,
    required TryOnAnimationType animationType,
  }) async {
    final response = await _apiClient.post(
      '/tryon/start',
      data: {
        'userId':        userId,
        'avatarId':      avatarId,
        'clothingId':    clothingId,
        'animationType': animationType.apiValue,
      },
    );
    return TryOnSessionModel.fromJson(response.data as Map<String, dynamic>);
  }

  // Récupérer une session
  Future<TryOnSessionModel> findSession(String sessionId) async {
    final response = await _apiClient.get('/tryon/sessions/$sessionId');
    return TryOnSessionModel.fromJson(response.data as Map<String, dynamic>);
  }

  // Historique d'un utilisateur
  Future<List<TryOnSessionModel>> findHistory({
    required String userId,
    int? limit,
  }) async {
    final response = await _apiClient.get(
      '/tryon/users/$userId/history',
      params: limit != null ? {'limit': limit} : null,
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => TryOnSessionModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Rapport d'ajustement détaillé
  Future<FitReportModel> getFitReport(String sessionId) async {
    final response = await _apiClient.get('/fit-report/sessions/$sessionId');
    return FitReportModel.fromJson(response.data as Map<String, dynamic>);
  }

  // Comparer plusieurs tailles
  Future<Map<String, FitReportModel>> compareSizes({
    required String sessionId,
    required List<String> sizes,
  }) async {
    final response = await _apiClient.post(
      '/fit-report/sessions/$sessionId/compare-sizes',
      data: {'sizes': sizes},
    );
    final map = response.data as Map<String, dynamic>;
    return map.map(
      (key, value) =>
          MapEntry(key, FitReportModel.fromJson(value as Map<String, dynamic>)),
    );
  }
}