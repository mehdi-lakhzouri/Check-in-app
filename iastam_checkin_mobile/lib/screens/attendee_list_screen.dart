import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/session_manual.dart';
import '../models/participant_manual.dart';
import '../providers/participant_provider.dart';
import '../providers/checkin_provider.dart';

class AttendeeListScreen extends ConsumerStatefulWidget {
  final Session session;

  const AttendeeListScreen({super.key, required this.session});

  @override
  ConsumerState<AttendeeListScreen> createState() => _AttendeeListScreenState();
}

class _AttendeeListScreenState extends ConsumerState<AttendeeListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  int _refreshKey = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.toLowerCase();
      });
    });

    // Refresh data when screen loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refreshData() async {
    try {
      print(
        'AttendeeListScreen: Starting refresh for session ${widget.session.id}',
      );

      // Invalidate all related providers to ensure fresh data
      if (widget.session.isOpen) {
        print(
          'AttendeeListScreen: Invalidating participantsProvider (open session)',
        );
        ref.invalidate(participantsProvider);
      } else {
        print(
          'AttendeeListScreen: Invalidating sessionParticipantsProvider (closed session)',
        );
        ref.invalidate(sessionParticipantsProvider(widget.session.id));
      }
      ref.invalidate(sessionCheckinsProvider(widget.session.id));
      ref.invalidate(
        sessionAttendeesProvider(
          SessionAttendeesParams(
            sessionId: widget.session.id,
            isOpen: widget.session.isOpen,
          ),
        ),
      );

      // Force the widget to rebuild by updating refresh key
      if (mounted) {
        setState(() {
          _refreshKey++;
        });
      }

      print('AttendeeListScreen: Refresh completed, refresh key: $_refreshKey');
    } catch (e) {
      print('Error refreshing data: $e');
    }
  }

  List<Participant> _filterParticipants(List<Participant> participants) {
    if (_searchQuery.isEmpty) return participants;

    try {
      return participants.where((participant) {
        final searchLower = _searchQuery.toLowerCase();
        final fullName = participant.fullName.toLowerCase();
        final email = participant.email.toLowerCase();
        final organization = participant.organization?.toLowerCase() ?? '';

        return fullName.contains(searchLower) ||
            email.contains(searchLower) ||
            organization.contains(searchLower);
      }).toList();
    } catch (e) {
      print('Error filtering participants: $e');
      return participants; // Return unfiltered list if filtering fails
    }
  }

  @override
  Widget build(BuildContext context) {
    final attendeeDataAsync = ref.watch(
      sessionAttendeesProvider(
        SessionAttendeesParams(
          sessionId: widget.session.id,
          isOpen: widget.session.isOpen,
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.session.name} - Attendees'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'All', icon: Icon(Icons.people)),
            Tab(text: 'Checked In', icon: Icon(Icons.check_circle)),
            Tab(text: 'Not Checked In', icon: Icon(Icons.pending)),
          ],
        ),
      ),
      body: attendeeDataAsync.when(
        data: (attendeeData) => RefreshIndicator(
          key: ValueKey(_refreshKey),
          onRefresh: _refreshData,
          child: Column(
            children: [
              // Statistics Card
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                child: Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Text(
                          'Attendance Overview',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStatColumn(
                              'Total',
                              attendeeData.totalParticipants.toString(),
                              Colors.blue,
                            ),
                            _buildStatColumn(
                              'Checked In',
                              attendeeData.checkedInCount.toString(),
                              Colors.green,
                            ),
                            _buildStatColumn(
                              'Pending',
                              attendeeData.notCheckedInCount.toString(),
                              Colors.orange,
                            ),
                            _buildStatColumn(
                              'Rate',
                              '${(attendeeData.attendanceRate * 100).toStringAsFixed(1)}%',
                              Colors.purple,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Search Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by name, email, or organization...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Tab Views
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildParticipantList(
                      _filterParticipants(attendeeData.allParticipants),
                      attendeeData,
                    ),
                    _buildParticipantList(
                      _filterParticipants(attendeeData.checkedInParticipants),
                      attendeeData,
                    ),
                    _buildParticipantList(
                      _filterParticipants(
                        attendeeData.notCheckedInParticipants,
                      ),
                      attendeeData,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        loading: () => const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading attendee data...'),
            ],
          ),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red.shade400),
              const SizedBox(height: 16),
              Text(
                'Error loading attendee data',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  ref.invalidate(
                    sessionAttendeesProvider(
                      SessionAttendeesParams(
                        sessionId: widget.session.id,
                        isOpen: widget.session.isOpen,
                      ),
                    ),
                  );
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatColumn(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
      ],
    );
  }

  Widget _buildParticipantList(
    List<Participant> participants,
    SessionAttendeeData attendeeData,
  ) {
    if (participants.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                  ? 'No participants found matching \"$_searchQuery\"'
                  : 'No participants in this category',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(
          sessionAttendeesProvider(
            SessionAttendeesParams(
              sessionId: widget.session.id,
              isOpen: widget.session.isOpen,
            ),
          ),
        );
      },
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: participants.length,
        itemBuilder: (context, index) {
          final participant = participants[index];
          final isCheckedIn = attendeeData.checkedInParticipants.any(
            (p) => p.id == participant.id,
          );
          final checkin = attendeeData.checkins
              .where((c) => c.participantId == participant.id)
              .firstOrNull;

          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: isCheckedIn
                    ? Colors.green
                    : Colors.grey.shade300,
                child: Icon(
                  isCheckedIn ? Icons.check : Icons.person,
                  color: isCheckedIn ? Colors.white : Colors.grey.shade600,
                ),
              ),
              title: Text(
                participant.fullName,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(participant.email),
                  if (participant.organization?.isNotEmpty == true) ...[
                    const SizedBox(height: 2),
                    Text(
                      participant.organization!,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                  if (isCheckedIn && checkin != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Checked in at ${checkin.checkInTime.hour.toString().padLeft(2, '0')}:${checkin.checkInTime.minute.toString().padLeft(2, '0')}',
                      style: TextStyle(
                        color: Colors.green.shade600,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ],
              ),
              trailing: isCheckedIn
                  ? Icon(Icons.check_circle, color: Colors.green.shade600)
                  : IconButton(
                      icon: const Icon(Icons.login, color: Colors.blue),
                      onPressed: () => _showManualCheckinDialog(participant),
                      tooltip: 'Manual Check-in',
                    ),
              onTap: isCheckedIn
                  ? null
                  : () => _showManualCheckinDialog(participant),
            ),
          );
        },
      ),
    );
  }

  void _showManualCheckinDialog(Participant participant) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Manual Check-in'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Confirm manual check-in for:'),
            const SizedBox(height: 12),
            Card(
              color: Colors.grey.shade50,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      participant.fullName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(participant.email),
                    if (participant.organization?.isNotEmpty == true) ...[
                      const SizedBox(height: 2),
                      Text(
                        participant.organization!,
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _performManualCheckin(participant);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('Check In'),
          ),
        ],
      ),
    );
  }

  void _performManualCheckin(Participant participant) {
    ref
        .read(checkinProvider.notifier)
        .checkin(participant.id, widget.session.id);

    // Show success/error handling
    ref.listen(checkinProvider, (previous, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Check-in failed: ${next.error}'),
            backgroundColor: Colors.red,
          ),
        );
      } else if (next.lastCheckin != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${participant.fullName} checked in successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        // Refresh the attendee data
        ref.invalidate(
          sessionAttendeesProvider(
            SessionAttendeesParams(
              sessionId: widget.session.id,
              isOpen: widget.session.isOpen,
            ),
          ),
        );
      }
    });
  }
}
