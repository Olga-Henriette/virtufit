import 'dart:io';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../tryon/data/models/clothing_model.dart';
import '../models/vendor_dashboard_model.dart';

class VendorRepository {
  final ApiClient _apiClient;

  VendorRepository({required this._apiClient});

  // ─── Dashboard vendeur ─────────────────────────────────────
  Future<VendorDashboardModel> getDashboard({
    required String vendorId,
    int periodDays = 30,
  }) async {
    final response = await _apiClient.get(
      '/vendor/$vendorId/dashboard',
      params: {'periodDays': periodDays},
    );
    return VendorDashboardModel.fromJson(response.data as Map<String, dynamic>);
  }

  // ─── Catalogue du vendeur ──────────────────────────────────
  Future<List<ClothingModel>> getCatalogue(String vendorId) async {
    final response = await _apiClient.get('/catalogue/vendors/$vendorId');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ClothingModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ─── Désactiver un vêtement ─────────────────────────────────
  Future<void> deactivateClothing({
    required String clothingId,
    required String vendorId,
  }) async {
    await _apiClient.delete('/catalogue/$clothingId/vendors/$vendorId');
  }

  // ─── Numériser un nouveau vêtement ──────────────────────────
  Future<ClothingModel> digitizeClothing({
    required String clothingId,
    required String vendorId,
    required String category,
    required String name,
    required List<File> photos,
    required List<String> viewAngles,
  }) async {
    final formData = FormData.fromMap({
      'clothingId': clothingId,
      'vendorId':   vendorId,
      'category':   category,
      'name':       name,
      'viewAngles': viewAngles.join(','),
      'photos': await Future.wait(
        photos.map((file) => MultipartFile.fromFile(
          file.path,
          filename: file.path.split('/').last,
        )),
      ),
    });

    final response = await _apiClient.postForm(
      '/catalogue/digitize',
      data: formData,
    );
    return ClothingModel.fromJson(response.data as Map<String, dynamic>);
  }
}