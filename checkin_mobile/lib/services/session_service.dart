import '../config/api_config.dart';
import '../models/models.dart';
import 'api_service.dart';

/// Session API Service
class SessionService {
  final ApiService _api;

  SessionService(this._api);

  /// Get all sessions
  Future<ApiResponse<List<Session>>> getSessions({
    int? page,
    int? limit,
    String? search,
    bool? isOpen,
    int? day,
  }) async {
    final queryParams = <String, dynamic>{};
    if (page != null) queryParams['page'] = page;
    if (limit != null) queryParams['limit'] = limit;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (isOpen != null) queryParams['isOpen'] = isOpen;
    if (day != null) queryParams['day'] = day;

    final response = await _api.get(
      ApiConfig.sessions,
      queryParameters: queryParams,
    );

    return ApiResponse.fromJsonList(
      response.data as Map<String, dynamic>,
      Session.fromJson,
    );
  }

  /// Get session by ID
  Future<Session> getSession(String id) async {
    final response = await _api.get('${ApiConfig.sessions}/$id');
    final data = response.data as Map<String, dynamic>;
    return Session.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Get upcoming sessions
  Future<List<Session>> getUpcomingSessions({int limit = 5}) async {
    final response = await _api.get(
      '${ApiConfig.sessions}/upcoming',
      queryParameters: {'limit': limit},
    );
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.map((e) => Session.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get session statistics
  Future<Map<String, dynamic>> getStats() async {
    final response = await _api.get('${ApiConfig.sessions}/stats');
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Get session check-ins
  Future<List<CheckIn>> getSessionCheckIns(String sessionId) async {
    final response = await _api.get('${ApiConfig.sessions}/$sessionId/checkins');
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.map((e) => CheckIn.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get session participants (registered)
  Future<List<Participant>> getSessionParticipants(String sessionId) async {
    final response =
        await _api.get('${ApiConfig.sessions}/$sessionId/participants');
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list
        .map((e) => Participant.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
