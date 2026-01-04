import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'settings_provider.dart';

/// Services Providers
/// 
/// Using .select() to only watch the apiBaseUrl property prevents unnecessary
/// rebuilds when other settings (officerName, isDarkMode) change.
final apiServiceProvider = Provider<ApiService>((ref) {
  final apiBaseUrl = ref.watch(settingsProvider.select((s) => s.apiBaseUrl));
  return ApiService(apiBaseUrl);
});

final sessionServiceProvider = Provider<SessionService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return SessionService(api);
});

final checkInServiceProvider = Provider<CheckInService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return CheckInService(api);
});

final participantServiceProvider = Provider<ParticipantService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return ParticipantService(api);
});

final healthServiceProvider = Provider<HealthService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return HealthService(api);
});

/// Socket Service Provider
/// 
/// Using .select() to only watch the apiBaseUrl property prevents unnecessary
/// rebuilds when other settings (officerName, isDarkMode) change.
final socketServiceProvider = Provider<SocketService>((ref) {
  final apiBaseUrl = ref.watch(settingsProvider.select((s) => s.apiBaseUrl));
  final socket = SocketService(apiBaseUrl);
  
  ref.onDispose(() {
    socket.disconnect();
  });
  
  return socket;
});

/// Sessions State
class SessionsState {
  final List<Session> sessions;
  final bool isLoading;
  final String? error;
  final ApiMeta? meta;
  final String searchQuery;

  const SessionsState({
    this.sessions = const [],
    this.isLoading = false,
    this.error,
    this.meta,
    this.searchQuery = '',
  });

  SessionsState copyWith({
    List<Session>? sessions,
    bool? isLoading,
    String? error,
    ApiMeta? meta,
    String? searchQuery,
  }) {
    return SessionsState(
      sessions: sessions ?? this.sessions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      meta: meta ?? this.meta,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }

  /// Get open sessions
  List<Session> get openSessions =>
      sessions.where((s) => s.isOpen).toList();

  /// Get sessions by status
  List<Session> sessionsByStatus(SessionStatus status) =>
      sessions.where((s) => s.status == status).toList();
}

/// Sessions Notifier
class SessionsNotifier extends StateNotifier<SessionsState> {
  final SessionService _sessionService;
  final SocketService _socketService;

  SessionsNotifier(this._sessionService, this._socketService)
      : super(const SessionsState()) {
    _setupSocketListeners();
  }

  void _setupSocketListeners() {
    _socketService.onSessionStatusUpdate = (update) {
      // Update session in list when status changes
      final updatedSessions = state.sessions.map((session) {
        if (session.id == update.sessionId) {
          return session.copyWith(
            status: update.newStatus,
            isOpen: update.newIsOpen,
          );
        }
        return session;
      }).toList();
      state = state.copyWith(sessions: updatedSessions);
    };

    _socketService.onCapacityUpdate = (update) {
      // Update session capacity info
      final updatedSessions = state.sessions.map((session) {
        if (session.id == update.sessionId) {
          return session.copyWith(
            checkInsCount: update.checkInsCount,
          );
        }
        return session;
      }).toList();
      state = state.copyWith(sessions: updatedSessions);
    };
  }

  /// Load sessions
  Future<void> loadSessions({
    int page = 1,
    int limit = 20,
    bool? isOpen,
    int? day,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _sessionService.getSessions(
        page: page,
        limit: limit,
        search: state.searchQuery.isNotEmpty ? state.searchQuery : null,
        isOpen: isOpen,
        day: day,
      );

      state = state.copyWith(
        sessions: response.data,
        meta: response.meta,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e is ApiError ? e.userMessage : e.toString(),
      );
    }
  }

  /// Search sessions
  Future<void> searchSessions(String query) async {
    state = state.copyWith(searchQuery: query);
    await loadSessions();
  }

  /// Refresh sessions
  Future<void> refresh() async {
    await loadSessions();
  }

  /// Update single session
  void updateSession(Session session) {
    final updatedSessions = state.sessions.map((s) {
      return s.id == session.id ? session : s;
    }).toList();
    state = state.copyWith(sessions: updatedSessions);
  }

  /// Refresh a single session from API and update in list
  Future<Session?> refreshSession(String sessionId) async {
    try {
      final session = await _sessionService.getSession(sessionId);
      updateSession(session);
      return session;
    } catch (e) {
      // Silently fail - the old session will be used
      return null;
    }
  }
}

/// Sessions Provider
final sessionsProvider =
    StateNotifierProvider<SessionsNotifier, SessionsState>((ref) {
  final sessionService = ref.watch(sessionServiceProvider);
  final socketService = ref.watch(socketServiceProvider);
  return SessionsNotifier(sessionService, socketService);
});

/// Selected Session Provider
final selectedSessionProvider = StateProvider<Session?>((ref) => null);

/// Session Details Provider - fetches full session with check-ins
final sessionDetailsProvider =
    FutureProvider.family<Session, String>((ref, sessionId) async {
  final sessionService = ref.watch(sessionServiceProvider);
  return sessionService.getSession(sessionId);
});

/// Session Check-ins Provider
final sessionCheckInsProvider =
    FutureProvider.family<List<CheckIn>, String>((ref, sessionId) async {
  final sessionService = ref.watch(sessionServiceProvider);
  return sessionService.getSessionCheckIns(sessionId);
});

/// Session Stats Provider
final sessionStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final sessionService = ref.watch(sessionServiceProvider);
  return sessionService.getStats();
});
