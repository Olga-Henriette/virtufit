import '../../../../core/network/api_client.dart';
import '../models/clothing_model.dart';

class CatalogueRepository {
  final ApiClient _apiClient;

  CatalogueRepository({required this._apiClient});

  // Lister le catalogue d'un vendeur
  Future<List<ClothingModel>> findByVendor({
    required String vendorId,
    String? category,
  }) async {
    final response = await _apiClient.get(
      '/catalogue/vendors/$vendorId',
      params: category != null ? {'category': category} : null,
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ClothingModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Récupérer un vêtement par ID
  Future<ClothingModel> findById(String clothingId) async {
    final response = await _apiClient.get('/catalogue/$clothingId');
    return ClothingModel.fromJson(response.data as Map<String, dynamic>);
  }
}