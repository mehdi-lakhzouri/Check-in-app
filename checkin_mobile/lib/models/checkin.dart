import 'enums.dart';
import 'participant.dart';
import 'session.dart';

/// CheckIn model - matches backend CheckIn schema
class CheckIn {
  final String id;
  final dynamic participantId; // String or Participant when populated
  final dynamic sessionId; // String or Session when populated
  final DateTime checkInTime;
  final CheckInMethod method;
  final String? checkedInBy;
  final String? notes;
  final bool isLate;
  final CheckInBadge? badge;
  final bool? wasRegistered;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const CheckIn({
    required this.id,
    required this.participantId,
    required this.sessionId,
    required this.checkInTime,
    this.method = CheckInMethod.manual,
    this.checkedInBy,
    this.notes,
    this.isLate = false,
    this.badge,
    this.wasRegistered,
    this.createdAt,
    this.updatedAt,
  });

  factory CheckIn.fromJson(Map<String, dynamic> json) {
    // Handle populated or non-populated participantId
    final participantData = json['participantId'];
    dynamic participantId;
    if (participantData is Map<String, dynamic>) {
      participantId = Participant.fromJson(participantData);
    } else {
      participantId = participantData as String?;
    }

    // Handle populated or non-populated sessionId
    final sessionData = json['sessionId'];
    dynamic sessionId;
    if (sessionData is Map<String, dynamic>) {
      sessionId = Session.fromJson(sessionData);
    } else {
      sessionId = sessionData as String?;
    }

    return CheckIn(
      id: json['_id'] as String,
      participantId: participantId,
      sessionId: sessionId,
      checkInTime: DateTime.parse(json['checkInTime'] as String),
      method: CheckInMethod.fromString(json['method'] as String? ?? 'manual'),
      checkedInBy: json['checkedInBy'] as String?,
      notes: json['notes'] as String?,
      isLate: json['isLate'] as bool? ?? false,
      badge: json['badge'] != null 
          ? CheckInBadge.fromString(json['badge'] as String) 
          : null,
      wasRegistered: json['wasRegistered'] as bool?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  /// Get participant if populated
  Participant? get participant =>
      participantId is Participant ? participantId as Participant : null;

  /// Get session if populated
  Session? get session =>
      sessionId is Session ? sessionId as Session : null;

  /// Get participant ID string
  String get participantIdString =>
      participantId is Participant
          ? (participantId as Participant).id
          : participantId as String;

  /// Get session ID string
  String get sessionIdString =>
      sessionId is Session ? (sessionId as Session).id : sessionId as String;

  /// Alias for checkInTime
  DateTime get checkedInAt => checkInTime;
}

/// Available actions for verification result
class VerificationActions {
  final bool canAccept;
  final bool canDecline;

  const VerificationActions({
    this.canAccept = false,
    this.canDecline = false,
  });

  factory VerificationActions.fromJson(Map<String, dynamic> json) {
    return VerificationActions(
      canAccept: json['canAccept'] as bool? ?? false,
      canDecline: json['canDecline'] as bool? ?? false,
    );
  }
}

/// Verification result from QR scan
class VerificationResult {
  final String participantId;
  final String sessionId;
  final VerificationBadge badge;
  final Participant? participant;
  final Session? session;
  final VerificationActions actions;
  final String? existingCheckInId;
  final bool isAtCapacity;
  final CapacityInfo? capacityInfo;

  const VerificationResult({
    required this.participantId,
    required this.sessionId,
    required this.badge,
    this.participant,
    this.session,
    required this.actions,
    this.existingCheckInId,
    this.isAtCapacity = false,
    this.capacityInfo,
  });

  factory VerificationResult.fromJson(Map<String, dynamic> json) {
    // Backend returns nested structure: participant._id, session._id, verification.badge
    final participantData = json['participant'] as Map<String, dynamic>?;
    final sessionData = json['session'] as Map<String, dynamic>?;
    final verificationData = json['verification'] as Map<String, dynamic>?;
    final actionsData = json['actions'] as Map<String, dynamic>?;
    final capacityData = json['capacityInfo'] as Map<String, dynamic>?;
    
    // Get participant ID from nested object or direct field
    String participantId;
    if (participantData != null && participantData['_id'] != null) {
      participantId = participantData['_id'] as String;
    } else if (json['participantId'] != null) {
      participantId = json['participantId'] as String;
    } else {
      participantId = '';
    }
    
    // Get session ID from nested object or direct field
    String sessionId;
    if (sessionData != null && sessionData['_id'] != null) {
      sessionId = sessionData['_id'] as String;
    } else if (json['sessionId'] != null) {
      sessionId = json['sessionId'] as String;
    } else {
      sessionId = '';
    }
    
    // Get badge from verification object or direct field
    String badgeStr;
    if (verificationData != null && verificationData['badge'] != null) {
      badgeStr = verificationData['badge'] as String;
    } else if (json['badge'] != null) {
      badgeStr = json['badge'] as String;
    } else {
      badgeStr = 'not_registered';
    }
    
    // Get existingCheckInId from verification object
    String? existingCheckInId;
    if (verificationData != null && verificationData['existingCheckIn'] != null) {
      final existingCheckIn = verificationData['existingCheckIn'] as Map<String, dynamic>;
      existingCheckInId = existingCheckIn['_id'] as String?;
    }
    
    // Get isAtCapacity from verification object or session object
    bool isAtCapacity = false;
    if (verificationData != null && verificationData['isAtCapacity'] != null) {
      isAtCapacity = verificationData['isAtCapacity'] as bool;
    } else if (sessionData != null && sessionData['isAtCapacity'] != null) {
      isAtCapacity = sessionData['isAtCapacity'] as bool;
    }
    
    return VerificationResult(
      participantId: participantId,
      sessionId: sessionId,
      badge: VerificationBadge.fromString(badgeStr),
      participant: participantData != null
          ? _parseParticipantFromVerification(participantData)
          : null,
      session: sessionData != null
          ? _parseSessionFromVerification(sessionData)
          : null,
      actions: actionsData != null
          ? VerificationActions.fromJson(actionsData)
          : const VerificationActions(),
      existingCheckInId: existingCheckInId,
      isAtCapacity: isAtCapacity,
      capacityInfo: capacityData != null
          ? CapacityInfo.fromJson(capacityData)
          : null,
    );
  }
  
  /// Parse participant from verification response (different format than full Participant)
  static Participant? _parseParticipantFromVerification(Map<String, dynamic> json) {
    if (json['_id'] == null) return null;
    return Participant(
      id: json['_id'] as String,
      name: json['name'] as String? ?? 'Unknown',
      email: json['email'] as String? ?? '',
      organization: json['organization'] as String?,
      qrCode: json['qrCode'] as String? ?? '',
    );
  }
  
  /// Parse session from verification response (different format than full Session)
  static Session? _parseSessionFromVerification(Map<String, dynamic> json) {
    if (json['_id'] == null) return null;
    return Session(
      id: json['_id'] as String,
      name: json['name'] as String? ?? 'Unknown',
      isOpen: json['isOpen'] as bool? ?? false,
      requiresRegistration: json['requiresRegistration'] as bool? ?? false,
      capacity: json['capacity'] as int?,
      checkInsCount: 0, // Not provided in verification response
      startTime: DateTime.now(), // Not provided in verification response
      endTime: DateTime.now(),
    );
  }

  bool get canAccept => actions.canAccept && !isAtCapacity;
  bool get canDecline => actions.canDecline;
  bool get isAlreadyCheckedIn => badge.isAlreadyCheckedIn;
  bool get isRegistered => badge == VerificationBadge.registered;
  bool get isNotRegistered => badge == VerificationBadge.notRegistered;
  
  /// Get the reason why check-in cannot proceed
  String? get blockingReason {
    if (isAtCapacity) return 'Session is at full capacity';
    if (isAlreadyCheckedIn) return 'Already checked in';
    if (!actions.canAccept && session?.requiresRegistration == true) {
      return 'Registration required for this session';
    }
    if (session?.isOpen == false) return 'Session is not open';
    return null;
  }
}

/// Accept check-in result
class AcceptCheckInResult {
  final String status;
  final String message;
  final CheckIn? checkIn;
  final CapacityInfo? capacityInfo;

  const AcceptCheckInResult({
    required this.status,
    required this.message,
    this.checkIn,
    this.capacityInfo,
  });

  factory AcceptCheckInResult.fromJson(Map<String, dynamic> json) {
    return AcceptCheckInResult(
      status: json['status'] as String,
      message: json['message'] as String,
      checkIn: json['data'] != null
          ? CheckIn.fromJson(json['data'] as Map<String, dynamic>)
          : null,
      capacityInfo: json['capacityInfo'] != null
          ? CapacityInfo.fromJson(json['capacityInfo'] as Map<String, dynamic>)
          : null,
    );
  }

  bool get isSuccess => status == 'success';
}

/// Decline check-in result
class DeclineCheckInResult {
  final String status;
  final String message;
  final CheckInAttempt? attempt;

  const DeclineCheckInResult({
    required this.status,
    required this.message,
    this.attempt,
  });

  factory DeclineCheckInResult.fromJson(Map<String, dynamic> json) {
    return DeclineCheckInResult(
      status: json['status'] as String,
      message: json['message'] as String,
      attempt: json['data'] != null
          ? CheckInAttempt.fromJson(json['data'] as Map<String, dynamic>)
          : null,
    );
  }

  bool get isSuccess => status == 'success';
}

/// Check-in attempt record (for declined/failed attempts)
class CheckInAttempt {
  final String id;
  final String participantId;
  final String sessionId;
  final String status;
  final String? reason;
  final String? declinedBy;
  final DateTime attemptTime;
  final Participant? participant;
  final Session? session;

  const CheckInAttempt({
    required this.id,
    required this.participantId,
    required this.sessionId,
    required this.status,
    this.reason,
    this.declinedBy,
    required this.attemptTime,
    this.participant,
    this.session,
  });

  factory CheckInAttempt.fromJson(Map<String, dynamic> json) {
    return CheckInAttempt(
      id: json['_id'] as String,
      participantId: json['participantId'] is Map 
          ? json['participantId']['_id'] as String 
          : json['participantId'] as String,
      sessionId: json['sessionId'] is Map 
          ? json['sessionId']['_id'] as String 
          : json['sessionId'] as String,
      status: json['status'] as String,
      reason: json['reason'] as String?,
      declinedBy: json['declinedBy'] as String?,
      attemptTime: DateTime.parse(json['attemptTime'] as String),
      participant: json['participantId'] is Map 
          ? Participant.fromJson(json['participantId'] as Map<String, dynamic>)
          : null,
      session: json['sessionId'] is Map 
          ? Session.fromJson(json['sessionId'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Check-in result from API
class CheckInResult {
  final String status;
  final String message;
  final CheckIn? checkIn;
  final CapacityInfo? capacityInfo;
  final Participant? participant;

  const CheckInResult({
    required this.status,
    required this.message,
    this.checkIn,
    this.capacityInfo,
    this.participant,
  });

  factory CheckInResult.fromJson(Map<String, dynamic> json) {
    // Extract participant from check-in data if populated
    Participant? participant;
    CheckIn? checkIn;
    
    if (json['data'] != null) {
      checkIn = CheckIn.fromJson(json['data'] as Map<String, dynamic>);
      participant = checkIn.participant;
    }

    return CheckInResult(
      status: json['status'] as String,
      message: json['message'] as String,
      checkIn: checkIn,
      capacityInfo: json['capacityInfo'] != null
          ? CapacityInfo.fromJson(json['capacityInfo'] as Map<String, dynamic>)
          : null,
      participant: participant,
    );
  }

  bool get isSuccess => status == 'success';
  
  /// Alias for isSuccess
  bool get success => isSuccess;
  
  /// Check if participant was already checked in
  bool get alreadyCheckedIn => message.toLowerCase().contains('already');
}

/// Capacity information
class CapacityInfo {
  final int current;
  final int max;
  final double percentFull;
  final bool isAtCapacity;
  final int? remaining;
  final bool isNearCapacity;

  const CapacityInfo({
    this.current = 0,
    this.max = 0,
    this.percentFull = 0.0,
    this.isAtCapacity = false,
    this.remaining,
    this.isNearCapacity = false,
  });
  
  /// Alias for backward compatibility
  int get capacity => max;

  factory CapacityInfo.fromJson(Map<String, dynamic> json) {
    // Backend may send 'checkInsCount' or 'current' for current count
    final checkInsCount = (json['checkInsCount'] as num?)?.toInt() ?? 
                          (json['current'] as num?)?.toInt() ?? 0;
    // Backend may send 'capacity' or 'max' for maximum capacity
    final maxCapacity = (json['max'] as num?)?.toInt() ?? 
                        (json['capacity'] as num?)?.toInt() ?? 0;
    final remaining = (json['remaining'] as num?)?.toInt() ?? 
                      (maxCapacity > 0 ? maxCapacity - checkInsCount : null);
    
    return CapacityInfo(
      current: checkInsCount,
      max: maxCapacity,
      percentFull: (json['percentFull'] as num?)?.toDouble() ?? 
                   (maxCapacity > 0 ? (checkInsCount / maxCapacity * 100) : 0.0),
      isAtCapacity: json['isAtCapacity'] as bool? ?? 
                    (maxCapacity > 0 && checkInsCount >= maxCapacity),
      remaining: remaining,
      isNearCapacity: json['isNearCapacity'] as bool? ?? 
                      (maxCapacity > 0 && remaining != null && remaining <= (maxCapacity * 0.1).ceil()),
    );
  }
}

