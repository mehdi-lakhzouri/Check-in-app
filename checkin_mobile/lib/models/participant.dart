import 'enums.dart';

/// Participant model - matches backend Participant schema
class Participant {
  final String id;
  final String name;
  final String email;
  final String? organization;
  final String? phone;
  final String qrCode;
  final bool isActive;
  final ParticipantStatus status;
  final int ambassadorPoints;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Participant({
    required this.id,
    required this.name,
    required this.email,
    this.organization,
    this.phone,
    required this.qrCode,
    this.isActive = true,
    this.status = ParticipantStatus.regular,
    this.ambassadorPoints = 0,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      id: json['_id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      organization: json['organization'] as String?,
      phone: json['phone'] as String?,
      qrCode: json['qrCode'] as String,
      isActive: json['isActive'] as bool? ?? true,
      status: ParticipantStatus.fromString(json['status'] as String? ?? 'regular'),
      ambassadorPoints: json['ambassadorPoints'] as int? ?? 0,
      notes: json['notes'] as String?,
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
      'email': email,
      'organization': organization,
      'phone': phone,
      'qrCode': qrCode,
      'isActive': isActive,
      'status': status.name,
      'ambassadorPoints': ambassadorPoints,
      'notes': notes,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Participant copyWith({
    String? id,
    String? name,
    String? email,
    String? organization,
    String? phone,
    String? qrCode,
    bool? isActive,
    ParticipantStatus? status,
    int? ambassadorPoints,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Participant(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      organization: organization ?? this.organization,
      phone: phone ?? this.phone,
      qrCode: qrCode ?? this.qrCode,
      isActive: isActive ?? this.isActive,
      status: status ?? this.status,
      ambassadorPoints: ambassadorPoints ?? this.ambassadorPoints,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Get full name (alias for name field)
  String get fullName => name;

  /// Get initials for avatar
  String get initials {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length.clamp(0, 2)).toUpperCase();
  }
}
