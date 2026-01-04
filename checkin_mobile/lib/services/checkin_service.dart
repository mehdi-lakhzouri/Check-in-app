import '../config/api_config.dart';
import '../models/models.dart';
import 'api_service.dart';

/// Check-in API Service
class CheckInService {
  final ApiService _api;

  CheckInService(this._api);

  /// Verify QR code - returns verification result with badge and available actions
  Future<VerificationResult> verifyQr({
    required String qrCode,
    required String sessionId,
  }) async {
    final response = await _api.post(
      ApiConfig.checkinVerifyQr,
      data: {
        'qrCode': qrCode,
        'sessionId': sessionId,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return VerificationResult.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Accept check-in after verification
  Future<AcceptCheckInResult> acceptCheckIn({
    required String participantId,
    required String sessionId,
    String? acceptedBy,
    String? notes,
  }) async {
    final data = <String, dynamic>{
      'participantId': participantId,
      'sessionId': sessionId,
    };
    if (acceptedBy != null && acceptedBy.isNotEmpty) {
      data['acceptedBy'] = acceptedBy;
    }
    if (notes != null && notes.isNotEmpty) {
      data['notes'] = notes;
    }

    final response = await _api.post(ApiConfig.checkinAccept, data: data);
    return AcceptCheckInResult.fromJson(response.data as Map<String, dynamic>);
  }

  /// Decline check-in after verification
  Future<DeclineCheckInResult> declineCheckIn({
    required String participantId,
    required String sessionId,
    required String reason,
    String? declinedBy,
  }) async {
    final response = await _api.post(
      ApiConfig.checkinDecline,
      data: {
        'participantId': participantId,
        'sessionId': sessionId,
        'reason': reason,
        if (declinedBy != null && declinedBy.isNotEmpty) 
          'declinedBy': declinedBy,
      },
    );
    return DeclineCheckInResult.fromJson(response.data as Map<String, dynamic>);
  }

  /// Check-in by QR code (legacy - direct check-in without verification)
  Future<CheckInResult> checkInByQr({
    required String qrCode,
    required String sessionId,
    String? checkedInBy,
  }) async {
    final data = <String, dynamic>{
      'qrCode': qrCode,
      'sessionId': sessionId,
    };
    if (checkedInBy != null && checkedInBy.isNotEmpty) {
      data['checkedInBy'] = checkedInBy;
    }

    final response = await _api.post(ApiConfig.checkinQr, data: data);
    return CheckInResult.fromJson(response.data as Map<String, dynamic>);
  }

  /// Manual check-in by participant ID
  Future<CheckInResult> checkInManual({
    required String participantId,
    required String sessionId,
    String? checkedInBy,
    String? notes,
  }) async {
    final data = <String, dynamic>{
      'participantId': participantId,
      'sessionId': sessionId,
      'method': 'manual',
    };
    if (checkedInBy != null && checkedInBy.isNotEmpty) {
      data['checkedInBy'] = checkedInBy;
    }
    if (notes != null && notes.isNotEmpty) {
      data['notes'] = notes;
    }

    final response = await _api.post(ApiConfig.checkin, data: data);
    return CheckInResult.fromJson(response.data as Map<String, dynamic>);
  }

  /// Verify if participant is already checked in
  Future<bool> isCheckedIn(String participantId, String sessionId) async {
    final response =
        await _api.get('${ApiConfig.checkin}/verify/$participantId/$sessionId');
    final data = response.data as Map<String, dynamic>;
    return (data['data'] as Map<String, dynamic>)['isCheckedIn'] as bool? ??
        false;
  }

  /// Get all check-ins
  Future<ApiResponse<List<CheckIn>>> getCheckIns({
    int? page,
    int? limit,
    String? sessionId,
  }) async {
    final queryParams = <String, dynamic>{};
    if (page != null) queryParams['page'] = page;
    if (limit != null) queryParams['limit'] = limit;
    if (sessionId != null) queryParams['sessionId'] = sessionId;

    final response = await _api.get(
      ApiConfig.checkin,
      queryParameters: queryParams,
    );

    return ApiResponse.fromJsonList(
      response.data as Map<String, dynamic>,
      CheckIn.fromJson,
    );
  }

  /// Get recent check-ins
  Future<List<CheckIn>> getRecentCheckIns({
    int limit = 10,
    String? sessionId,
  }) async {
    final queryParams = <String, dynamic>{'limit': limit};
    if (sessionId != null) queryParams['sessionId'] = sessionId;

    final response = await _api.get(
      '${ApiConfig.checkin}/recent',
      queryParameters: queryParams,
    );
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.map((e) => CheckIn.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get check-in statistics
  Future<Map<String, dynamic>> getStats({String? sessionId}) async {
    final queryParams = <String, dynamic>{};
    if (sessionId != null) queryParams['sessionId'] = sessionId;

    final response = await _api.get(
      '${ApiConfig.checkin}/stats',
      queryParameters: queryParams,
    );
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Delete/undo a check-in
  Future<void> undoCheckIn(String checkInId) async {
    await _api.delete('${ApiConfig.checkin}/$checkInId');
  }
}

