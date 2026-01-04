import 'package:logger/logger.dart';
import '../config/env_config.dart';

/// Application Logger with structured logging
/// 
/// Provides consistent logging across the app with different log levels
/// and automatic filtering based on debug mode.
class AppLogger {
  static final AppLogger _instance = AppLogger._internal();
  factory AppLogger() => _instance;
  
  late final Logger _logger;
  
  AppLogger._internal() {
    _logger = Logger(
      printer: PrettyPrinter(
        methodCount: 2,
        errorMethodCount: 8,
        lineLength: 120,
        colors: true,
        printEmojis: true,
        dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
      ),
      level: EnvConfig.isDebugMode ? Level.trace : Level.warning,
      filter: _AppLogFilter(),
    );
  }

  /// Log verbose/trace messages
  void t(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.t(message, error: error, stackTrace: stackTrace);
  }

  /// Log debug messages
  void d(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.d(message, error: error, stackTrace: stackTrace);
  }

  /// Log info messages
  void i(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.i(message, error: error, stackTrace: stackTrace);
  }

  /// Log warning messages
  void w(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.w(message, error: error, stackTrace: stackTrace);
  }

  /// Log error messages
  void e(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.e(message, error: error, stackTrace: stackTrace);
  }

  /// Log fatal/critical errors
  void f(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.f(message, error: error, stackTrace: stackTrace);
  }

  /// Log API request
  void apiRequest(String method, String path, [Map<String, dynamic>? data]) {
    _logger.d('📤 API $method $path${data != null ? '\n$data' : ''}');
  }

  /// Log API response
  void apiResponse(String method, String path, int statusCode, [dynamic data]) {
    if (statusCode >= 200 && statusCode < 300) {
      _logger.d('📥 API $method $path - $statusCode');
    } else {
      _logger.w('📥 API $method $path - $statusCode\n$data');
    }
  }

  /// Log API error
  void apiError(String method, String path, dynamic error) {
    _logger.e('❌ API $method $path failed', error: error);
  }

  /// Log check-in event
  void checkIn(String participantName, String sessionName, bool success) {
    if (success) {
      _logger.i('✅ Check-in: $participantName → $sessionName');
    } else {
      _logger.w('❌ Check-in failed: $participantName → $sessionName');
    }
  }

  /// Log socket event
  void socket(String event, [dynamic data]) {
    _logger.d('🔌 Socket: $event${data != null ? '\n$data' : ''}');
  }

  /// Log navigation
  void navigation(String from, String to) {
    _logger.t('🧭 Navigate: $from → $to');
  }
}

/// Custom log filter that respects debug mode
class _AppLogFilter extends LogFilter {
  @override
  bool shouldLog(LogEvent event) {
    if (!EnvConfig.isDebugMode) {
      // In production, only log warnings and above
      return event.level.index >= Level.warning.index;
    }
    // In debug, log everything
    return true;
  }
}

/// Global logger instance
final log = AppLogger();
