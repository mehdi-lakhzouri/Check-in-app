class ApiConfig {
  // static const String baseUrl = 'http://10.0.2.2:3001/api/v1';  // For Android emulator
  static const String baseUrl =
      'http://192.168.100.4:3001/api/v1'; // For physical device / emulator on same network
  // static const String baseUrl =
  //     'https://iastam-checkin.onrender.com/api/v1'; // Production

  // Endpoints
  static const String sessions = '/sessions';
  static const String participants = '/participants';
  static const String registrations = '/registrations';
  static const String checkin = '/checkin';
  static const String checkinQr = '/checkin/qr';

  // Session-specific endpoints
  static String sessionParticipants(String sessionId) =>
      '$sessions/$sessionId/participants';
  
  static String sessionCheckins(String sessionId) =>
      '$sessions/$sessionId/checkins';
}
