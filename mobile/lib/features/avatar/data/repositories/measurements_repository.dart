import '../../../../core/network/api_client.dart';
import '../models/measurement_model.dart';

class MeasurementsRepository {
  final ApiClient _apiClient;

  MeasurementsRepository({required this._apiClient});

  // Créer de nouvelles mensurations
  Future<MeasurementModel> create({
    required String userId,
    required MeasurementModel measurements,
  }) async {
    final response = await _apiClient.post(
      '/measurements/users/$userId',
      data: measurements.toJson(),
    );
    
    final rawData = response.data;
    Map<String, dynamic> extractedData;

    // Extraction intelligente et performante du payload
    if (rawData is Map<String, dynamic> && rawData.containsKey('data')) {
      extractedData = rawData['data'] as Map<String, dynamic>;
    } else {
      extractedData = rawData as Map<String, dynamic>;
    }

    return MeasurementModel.fromJson(extractedData);
  }

  // Récupérer les mensurations actives
  Future<MeasurementModel?> getActive(String userId) async {
    try {
      final response = await _apiClient.get(
        '/measurements/users/$userId/active',
      );
      final data = response.data['data'] as Map<String, dynamic>?;
      if (data == null) return null;
      return MeasurementModel.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  // Historique complet
  Future<List<MeasurementModel>> getHistory(String userId) async {
    final response = await _apiClient.get(
      '/measurements/users/$userId/history',
    );
    final list = response.data['data'] as List<dynamic>;
    return list
        .map((e) => MeasurementModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Désactiver une mensuration
  Future<void> deactivate({
    required String measurementId,
    required String userId,
  }) async {
    await _apiClient.delete(
      '/measurements/$measurementId/users/$userId',
    );
  }
}