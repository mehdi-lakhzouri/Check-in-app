import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/api_config.dart';
import '../models/enums.dart';

/// WebSocket event data classes
class SessionStatusUpdate {
  final String sessionId;
  final String sessionName;
  final SessionStatus previousStatus;
  final SessionStatus newStatus;
  final bool previousIsOpen;
  final bool newIsOpen;
  final String reason;
  final DateTime timestamp;

  SessionStatusUpdate({
    required this.sessionId,
    required this.sessionName,
    required this.previousStatus,
    required this.newStatus,
    required this.previousIsOpen,
    required this.newIsOpen,
    required this.reason,
    required this.timestamp,
  });

  factory SessionStatusUpdate.fromJson(Map<String, dynamic> json) {
    return SessionStatusUpdate(
      sessionId: json['sessionId'] as String,
      sessionName: json['sessionName'] as String,
      previousStatus:
          SessionStatus.fromString(json['previousStatus'] as String),
      newStatus: SessionStatus.fromString(json['newStatus'] as String),
      previousIsOpen: json['previousIsOpen'] as bool? ?? false,
      newIsOpen: json['newIsOpen'] as bool? ?? false,
      reason: json['reason'] as String? ?? 'manual',
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }
}

class CheckInUpdate {
  final String sessionId;
  final String participantId;
  final String participantName;
  final String sessionName;
  final DateTime timestamp;
  final bool isLate;

  CheckInUpdate({
    required this.sessionId,
    required this.participantId,
    required this.participantName,
    required this.sessionName,
    required this.timestamp,
    required this.isLate,
  });

  factory CheckInUpdate.fromJson(Map<String, dynamic> json) {
    return CheckInUpdate(
      sessionId: json['sessionId'] as String,
      participantId: json['participantId'] as String,
      participantName: json['participantName'] as String,
      sessionName: json['sessionName'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      isLate: json['isLate'] as bool? ?? false,
    );
  }
}

class CapacityUpdate {
  final String sessionId;
  final String sessionName;
  final int checkInsCount;
  final int capacity;
  final double percentFull;
  final bool isNearCapacity;
  final bool isAtCapacity;

  CapacityUpdate({
    required this.sessionId,
    required this.sessionName,
    required this.checkInsCount,
    required this.capacity,
    required this.percentFull,
    required this.isNearCapacity,
    required this.isAtCapacity,
  });

  factory CapacityUpdate.fromJson(Map<String, dynamic> json) {
    return CapacityUpdate(
      sessionId: json['sessionId'] as String,
      sessionName: json['sessionName'] as String? ?? '',
      checkInsCount: (json['checkInsCount'] as num?)?.toInt() ?? 0,
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      percentFull: (json['percentFull'] as num?)?.toDouble() ?? 0.0,
      isNearCapacity: json['isNearCapacity'] as bool? ?? false,
      isAtCapacity: json['isAtCapacity'] as bool? ?? false,
    );
  }
}

/// WebSocket Service for real-time updates
class SocketService {
  io.Socket? _socket;
  final String baseUrl;
  bool _isConnected = false;

  // Callbacks
  void Function(bool)? onConnectionChange;
  void Function(SessionStatusUpdate)? onSessionStatusUpdate;
  void Function(CheckInUpdate)? onCheckInUpdate;
  void Function(CapacityUpdate)? onCapacityUpdate;

  SocketService(this.baseUrl);

  bool get isConnected => _isConnected;

  /// Connect to WebSocket server
  void connect() {
    if (_socket != null) return;

    final wsUrl = ApiConfig.getWebSocketUrl(baseUrl);
    debugPrint('Connecting to WebSocket: $wsUrl/realtime');

    _socket = io.io(
      '$wsUrl/realtime',
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('WebSocket connected');
      _isConnected = true;
      onConnectionChange?.call(true);
      _subscribeToSessions();
    });

    _socket!.onDisconnect((_) {
      debugPrint('WebSocket disconnected');
      _isConnected = false;
      onConnectionChange?.call(false);
    });

    _socket!.onConnectError((data) {
      debugPrint('WebSocket connection error: $data');
      _isConnected = false;
      onConnectionChange?.call(false);
    });

    _socket!.on('sessions:status-update', (data) {
      debugPrint('Received sessions:status-update');
      try {
        final updateData = data['data'] as Map<String, dynamic>;
        final update = SessionStatusUpdate.fromJson(updateData);
        onSessionStatusUpdate?.call(update);
      } catch (e) {
        debugPrint('Error parsing status update: $e');
      }
    });

    _socket!.on('sessions:checkin', (data) {
      debugPrint('Received sessions:checkin');
      try {
        final updateData = data['data'] as Map<String, dynamic>;
        final update = CheckInUpdate.fromJson(updateData);
        onCheckInUpdate?.call(update);
      } catch (e) {
        debugPrint('Error parsing checkin update: $e');
      }
    });

    _socket!.on('sessions:capacity-update', (data) {
      debugPrint('Received sessions:capacity-update');
      try {
        final updateData = data['data'] as Map<String, dynamic>;
        final update = CapacityUpdate.fromJson(updateData);
        onCapacityUpdate?.call(update);
      } catch (e) {
        debugPrint('Error parsing capacity update: $e');
      }
    });

    // Also listen for global sessionStatusUpdated event
    _socket!.on('sessionStatusUpdated', (data) {
      debugPrint('Received sessionStatusUpdated (global)');
      try {
        final update = SessionStatusUpdate.fromJson(data as Map<String, dynamic>);
        onSessionStatusUpdate?.call(update);
      } catch (e) {
        debugPrint('Error parsing global status update: $e');
      }
    });
  }

  /// Subscribe to sessions updates
  void _subscribeToSessions() {
    _socket?.emit('subscribe:sessions');
    debugPrint('Subscribed to sessions');
  }

  /// Disconnect from WebSocket
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  /// Reconnect to WebSocket
  void reconnect() {
    disconnect();
    connect();
  }
}
