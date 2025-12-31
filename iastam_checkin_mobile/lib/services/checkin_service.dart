import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../models/check_in_manual.dart';
import 'dio_provider.dart';

final checkinServiceProvider = Provider<CheckinService>((ref) {
  final dio = ref.watch(dioProvider);
  return CheckinService(dio);
});

class CheckinService {
  final Dio _dio;

  CheckinService(this._dio);

  Future<CheckIn> checkinWithQr(String qrCode, String sessionId) async {
    print('=== CHECKIN SERVICE: checkinWithQr called ===');
    print('=== QR Code: $qrCode ===');
    print('=== Session ID: $sessionId ===');
    print('=== API URL: ${ApiConfig.baseUrl}${ApiConfig.checkinQr} ===');
    
    try {
      print('=== Making POST request... ===');
      final response = await _dio.post(
        ApiConfig.checkinQr,
        data: {'qrCode': qrCode, 'sessionId': sessionId},
      );

      print('=== Response status: ${response.statusCode} ===');
      print('=== Response data: ${response.data} ===');

      if (response.statusCode == 201) {
        final data = response.data;
        if (data['status'] == 'success' && data['data'] != null) {
          return CheckIn.fromJson(data['data']);
        }
      }

      throw Exception('Check-in failed');
    } on DioException catch (e) {
      print('=== DioException: ${e.message} ===');
      print('=== Response: ${e.response?.data} ===');
      if (e.response != null) {
        final errorData = e.response!.data;
        if (errorData is Map<String, dynamic> && errorData['message'] != null) {
          throw Exception(errorData['message']);
        }
      }
      throw Exception('Network error: ${e.message}');
    } catch (e) {
      print('=== Unexpected error: $e ===');
      throw Exception('Unexpected error: $e');
    }
  }

  Future<CheckIn> checkin(String participantId, String sessionId) async {
    try {
      final response = await _dio.post(
        ApiConfig.checkin,
        data: {'participantId': participantId, 'sessionId': sessionId},
      );

      if (response.statusCode == 201) {
        final data = response.data;
        if (data['status'] == 'success' && data['data'] != null) {
          return CheckIn.fromJson(data['data']);
        }
      }

      throw Exception('Check-in failed');
    } on DioException catch (e) {
      if (e.response != null) {
        final errorData = e.response!.data;
        if (errorData is Map<String, dynamic> && errorData['message'] != null) {
          throw Exception(errorData['message']);
        }
      }
      throw Exception('Network error: ${e.message}');
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }
}
