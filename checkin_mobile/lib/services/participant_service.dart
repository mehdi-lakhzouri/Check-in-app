import '../config/api_config.dart';
import '../models/models.dart';
import 'api_service.dart';

/// Participant API Service
class ParticipantService {
  final ApiService _api;

  ParticipantService(this._api);

  /// Search participants
  Future<ApiResponse<List<Participant>>> searchParticipants(
    String query, {
    int? page,
    int? limit,
  }) async {
    final queryParams = <String, dynamic>{
      'search': query,
    };
    if (page != null) queryParams['page'] = page;
    if (limit != null) queryParams['limit'] = limit;

    final response = await _api.get(
      ApiConfig.participants,
      queryParameters: queryParams,
    );

    return ApiResponse.fromJsonList(
      response.data as Map<String, dynamic>,
      Participant.fromJson,
    );
  }

  /// Get participant by ID
  Future<Participant> getParticipant(String id) async {
    final response = await _api.get('${ApiConfig.participants}/$id');
    final data = response.data as Map<String, dynamic>;
    return Participant.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Get participant by QR code
  Future<Participant> getParticipantByQrCode(String qrCode) async {
    final response = await _api.get('${ApiConfig.participants}/qr/$qrCode');
    final data = response.data as Map<String, dynamic>;
    return Participant.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Get participant details with QR data URL
  Future<Map<String, dynamic>> getParticipantDetails(String id) async {
    final response = await _api.get('${ApiConfig.participants}/$id/details');
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }
}
