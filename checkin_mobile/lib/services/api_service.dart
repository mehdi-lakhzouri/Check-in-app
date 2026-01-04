import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../models/api_response.dart';

/// HTTP API Service using Dio with request deduplication
class ApiService {
  late final Dio _dio;
  final String baseUrl;
  
  /// Map to track pending GET requests for deduplication.
  /// Key: request URL with query params, Value: Future of the response
  final Map<String, Future<Response<dynamic>>> _pendingGetRequests = {};

  ApiService(this.baseUrl) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add logging interceptor for debug
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
    ));
  }

  /// Update base URL
  void updateBaseUrl(String newBaseUrl) {
    _dio.options.baseUrl = newBaseUrl;
  }
  
  /// Generate a unique key for request deduplication
  String _getRequestKey(String path, Map<String, dynamic>? queryParameters) {
    if (queryParameters == null || queryParameters.isEmpty) {
      return path;
    }
    final sortedParams = queryParameters.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    final queryString = sortedParams
        .map((e) => '${e.key}=${e.value}')
        .join('&');
    return '$path?$queryString';
  }

  /// GET request with deduplication
  /// 
  /// Concurrent requests to the same endpoint with the same parameters
  /// will share the same Future, preventing duplicate network calls.
  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final requestKey = _getRequestKey(path, queryParameters);
    
    // Check if there's already a pending request for this URL
    final pendingRequest = _pendingGetRequests[requestKey];
    if (pendingRequest != null) {
      return pendingRequest;
    }
    
    // Create new request and store it
    final Future<Response<dynamic>> request = _executeGet(path, queryParameters);
    _pendingGetRequests[requestKey] = request;
    
    try {
      final response = await request;
      return response;
    } finally {
      // Remove from pending requests when complete
      _pendingGetRequests.remove(requestKey);
    }
  }
  
  /// Internal method to execute GET request
  Future<Response<dynamic>> _executeGet(
    String path,
    Map<String, dynamic>? queryParameters,
  ) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// POST request
  Future<Response<dynamic>> post(
    String path, {
    dynamic data,
  }) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// DELETE request
  Future<Response<dynamic>> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Handle Dio errors
  ApiError _handleError(DioException e) {
    if (e.response?.data != null && e.response?.data is Map) {
      return ApiError.fromJson(e.response!.data as Map<String, dynamic>);
    }

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiError(
          message: 'Connection timeout. Please check your network.',
        );
      case DioExceptionType.connectionError:
        return const ApiError(
          message: 'Unable to connect to server. Please check your network.',
        );
      case DioExceptionType.badResponse:
        return ApiError(
          message: e.response?.statusMessage ?? 'Server error',
          statusCode: e.response?.statusCode,
        );
      default:
        return ApiError(
          message: e.message ?? 'An unexpected error occurred',
        );
    }
  }
}
