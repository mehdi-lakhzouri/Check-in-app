import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/services.dart';
import 'sessions_provider.dart';

/// Connection State
class ConnectionState {
  final bool isConnected;
  final bool isConnecting;
  final String? error;

  const ConnectionState({
    this.isConnected = false,
    this.isConnecting = false,
    this.error,
  });

  ConnectionState copyWith({
    bool? isConnected,
    bool? isConnecting,
    String? error,
  }) {
    return ConnectionState(
      isConnected: isConnected ?? this.isConnected,
      isConnecting: isConnecting ?? this.isConnecting,
      error: error,
    );
  }
}

/// Connection Notifier
class ConnectionNotifier extends StateNotifier<ConnectionState> {
  final SocketService _socketService;
  final HealthService _healthService;

  ConnectionNotifier(this._socketService, this._healthService)
      : super(const ConnectionState()) {
    _setupSocketListeners();
  }

  void _setupSocketListeners() {
    _socketService.onConnectionChange = (connected) {
      state = state.copyWith(
        isConnected: connected,
        isConnecting: false,
      );
    };
  }

  /// Connect to server
  Future<void> connect() async {
    state = state.copyWith(isConnecting: true, error: null);

    // First check HTTP health
    final isReachable = await _healthService.isServerReachable();
    if (!isReachable) {
      state = state.copyWith(
        isConnecting: false,
        error: 'Server is not reachable',
      );
      return;
    }

    // Then connect WebSocket
    _socketService.connect();
  }

  /// Disconnect from server
  void disconnect() {
    _socketService.disconnect();
    state = state.copyWith(isConnected: false);
  }

  /// Reconnect
  Future<void> reconnect() async {
    _socketService.disconnect();
    await connect();
  }
}

/// Connection Provider
final connectionProvider =
    StateNotifierProvider<ConnectionNotifier, ConnectionState>((ref) {
  final socketService = ref.watch(socketServiceProvider);
  final healthService = ref.watch(healthServiceProvider);
  return ConnectionNotifier(socketService, healthService);
});
