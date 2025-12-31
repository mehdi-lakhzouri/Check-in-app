class ApiResponse<T> {
  final String status;
  final String message;
  final T? data;
  final List<Map<String, dynamic>>? errors;

  const ApiResponse({
    required this.status,
    required this.message,
    this.data,
    this.errors,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) {
    return ApiResponse<T>(
      status: json['status'] as String,
      message: json['message'] as String,
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      errors: json['errors'] != null
          ? (json['errors'] as List)
                .map((e) => Map<String, dynamic>.from(e))
                .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson(Map<String, dynamic> Function(T) toJsonT) {
    return {
      'status': status,
      'message': message,
      'data': data != null ? toJsonT(data as T) : null,
      'errors': errors,
    };
  }

  @override
  String toString() {
    return 'ApiResponse(status: $status, message: $message, data: $data, errors: $errors)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is ApiResponse<T> &&
            other.status == status &&
            other.message == message &&
            other.data == data &&
            other.errors == errors;
  }

  @override
  int get hashCode => Object.hash(status, message, data, errors);
}
