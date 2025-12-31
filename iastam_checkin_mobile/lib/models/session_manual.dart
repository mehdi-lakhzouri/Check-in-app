class Session {
  final String id;
  final String name;
  final bool isOpen;
  final String sessionType;
  final int? checkInsCount;

  Session({
    required this.id,
    required this.name,
    required this.isOpen,
    this.sessionType = 'general',
    this.checkInsCount,
  });

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      isOpen: json['isOpen'] ?? false,
      sessionType: json['sessionType'] ?? 'general',
      checkInsCount: json['checkInsCount'],
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'name': name,
    'isOpen': isOpen,
    'sessionType': sessionType,
    'checkInsCount': checkInsCount,
  };
}
