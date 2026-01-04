import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'sessions_provider.dart';
import 'settings_provider.dart';

/// Verification State for QR scan workflow
class VerificationState {
  final bool isVerifying;
  final VerificationResult? result;
  final String? error;

  const VerificationState({
    this.isVerifying = false,
    this.result,
    this.error,
  });

  VerificationState copyWith({
    bool? isVerifying,
    VerificationResult? result,
    String? error,
    bool clearResult = false,
  }) {
    return VerificationState(
      isVerifying: isVerifying ?? this.isVerifying,
      result: clearResult ? null : (result ?? this.result),
      error: error,
    );
  }

  bool get hasResult => result != null;
  bool get canAccept => result?.canAccept ?? false;
  bool get canDecline => result?.canDecline ?? false;
}

/// Check-in State
class CheckInState {
  final bool isProcessing;
  final CheckInResult? lastResult;
  final AcceptCheckInResult? lastAcceptResult;
  final DeclineCheckInResult? lastDeclineResult;
  final String? error;
  final List<CheckIn> recentCheckIns;
  final VerificationState verification;

  const CheckInState({
    this.isProcessing = false,
    this.lastResult,
    this.lastAcceptResult,
    this.lastDeclineResult,
    this.error,
    this.recentCheckIns = const [],
    this.verification = const VerificationState(),
  });

  CheckInState copyWith({
    bool? isProcessing,
    CheckInResult? lastResult,
    AcceptCheckInResult? lastAcceptResult,
    DeclineCheckInResult? lastDeclineResult,
    String? error,
    List<CheckIn>? recentCheckIns,
    VerificationState? verification,
    bool clearResults = false,
  }) {
    return CheckInState(
      isProcessing: isProcessing ?? this.isProcessing,
      lastResult: clearResults ? null : (lastResult ?? this.lastResult),
      lastAcceptResult: clearResults ? null : (lastAcceptResult ?? this.lastAcceptResult),
      lastDeclineResult: clearResults ? null : (lastDeclineResult ?? this.lastDeclineResult),
      error: error,
      recentCheckIns: recentCheckIns ?? this.recentCheckIns,
      verification: verification ?? this.verification,
    );
  }
}

/// Check-in Notifier
class CheckInNotifier extends StateNotifier<CheckInState> {
  final CheckInService _checkInService;
  final Ref _ref;

  CheckInNotifier(this._checkInService, this._ref) : super(const CheckInState());

  /// Verify QR code - first step in verification workflow
  Future<VerificationResult?> verifyQr({
    required String qrCode,
    required String sessionId,
  }) async {
    state = state.copyWith(
      verification: state.verification.copyWith(
        isVerifying: true,
        error: null,
        clearResult: true,
      ),
    );

    try {
      final result = await _checkInService.verifyQr(
        qrCode: qrCode,
        sessionId: sessionId,
      );

      state = state.copyWith(
        verification: state.verification.copyWith(
          isVerifying: false,
          result: result,
        ),
      );

      return result;
    } catch (e) {
      final errorMessage = e is ApiError ? e.userMessage : e.toString();
      state = state.copyWith(
        verification: state.verification.copyWith(
          isVerifying: false,
          error: errorMessage,
        ),
      );
      return null;
    }
  }

  /// Accept check-in after verification
  Future<AcceptCheckInResult?> acceptCheckIn({
    required String participantId,
    required String sessionId,
    String? notes,
  }) async {
    state = state.copyWith(isProcessing: true, error: null);

    try {
      final settings = _ref.read(settingsProvider);
      final result = await _checkInService.acceptCheckIn(
        participantId: participantId,
        sessionId: sessionId,
        acceptedBy: settings.officerName,
        notes: notes,
      );

      state = state.copyWith(
        isProcessing: false,
        lastAcceptResult: result,
        verification: const VerificationState(), // Clear verification
      );

      // Refresh recent check-ins
      await loadRecentCheckIns(sessionId: sessionId);

      return result;
    } catch (e) {
      final errorMessage = e is ApiError ? e.userMessage : e.toString();
      state = state.copyWith(
        isProcessing: false,
        error: errorMessage,
      );
      return null;
    }
  }

  /// Decline check-in after verification
  Future<DeclineCheckInResult?> declineCheckIn({
    required String participantId,
    required String sessionId,
    required String reason,
  }) async {
    state = state.copyWith(isProcessing: true, error: null);

    try {
      final settings = _ref.read(settingsProvider);
      final result = await _checkInService.declineCheckIn(
        participantId: participantId,
        sessionId: sessionId,
        reason: reason,
        declinedBy: settings.officerName,
      );

      state = state.copyWith(
        isProcessing: false,
        lastDeclineResult: result,
        verification: const VerificationState(), // Clear verification
      );

      return result;
    } catch (e) {
      final errorMessage = e is ApiError ? e.userMessage : e.toString();
      state = state.copyWith(
        isProcessing: false,
        error: errorMessage,
      );
      return null;
    }
  }

