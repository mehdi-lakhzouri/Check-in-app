import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/check_in_manual.dart';
import '../services/checkin_service.dart';
import 'participant_provider.dart';
import 'session_provider.dart';

final checkinProvider = StateNotifierProvider<CheckinNotifier, CheckinState>((
  ref,
) {
  final checkinService = ref.watch(checkinServiceProvider);
  return CheckinNotifier(checkinService, ref);
});

class CheckinState {
  final bool isLoading;
  final CheckIn? lastCheckin;
  final String? error;

  const CheckinState({this.isLoading = false, this.lastCheckin, this.error});

  CheckinState copyWith({
    bool? isLoading,
    CheckIn? lastCheckin,
    String? error,
    bool clearLastCheckin = false,
    bool clearError = false,
  }) {
    return CheckinState(
      isLoading: isLoading ?? this.isLoading,
      lastCheckin: clearLastCheckin ? null : (lastCheckin ?? this.lastCheckin),
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class CheckinNotifier extends StateNotifier<CheckinState> {
  final CheckinService _checkinService;
  final Ref _ref;

  CheckinNotifier(this._checkinService, this._ref) : super(const CheckinState());

  Future<void> checkinWithQr(String qrCode, String sessionId) async {
    print('=== CHECKIN PROVIDER: checkinWithQr called ===');
    print('=== QR Code: $qrCode, Session ID: $sessionId ===');
    
    state = state.copyWith(isLoading: true, error: null);
    print('=== State set to loading ===');

    try {
      print('=== Calling checkinService.checkinWithQr... ===');
      final checkin = await _checkinService.checkinWithQr(qrCode, sessionId);
      print('=== Check-in successful: ${checkin.id} ===');
      state = state.copyWith(isLoading: false, lastCheckin: checkin);
      
      // Refresh the participant data after successful check-in
      _refreshParticipantData(sessionId);
    } catch (e) {
      print('=== CHECKIN PROVIDER ERROR: $e ===');
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> checkin(String participantId, String sessionId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final checkin = await _checkinService.checkin(participantId, sessionId);
      state = state.copyWith(isLoading: false, lastCheckin: checkin);
      
      // Refresh the participant data after successful check-in
      _refreshParticipantData(sessionId);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  void clearLastCheckin() {
    state = state.copyWith(clearLastCheckin: true);
  }

  void clearAll() {
    state = state.copyWith(
      clearError: true,
      clearLastCheckin: true,
      isLoading: false,
    );
  }

  void resetToInitialState() {
    state = const CheckinState();
  }

  void _refreshParticipantData(String sessionId) {
    // Invalidate the session-specific providers to force refresh
    _ref.invalidate(sessionCheckinsProvider(sessionId));
    _ref.invalidate(sessionParticipantsProvider(sessionId));
    _ref.invalidate(participantsProvider);
    _ref.invalidate(sessionsProvider);
    _ref.invalidate(sessionProvider(sessionId));
    
    // Note: sessionAttendeesProvider will be invalidated when screens refresh
    // since it depends on the session's isOpen status which we don't have here
  }
}
