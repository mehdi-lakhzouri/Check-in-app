class Participant {
  final String id;
  final String name;
  final String email;
  final String? organization;
  final String qrCode;
  final bool isActive;
  final String? displayName;

  Participant({
    required this.id,
    required this.name,
    required this.email,
    this.organization,
    required this.qrCode,
    this.isActive = true,
    this.displayName,
  });

  String get fullName => displayName ?? name;

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      organization: json['organization'],
      qrCode: json['qrCode'] ?? '',
      isActive: json['isActive'] ?? true,
      displayName: json['displayName'],
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'name': name,
    'email': email,
    'organization': organization,
    'qrCode': qrCode,
    'isActive': isActive,
    'displayName': displayName,
  };
}
