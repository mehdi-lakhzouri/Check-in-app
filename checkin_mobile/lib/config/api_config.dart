/// API Configuration
class ApiConfig {
  /// Default server URL - can be overridden in settings
  static const String defaultBaseUrl = 'http://localhost:3000/api/v1';
  
  /// WebSocket URL path
  static const String realtimePath = '/realtime';
  
  /// Connection timeout
  static const Duration connectTimeout = Duration(seconds: 10);
  
  /// Receive timeout
  static const Duration receiveTimeout = Duration(seconds: 15);
  
  /// API endpoints
  static const String sessions = '/sessions';
  static const String checkin = '/checkin';
  static const String checkinQr = '/checkin/qr';
  static const String checkinVerifyQr = '/checkin/verify-qr';
  static const String checkinAccept = '/checkin/accept';
  static const String checkinDecline = '/checkin/decline';
  static const String participants = '/participants';
  static const String healthLive = '/health/live';
  
  /// Get full WebSocket URL from base URL
  static String getWebSocketUrl(String baseUrl) {
    // Remove /api/v1 suffix if present
    final wsUrl = baseUrl.replaceAll(RegExp(r'/api/v\d+$'), '');
    return wsUrl;
  }
}
