// Environment Configuration
// 
// This file contains environment-specific configurations.
// Switch between development and production by commenting/uncommenting the appropriate lines.

/// Environment configuration for API and server settings
class EnvConfig {
  EnvConfig._();

  // ============================================================
  // DEVELOPMENT CONFIGURATION
  // ============================================================
  // Use your local machine's IP address when testing on physical devices
  // Make sure your phone and computer are on the same WiFi network
  
  /// Development server IP (your computer's local IP address)
  static const String serverIp = '192.168.100.4:3000';
  
  // ============================================================
  // PRODUCTION CONFIGURATION  
  // ============================================================
  // Uncomment the line below and comment out the development IP above
  // when deploying to production
  
  // static const String serverIp = 'your-production-domain.com';
  
  // ============================================================
  // API CONFIGURATION
  // ============================================================
  
  /// Full API base URL (constructed from server IP)
  static String get apiBaseUrl => 'http://$serverIp/api/v1';
  
  /// WebSocket URL for real-time updates
  static String get webSocketUrl => 'http://$serverIp';
  
  /// Whether we're in debug mode (for logging, etc.)
  static const bool isDebugMode = true;
  
  // For production, set to false:
  // static const bool isDebugMode = false;
}
