import 'enums.dart';

/// Session model - matches backend Session schema
class Session {
  final String id;
  final String name;
  final String? description;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? location;
  final bool isOpen;
  final SessionStatus status;
  final int? capacity;
  final bool capacityEnforced;
  final bool requiresRegistration;
  final int checkInsCount;
  final int? day;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Session({
    required this.id,
    required this.name,
    this.description,
    this.startTime,
    this.endTime,
    this.location,
    this.isOpen = false,
    this.status = SessionStatus.scheduled,
    this.capacity,
    this.capacityEnforced = true,
    this.requiresRegistration = false,
    this.checkInsCount = 0,
    this.day,
    this.createdAt,
    this.updatedAt,
  });

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      id: json['_id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      startTime: json['startTime'] != null
          ? DateTime.parse(json['startTime'] as String)
          : null,
      endTime: json['endTime'] != null
          ? DateTime.parse(json['endTime'] as String)
          : null,
      location: json['location'] as String?,
      isOpen: json['isOpen'] as bool? ?? false,
      status: SessionStatus.fromString(json['status'] as String? ?? 'scheduled'),
      capacity: json['capacity'] as int?,
      capacityEnforced: json['capacityEnforced'] as bool? ?? true,
      requiresRegistration: json['requiresRegistration'] as bool? ?? false,
      checkInsCount: json['checkInsCount'] as int? ?? 0,
      day: json['day'] as int?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'description': description,
      'startTime': startTime?.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'location': location,
      'isOpen': isOpen,
      'status': status.name,
      'capacity': capacity,
      'capacityEnforced': capacityEnforced,
      'requiresRegistration': requiresRegistration,
      'checkInsCount': checkInsCount,
      'day': day,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Session copyWith({
    String? id,
    String? name,
    String? description,
    DateTime? startTime,
    DateTime? endTime,
    String? location,
    bool? isOpen,
    SessionStatus? status,
    int? capacity,
    bool? capacityEnforced,
    bool? requiresRegistration,
    int? checkInsCount,
    int? day,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Session(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      location: location ?? this.location,
      isOpen: isOpen ?? this.isOpen,
      status: status ?? this.status,
      capacity: capacity ?? this.capacity,
      capacityEnforced: capacityEnforced ?? this.capacityEnforced,
      requiresRegistration: requiresRegistration ?? this.requiresRegistration,
      checkInsCount: checkInsCount ?? this.checkInsCount,
      day: day ?? this.day,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Check if session has capacity limit
  bool get hasCapacity => capacity != null && capacity! > 0;

  /// Check if session is at capacity
  bool get isAtCapacity => hasCapacity && checkInsCount >= capacity!;

  /// Get remaining capacity
  int? get remainingCapacity => hasCapacity ? capacity! - checkInsCount : null;

  /// Get capacity percentage
  double get capacityPercentage =>
      hasCapacity ? (checkInsCount / capacity! * 100).clamp(0, 100) : 0;

  /// Time-based status helpers
  String get timeBasedStatus {
    final now = DateTime.now();
    if (startTime == null) return 'Unknown';
    if (now.isBefore(startTime!)) {
      return 'Upcoming';
    } else if (endTime != null && now.isAfter(endTime!)) {
      return 'Ended';
    } else {
      return 'In Progress';
    }
  }
  
  bool get isUpcoming => startTime != null && DateTime.now().isBefore(startTime!);
  bool get isInProgress {
    if (startTime == null) return false;
    final now = DateTime.now();
    return now.isAfter(startTime!) && (endTime == null || now.isBefore(endTime!));
  }
  bool get hasEnded => endTime != null && DateTime.now().isAfter(endTime!);
}
