import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(milliseconds: 10000), // Increased timeout
      receiveTimeout: const Duration(milliseconds: 10000), // Increased timeout
      sendTimeout: const Duration(milliseconds: 10000), // Added send timeout
      headers: {'Content-Type': 'application/json'},
    ),
  );

  // Add request/response interceptors for logging
  dio.interceptors.add(
    LogInterceptor(
      requestBody: true,
      responseBody: true,
      logPrint: (object) => print(object),
    ),
  );

  return dio;
});
