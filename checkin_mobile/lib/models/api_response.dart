/// API response wrapper
class ApiResponse<T> {
  final String status;
  final String message;
  final T? data;
  final ApiMeta? meta;

  const ApiResponse({
    required this.status,
    required this.message,
    this.data,
    this.meta,
  });

  bool get isSuccess => status == 'success';
  bool get isError => status == 'error';

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic) fromJsonT,
  ) {
    return ApiResponse(
      status: json['status'] as String,
      message: json['message'] as String,
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      meta: json['meta'] != null
          ? ApiMeta.fromJson(json['meta'] as Map<String, dynamic>)
          : null,
    );
  }

  /// Factory for list responses
  static ApiResponse<List<T>> fromJsonList<T>(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    final dataList = json['data'] as List<dynamic>?;
    return ApiResponse(
      status: json['status'] as String,
      message: json['message'] as String,
      data: dataList?.map((e) => fromJsonT(e as Map<String, dynamic>)).toList(),
      meta: json['meta'] != null
          ? ApiMeta.fromJson(json['meta'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// API pagination metadata
class ApiMeta {
  final int total;
  final int page;
  final int limit;
  final int pages;
  final bool hasNextPage;
  final bool hasPrevPage;

  const ApiMeta({
    this.total = 0,
    this.page = 1,
    this.limit = 20,
    this.pages = 1,
    this.hasNextPage = false,
    this.hasPrevPage = false,
  });

  factory ApiMeta.fromJson(Map<String, dynamic> json) {
    return ApiMeta(
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      // Backend uses 'totalPages', fallback to 'pages'
      pages: (json['totalPages'] as num?)?.toInt() ?? 
             (json['pages'] as num?)?.toInt() ?? 1,
      hasNextPage: json['hasNextPage'] as bool? ?? false,
      hasPrevPage: json['hasPrevPage'] as bool? ?? false,
    );
  }

  bool get hasMore => hasNextPage || page < pages;
}

/// API error response
class ApiError implements Exception {
  final String message;
  final int? statusCode;
  final String? details;

  const ApiError({
    required this.message,
    this.statusCode,
    this.details,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      message: json['message'] as String? ?? 'Unknown error',
      statusCode: json['statusCode'] as int?,
      details: json['error'] as String?,
    );
  }

  @override
  String toString() => message;

  /// Get user-friendly error message
  String get userMessage {
    if (message.contains('already checked in')) {
      return 'Already Checked In';
    } else if (message.contains('not open')) {
      return 'Session Not Open';
    } else if (message.contains('at capacity')) {
      return 'Session at Capacity';
    } else if (message.contains('not registered')) {
      return 'Not Registered for Session';
    } else if (message.contains('not found')) {
      return 'Not Found';
    } else if (statusCode == 429) {
      return 'Too Many Requests';
    }
    return message;
  }

  /// Check if error is a duplicate check-in
  bool get isDuplicate => message.contains('already checked in');
}
