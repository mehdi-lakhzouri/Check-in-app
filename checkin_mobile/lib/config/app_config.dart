/// App-wide configuration constants
class AppConfig {
  /// App name
  static const String appName = 'Officer Check-In';
  
  /// App version
  static const String version = '1.0.0';
  
  /// QR code prefix
  static const String qrCodePrefix = 'QR-';
  
  /// Minimum search query length
  static const int minSearchLength = 2;
  
  /// Search debounce duration
  static const Duration searchDebounce = Duration(milliseconds: 300);
  
  /// Auto-refresh interval for sessions
  static const Duration sessionsRefreshInterval = Duration(seconds: 30);
  
  /// Shared preferences keys
  static const String keyServerUrl = 'server_url';
  static const String keyOfficerName = 'officer_name';
  static const String keyDarkMode = 'dark_mode';
  
  // Aliases for settings provider
  static const String serverIpKey = keyServerUrl;
  static const String officerNameKey = keyOfficerName;
  static const String darkModeKey = keyDarkMode;
}
