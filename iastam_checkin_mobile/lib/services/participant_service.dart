import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../models/participant_manual.dart';
import '../models/check_in_manual.dart';
import 'dio_provider.dart';

final participantServiceProvider = Provider<ParticipantService>((ref) {
  final dio = ref.watch(dioProvider);
  return ParticipantService(dio);
});

class ParticipantService {
  final Dio _dio;

  ParticipantService(this._dio);

  Future<List<Participant>> getAllParticipants() async {
    try {
      final response = await _dio.get(ApiConfig.participants);

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['status'] == 'success' && data['data'] != null) {
          final List<dynamic> participantsJson = data['data'];
          return participantsJson
              .map((json) {
                if (json is Map<String, dynamic>) {
                  try {
                    return Participant.fromJson(json);
                  } catch (e) {
                    print('Error parsing participant JSON: $e');
                    print('JSON data: $json');
                    throw Exception('Failed to parse participant: $e');
                  }
                } else {
                  print('Invalid participant data type: ${json.runtimeType}');
                  print('Data: $json');
                  throw Exception(
                    'Invalid participant data format: expected Map<String, dynamic>, got ${json.runtimeType}',
                  );
                }
              })
              .cast<Participant>()
              .toList();
        }
      }

      throw Exception('Failed to load participants');
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

  Future<List<CheckIn>> getSessionCheckins(String sessionId) async {
    try {
      final response = await _dio.get(
        ApiConfig.sessionCheckins(sessionId),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['status'] == 'success' && data['data'] != null) {
          final List<dynamic> checkinsJson = data['data'];
          return checkinsJson
              .map((json) {
                if (json is Map<String, dynamic>) {
                  return CheckIn.fromJson(json);
                } else {
                  throw Exception('Invalid check-in data format');
                }
              })
              .cast<CheckIn>()
              .toList();
        }
      }

      throw Exception('Failed to load check-ins');
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

  Future<Participant?> searchParticipantByName(String name) async {
    try {
      final response = await _dio.get('${ApiConfig.participants}?search=$name');

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['status'] == 'success' && data['data'] != null) {
          final List<dynamic> participantsJson = data['data'];
          if (participantsJson.isNotEmpty) {
            final json = participantsJson.first;
            if (json is Map<String, dynamic>) {
              return Participant.fromJson(json);
            } else {
              throw Exception('Invalid participant data format');
            }
          }
        }
      }

      return null;
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

  Future<List<Participant>> getSessionParticipants(String sessionId) async {
    try {
      final response = await _dio.get(ApiConfig.sessionParticipants(sessionId));

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['status'] == 'success' && data['data'] != null) {
          final List<dynamic> participantsJson = data['data'];
          return participantsJson
              .map((json) {
                if (json is Map<String, dynamic>) {
                  try {
                    return Participant.fromJson(json);
                  } catch (e) {
                    print('Error parsing session participant JSON: $e');
                    print('JSON data: $json');
                    throw Exception('Failed to parse session participant: $e');
                  }
                } else {
                  print('Invalid session participant data type: ${json.runtimeType}');
                  print('Data: $json');
                  throw Exception(
                    'Invalid session participant data format: expected Map<String, dynamic>, got ${json.runtimeType}',
                  );
                }
              })
              .cast<Participant>()
              .toList();
        }
      }

      throw Exception('Failed to load session participants');
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
