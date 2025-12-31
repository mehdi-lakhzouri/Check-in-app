import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/participant_manual.dart';
import '../models/check_in_manual.dart';
import '../services/participant_service.dart';

// Parameter class for session attendees provider
class SessionAttendeesParams {
  final String sessionId;
  final bool isOpen;

  SessionAttendeesParams({
    required this.sessionId,
    required this.isOpen,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionAttendeesParams &&
          runtimeType == other.runtimeType &&
          sessionId == other.sessionId &&
          isOpen == other.isOpen;

  @override
  int get hashCode => sessionId.hashCode ^ isOpen.hashCode;
}

// Provider for all participants
final participantsProvider = FutureProvider<List<Participant>>((ref) async {
  final service = ref.watch(participantServiceProvider);
  return service.getAllParticipants();
});

// Provider for session check-ins
final sessionCheckinsProvider = FutureProvider.family<List<CheckIn>, String>((
  ref,
  sessionId,
) async {
  final service = ref.watch(participantServiceProvider);
  return service.getSessionCheckins(sessionId);
});

// Provider for session-specific participants (assigned attendees)
final sessionParticipantsProvider = FutureProvider.family<List<Participant>, String>((
  ref,
  sessionId,
) async {
  print('sessionParticipantsProvider: Fetching participants for session $sessionId');
  final service = ref.watch(participantServiceProvider);
  final participants = await service.getSessionParticipants(sessionId);
  print('sessionParticipantsProvider: Got ${participants.length} participants for session $sessionId');
  return participants;
});

// Provider for combined participant and check-in data for a session
// This provider now accepts both sessionId and isOpen to determine which participants to show
final sessionAttendeesProvider =
    FutureProvider.family<SessionAttendeeData, SessionAttendeesParams>((ref, params) async {
      print('sessionAttendeesProvider: Fetching data for session ${params.sessionId}, isOpen: ${params.isOpen}');
      final participantsAsync = params.isOpen 
          ? ref.watch(participantsProvider)
          : ref.watch(sessionParticipantsProvider(params.sessionId));
      final checkinsAsync = ref.watch(sessionCheckinsProvider(params.sessionId));

      final participants = await participantsAsync.when(
        data: (List<Participant> data) => Future.value(data),
        loading: () => Future.value(<Participant>[]),
        error: (error, stack) =>
            Future.error(Exception('Failed to load participants: $error')),
      );

      final checkins = await checkinsAsync.when(
        data: (List<CheckIn> data) => Future.value(data),
        loading: () => Future.value(<CheckIn>[]),
        error: (error, stack) =>
            Future.error(Exception('Failed to load check-ins: $error')),
      );

      // Create a set of checked-in participant IDs for quick lookup
      final checkedInIds = checkins
          .map((checkin) => checkin.participantId)
          .toSet();

      // Separate checked-in and not checked-in participants
      final List<Participant> checkedInParticipants = [];
      final List<Participant> notCheckedInParticipants = [];

      for (final participant in participants) {
        try {
          if (checkedInIds.contains(participant.id)) {
            checkedInParticipants.add(participant);
          } else {
            notCheckedInParticipants.add(participant);
          }
        } catch (e) {
          print('Error processing participant ${participant.id}: $e');
          // Skip this participant if there's an error
          continue;
        }
      }

      return SessionAttendeeData(
        allParticipants: participants,
        checkedInParticipants: checkedInParticipants,
        notCheckedInParticipants: notCheckedInParticipants,
        checkins: checkins,
      );
    });

// Data class for session attendee information
class SessionAttendeeData {
  final List<Participant> allParticipants;
  final List<Participant> checkedInParticipants;
  final List<Participant> notCheckedInParticipants;
  final List<CheckIn> checkins;

  SessionAttendeeData({
    required this.allParticipants,
    required this.checkedInParticipants,
    required this.notCheckedInParticipants,
    required this.checkins,
  });

  int get totalParticipants => allParticipants.length;
  int get checkedInCount => checkedInParticipants.length;
  int get notCheckedInCount => notCheckedInParticipants.length;
  double get attendanceRate =>
      totalParticipants > 0 ? checkedInCount / totalParticipants : 0.0;
}
