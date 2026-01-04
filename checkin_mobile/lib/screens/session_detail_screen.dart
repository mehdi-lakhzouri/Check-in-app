import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../widgets/widgets.dart';
import 'qr_scanner_screen.dart';
import 'manual_checkin_screen.dart';

/// Session Detail Screen
class SessionDetailScreen extends ConsumerStatefulWidget {
  final Session session;

  const SessionDetailScreen({
    super.key,
    required this.session,
  });

  @override
  ConsumerState<SessionDetailScreen> createState() =>
      _SessionDetailScreenState();
}

class _SessionDetailScreenState extends ConsumerState<SessionDetailScreen> {
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    // Load recent check-ins and refresh session data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshSessionData();
      ref
          .read(checkInProvider.notifier)
          .loadRecentCheckIns(sessionId: widget.session.id);
    });
  }

  /// Refresh session data from API to get latest isOpen status
  Future<void> _refreshSessionData() async {
    if (_isRefreshing) return;
    setState(() => _isRefreshing = true);
    
    await ref.read(sessionsProvider.notifier).refreshSession(widget.session.id);
    
    if (mounted) {
      setState(() => _isRefreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final checkInState = ref.watch(checkInProvider);

    // Also watch for real-time session updates
    final sessionsState = ref.watch(sessionsProvider);
    final session = sessionsState.sessions.firstWhere(
      (s) => s.id == widget.session.id,
      orElse: () => widget.session,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(session.name),
        actions: [
          if (_isRefreshing)
            const Padding(
              padding: EdgeInsets.all(12),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _refreshSessionData,
              tooltip: 'Refresh session',
            ),
          SessionStatusBadge(
            status: session.status,
            isOpen: session.isOpen,
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshSessionData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Session Info Card
            Card(
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Time info
                    Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 20,
                          color: theme.colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _buildTimeText(session),
                          style: theme.textTheme.bodyLarge,
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Location info
                    if (session.location != null)
                      Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            size: 20,
                            color: theme.colorScheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _buildLocationText(session),
                            style: theme.textTheme.bodyLarge,
                          ),
                        ],
                      ),

                    if (session.day != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 20,
                            color: theme.colorScheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Day ${session.day}',
                            style: theme.textTheme.bodyLarge,
                          ),
                        ],
                      ),
                    ],

                    // Capacity
                    if (session.capacity != null) ...[
                      const SizedBox(height: 16),
                      CapacityIndicator(
                        current: session.checkInsCount,
                        capacity: session.capacity!,
                        showPercentage: true,
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Check-in Actions (only if session is open)
            if (session.isOpen) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Check-in',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // QR Scanner Button
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: session.isAtCapacity
                            ? null
                            : () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        QrScannerScreen(session: session),
                                  ),
                                );
                              },
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Text('Scan QR Code'),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Manual Check-in Button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: session.isAtCapacity
                            ? null
                            : () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        ManualCheckInScreen(session: session),
                                  ),
                                );
                              },
                        icon: const Icon(Icons.search),
                        label: const Text('Manual Check-in'),
                      ),
                    ),

                    if (session.isAtCapacity) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.warning, color: Colors.red.shade700),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Session is at full capacity. Check-in is disabled.',
                                style: TextStyle(color: Colors.red.shade700),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ] else ...[
              // Session not open message
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Check-in is not available. Session is ${session.status.displayName.toLowerCase()}.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Recent Check-ins Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recent Check-ins',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      ref.read(checkInProvider.notifier).loadRecentCheckIns(
                            sessionId: session.id,
                            limit: 50,
                          );
                    },
                    child: const Text('See All'),
                  ),
                ],
              ),
            ),

            // Recent check-ins list
            if (checkInState.recentCheckIns.isEmpty)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(
                  child: Text(
                    'No check-ins yet',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: checkInState.recentCheckIns.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final checkIn = checkInState.recentCheckIns[index];
                  final participant = checkIn.participant;
                  return ParticipantRow(
                    name: participant?.fullName ?? 'Unknown',
                    subtitle: participant?.organization,
                    checkInTime: checkIn.checkedInAt,
                    onUndo: () => _undoCheckIn(checkIn),
                  );
                },
              ),

            const SizedBox(height: 32),
          ],
        ),
      ),
      ),
    );
  }

  String _buildTimeText(Session session) {
    final startTime = session.startTime;
    final endTime = session.endTime;

    if (startTime == null) return 'Time TBD';

    final startStr = _formatTime(startTime);
    if (endTime == null) return startStr;

    final endStr = _formatTime(endTime);
    return '$startStr - $endStr';
  }

  String _formatTime(DateTime time) {
    final hour = time.hour;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:$minute $period';
  }

  String _buildLocationText(Session session) {
    return session.location ?? '';
  }

  Future<void> _undoCheckIn(CheckIn checkIn) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Undo Check-in?'),
        content: Text(
          'Remove check-in for ${checkIn.participant?.fullName ?? 'this participant'}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Undo'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final success =
          await ref.read(checkInProvider.notifier).undoCheckIn(checkIn.id);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Check-in removed')),
        );
      }
    }
  }
}
