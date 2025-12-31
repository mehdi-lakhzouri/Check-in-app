import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../models/session_manual.dart';
import 'dio_provider.dart';

final sessionServiceProvider = Provider<SessionService>((ref) {
  final dio = ref.watch(dioProvider);
  return SessionService(dio);
});

class SessionService {
  final Dio _dio;

  SessionService(this._dio);

  Future<List<Session>> getSessions() async {
    try {
      final response = await _dio.get(ApiConfig.sessions);

      if (response.statusCode == 200) {
        final data = response.data;
        if (data != null && data is Map<String, dynamic>) {
          if (data['status'] == 'success' && data['data'] != null) {
            final List<dynamic> sessionList = data['data'];
            return sessionList
                .map((json) {
                  if (json is Map<String, dynamic>) {
                    return Session.fromJson(json);
                  } else {
                    throw Exception('Invalid session data format');
                  }
                })
                .cast<Session>()
                .toList();
          }
        }
      }

      throw Exception('Failed to load sessions');
    } on DioException catch (e) {
      throw Exception('Network error: ${e.message}');
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  Future<Session> getSession(String id) async {
    try {
      final response = await _dio.get('${ApiConfig.sessions}/$id');

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['status'] == 'success' && data['data'] != null) {
          return Session.fromJson(data['data']);
        }
      }

      throw Exception('Failed to load session');
    } on DioException catch (e) {
      throw Exception('Network error: ${e.message}');
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }
}
