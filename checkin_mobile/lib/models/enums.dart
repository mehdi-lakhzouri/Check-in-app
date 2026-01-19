/// Session status enum - matches backend SessionStatus
enum SessionStatus {
  scheduled,
  open,
  ended,
  closed,
  cancelled;

  static SessionStatus fromString(String value) {
    return SessionStatus.values.firstWhere(
      (e) => e.name == value.toLowerCase(),
      orElse: () => SessionStatus.scheduled,
    );
  }
  
  String get displayName {
    switch (this) {
      case SessionStatus.scheduled:
        return 'Scheduled';
      case SessionStatus.open:
        return 'Open';
      case SessionStatus.ended:
        return 'Ended';
      case SessionStatus.closed:
        return 'Closed';
      case SessionStatus.cancelled:
        return 'Cancelled';
    }
  }
  
  bool get isCheckInAllowed => this == SessionStatus.open;
}

/// SessionLifecycle is an alias for SessionStatus (for compatibility)
typedef SessionLifecycle = SessionStatus;

/// Check-in method enum
enum CheckInMethod {
  qr,
  manual;

  static CheckInMethod fromString(String value) {
    return CheckInMethod.values.firstWhere(
      (e) => e.name == value.toLowerCase(),
      orElse: () => CheckInMethod.manual,
    );
  }
}

/// Verification badge enum - indicates registration status during QR verification
enum VerificationBadge {
  registered,
  notRegistered,
  alreadyCheckedIn;

  static VerificationBadge fromString(String value) {
    switch (value.toLowerCase()) {
      case 'registered':
        return VerificationBadge.registered;
      case 'not_registered':
        return VerificationBadge.notRegistered;
      case 'already_checked_in':
        return VerificationBadge.alreadyCheckedIn;
      default:
        return VerificationBadge.notRegistered;
    }
  }
  
  String get displayName {
    switch (this) {
      case VerificationBadge.registered:
        return 'Registered';
      case VerificationBadge.notRegistered:
        return 'Not Registered';
      case VerificationBadge.alreadyCheckedIn:
        return 'Already Checked In';
    }
  }
  
  bool get canAccept => this == VerificationBadge.registered || this == VerificationBadge.notRegistered;
  bool get canDecline => this == VerificationBadge.registered || this == VerificationBadge.notRegistered;
  bool get isAlreadyCheckedIn => this == VerificationBadge.alreadyCheckedIn;
}

/// Check-in badge enum - indicates how check-in was processed
enum CheckInBadge {
  accepted,
  acceptedUnregistered;

  static CheckInBadge fromString(String value) {
    switch (value.toLowerCase()) {
      case 'accepted':
        return CheckInBadge.accepted;
      case 'accepted_unregistered':
        return CheckInBadge.acceptedUnregistered;
      default:
        return CheckInBadge.accepted;
    }
  }
  
  String get displayName {
    switch (this) {
      case CheckInBadge.accepted:
        return 'Accepted';
      case CheckInBadge.acceptedUnregistered:
        return 'Accepted (Unregistered)';
    }
  }
  
  bool get wasRegistered => this == CheckInBadge.accepted;
}

/// Participant status enum
enum ParticipantStatus {
  regular,
  ambassador,
  travelGrant;

  static ParticipantStatus fromString(String value) {
    switch (value.toLowerCase()) {
      case 'ambassador':
        return ParticipantStatus.ambassador;
      case 'travel_grant':
        return ParticipantStatus.travelGrant;
      default:
        return ParticipantStatus.regular;
    }
  }
  
  String get displayName {
    switch (this) {
      case ParticipantStatus.regular:
        return 'Regular';
      case ParticipantStatus.ambassador:
        return 'Ambassador';
      case ParticipantStatus.travelGrant:
        return 'Travel Grant';
    }
  }
}

