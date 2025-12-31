import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/session_manual.dart';
import '../services/session_service.dart';

final sessionsProvider = FutureProvider<List<Session>>((ref) async {
  final sessionService = ref.watch(sessionServiceProvider);
  return sessionService.getSessions();
});

final sessionProvider = FutureProvider.family<Session, String>((ref, id) async {
  final sessionService = ref.watch(sessionServiceProvider);
  return sessionService.getSession(id);
});