  /// Process QR code check-in (legacy - direct without verification)
  Future<CheckInResult?> checkInByQr({
    required String qrCode,
    required String sessionId,
  }) async {
    state = state.copyWith(isProcessing: true, error: null);

    try {
      final settings = _ref.read(settingsProvider);
      final result = await _checkInService.checkInByQr(
        qrCode: qrCode,
        sessionId: sessionId,
        checkedInBy: settings.officerName,
      );

      state = state.copyWith(
        isProcessing: false,
        lastResult: result,
      );

      // Refresh recent check-ins
      await loadRecentCheckIns(sessionId: sessionId);

      return result;
    } catch (e) {
      final errorMessage = e is ApiError ? e.userMessage : e.toString();
      state = state.copyWith(
        isProcessing: false,
        error: errorMessage,
      );
      return null;
    }
  }

  /// Process manual check-in
  Future<CheckInResult?> checkInManual({
    required String participantId,
    required String sessionId,
    String? notes,
  }) async {
    state = state.copyWith(isProcessing: true, error: null);

    try {
      final settings = _ref.read(settingsProvider);
      final result = await _checkInService.checkInManual(
        participantId: participantId,
        sessionId: sessionId,
        checkedInBy: settings.officerName,
        notes: notes,
      );

      state = state.copyWith(
        isProcessing: false,
        lastResult: result,
      );

      // Refresh recent check-ins
      await loadRecentCheckIns(sessionId: sessionId);

      return result;
    } catch (e) {
      final errorMessage = e is ApiError ? e.userMessage : e.toString();
      state = state.copyWith(
        isProcessing: false,
        error: errorMessage,
      );
      return null;
    }
  }

  /// Load recent check-ins
  Future<void> loadRecentCheckIns({String? sessionId, int limit = 10}) async {
    try {
      final recent = await _checkInService.getRecentCheckIns(
        limit: limit,
        sessionId: sessionId,
      );
      state = state.copyWith(recentCheckIns: recent);
    } catch (e) {
      // Silently fail - recent check-ins are not critical
      debugPrint('Failed to load recent check-ins: $e');
    }
  }

  /// Undo a check-in
  Future<bool> undoCheckIn(String checkInId) async {
    try {
      await _checkInService.undoCheckIn(checkInId);
      // Remove from recent list
      final updated = state.recentCheckIns
          .where((c) => c.id != checkInId)
          .toList();
      state = state.copyWith(recentCheckIns: updated);
      return true;
    } catch (e) {
      state = state.copyWith(
        error: e is ApiError ? e.userMessage : e.toString(),
      );
      return false;
    }
  }

  /// Clear verification state
  void clearVerification() {
    state = state.copyWith(
      verification: const VerificationState(),
    );
  }

  /// Clear last result
  void clearLastResult() {
    state = state.copyWith(
      lastResult: null,
      lastAcceptResult: null,
      lastDeclineResult: null,
      error: null,
      clearResults: true,
    );
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }

  /// Clear all state
  void clearAll() {
    state = const CheckInState();
  }
}

/// Check-in Provider
final checkInProvider = StateNotifierProvider<CheckInNotifier, CheckInState>((ref) {
  final checkInService = ref.watch(checkInServiceProvider);
  return CheckInNotifier(checkInService, ref);
});

/// Participant Search State
class ParticipantSearchState {
  final List<Participant> results;
  final bool isSearching;
  final String? error;
  final String query;

  const ParticipantSearchState({
    this.results = const [],
    this.isSearching = false,
    this.error,
    this.query = '',
  });

  ParticipantSearchState copyWith({
    List<Participant>? results,
    bool? isSearching,
    String? error,
    String? query,
  }) {
    return ParticipantSearchState(
      results: results ?? this.results,
      isSearching: isSearching ?? this.isSearching,
      error: error,
      query: query ?? this.query,
    );
  }
}

/// Participant Search Notifier
class ParticipantSearchNotifier extends StateNotifier<ParticipantSearchState> {
  final ParticipantService _participantService;

  ParticipantSearchNotifier(this._participantService)
      : super(const ParticipantSearchState());

  /// Search participants
  Future<void> search(String query) async {
    if (query.length < 2) {
      state = state.copyWith(results: [], query: query);
      return;
    }

    state = state.copyWith(isSearching: true, error: null, query: query);

    try {
      final response = await _participantService.searchParticipants(
        query,
        limit: 20,
      );
      state = state.copyWith(
        results: response.data,
        isSearching: false,
      );
    } catch (e) {
      state = state.copyWith(
        isSearching: false,
        error: e is ApiError ? e.userMessage : e.toString(),
      );
    }
  }

  /// Clear search
  void clear() {
    state = const ParticipantSearchState();
  }
}

/// Participant Search Provider
final participantSearchProvider =
    StateNotifierProvider<ParticipantSearchNotifier, ParticipantSearchState>((ref) {
  final participantService = ref.watch(participantServiceProvider);
  return ParticipantSearchNotifier(participantService);
});

