import '../config/api_config.dart';
import 'api_service.dart';

/// Health check service
class HealthService {
  final ApiService _api;

  HealthService(this._api);

  /// Check if server is reachable
  Future<bool> isServerReachable() async {
    try {
      await _api.get(ApiConfig.healthLive);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get full health status
  Future<Map<String, dynamic>> getHealthStatus() async {
    final response = await _api.get('/health');
    return response.data as Map<String, dynamic>;
  }
}
