import '../../../../core/network/api_client.dart';
import '../models/avatar_model.dart';
import '../models/morphotype_model.dart';

class AvatarRepository {
  final ApiClient _apiClient;

  AvatarRepository({required this._apiClient});

  // Générer depuis un morphotype
  Future<AvatarModel> generateFromMorphotype({
    required String userId,
    required MorphotypeCode morphotypeCode,
    required double targetHeightCm,
    required double targetWeightKg,
  }) async {
    final response = await _apiClient.post(
      '/avatars/morphotype',
      data: {
        'userId':         userId,
        'morphotypeCode': morphotypeCode.apiValue,
        'targetHeightCm': targetHeightCm,
        'targetWeightKg': targetWeightKg,
      },
    );
    return AvatarModel.fromJson(response.data as Map<String, dynamic>);
  }

  // Récupérer l'avatar actif
  Future<AvatarModel?> getActive(String userId) async {
    try {
      final response = await _apiClient.get('/avatars/users/$userId/active');
      return AvatarModel.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // Historique des avatars
  Future<List<AvatarModel>> getHistory(String userId) async {
    final response = await _apiClient.get('/avatars/users/$userId/history');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => AvatarModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}