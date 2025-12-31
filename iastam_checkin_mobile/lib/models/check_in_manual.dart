import 'participant_manual.dart';
import 'session_manual.dart';

class CheckIn {
  final String id;
  final String participantId;
  final String sessionId;
  final DateTime checkInTime;
  final String status;
  final Participant? participant;
  final Session? session;

  CheckIn({
    required this.id,
    required this.participantId,
    required this.sessionId,
    required this.checkInTime,
    this.status = 'present',
    this.participant,
    this.session,
  });

  factory CheckIn.fromJson(Map<String, dynamic> json) {
    return CheckIn(
      id: json['_id'] ?? json['id'] ?? '',
      participantId: json['participantId'] is String
          ? json['participantId']
          : json['participantId']['_id'] ?? '',
      sessionId: json['sessionId'] is String
          ? json['sessionId']
          : json['sessionId']['_id'] ?? '',
      checkInTime: DateTime.parse(json['checkInTime']),
      status: json['status'] ?? 'present',
      participant: json['participantId'] is Map<String, dynamic>
          ? Participant.fromJson(json['participantId'])
          : null,
      session: json['sessionId'] is Map<String, dynamic>
          ? Session.fromJson(json['sessionId'])
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'participantId': participantId,
    'sessionId': sessionId,
    'checkInTime': checkInTime.toIso8601String(),
    'status': status,
  };
}

class CheckInRequest {
  final String participantId;
  final String sessionId;

  CheckInRequest({required this.participantId, required this.sessionId});

  factory CheckInRequest.fromJson(Map<String, dynamic> json) => CheckInRequest(
    participantId: json['participantId'],
    sessionId: json['sessionId'],
  );

  Map<String, dynamic> toJson() => {
    'participantId': participantId,
    'sessionId': sessionId,
  };
}

class CheckInQrRequest {
  final String qrCode;
  final String sessionId;

  CheckInQrRequest({required this.qrCode, required this.sessionId});

  factory CheckInQrRequest.fromJson(Map<String, dynamic> json) =>
      CheckInQrRequest(qrCode: json['qrCode'], sessionId: json['sessionId']);

  Map<String, dynamic> toJson() => {'qrCode': qrCode, 'sessionId': sessionId};
}
