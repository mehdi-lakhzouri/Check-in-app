import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../widgets/widgets.dart';
import 'checkin_result_screen.dart';

/// Manual Check-in Screen
class ManualCheckInScreen extends ConsumerStatefulWidget {
  final Session session;

  const ManualCheckInScreen({
    super.key,
    required this.session,
  });

  @override
  ConsumerState<ManualCheckInScreen> createState() =>
      _ManualCheckInScreenState();
}

class _ManualCheckInScreenState extends ConsumerState<ManualCheckInScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  final Set<String> _checkedInParticipantIds = {};

  @override
  void initState() {
    super.initState();
    _loadCheckedInParticipants();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _loadCheckedInParticipants() async {
    // Load list of already checked-in participants for this session
    try {
      final checkIns = await ref
          .read(checkInServiceProvider)
          .getRecentCheckIns(sessionId: widget.session.id, limit: 1000);
      
      if (!mounted) return;
      
      setState(() {
        _checkedInParticipantIds.clear();
        for (final checkIn in checkIns) {
          // Use participantIdString getter to handle both String and Participant types
          _checkedInParticipantIds.add(checkIn.participantIdString);
        }
      });
    } catch (e) {
      // Silently handle error - the UI will show participants without check-in status
      debugPrint('Error loading checked-in participants: $e');
    }
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(AppConfig.searchDebounce, () {
      ref.read(participantSearchProvider.notifier).search(query);
    });
  }

  Future<void> _checkInParticipant(Participant participant) async {
    final result = await ref.read(checkInProvider.notifier).checkInManual(
          participantId: participant.id,
          sessionId: widget.session.id,
        );

    if (!mounted) return;

    if (result != null) {
      // Add to checked-in set
      setState(() {
        _checkedInParticipantIds.add(participant.id);
      });

      // Show result screen
      final shouldContinue = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => CheckInResultScreen(
            result: result,
            session: widget.session,
          ),
        ),
      );

      if (shouldContinue == false && mounted) {
        Navigator.of(context).pop();
      }
    } else {
      // Show error
      final error = ref.read(checkInProvider).error;
      if (error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final searchState = ref.watch(participantSearchProvider);
    final checkInState = ref.watch(checkInProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manual Check-in'),
      ),
      body: Column(
        children: [
          // Session info
          Container(
            padding: const EdgeInsets.all(16),
            color: theme.colorScheme.primaryContainer,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.session.name,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                      if (widget.session.capacity != null)
                        Text(
                          '${widget.session.checkInsCount} / ${widget.session.capacity} checked in',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onPrimaryContainer
                                .withValues(alpha: 0.8),
                          ),
                        ),
                    ],
                  ),
                ),
                SessionStatusBadge(
                  status: widget.session.status,
                  isOpen: widget.session.isOpen,
                ),
              ],
            ),
          ),

          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Search by name, email, or organization...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(participantSearchProvider.notifier).clear();
                        },
                      )
                    : null,
                filled: true,
                fillColor: theme.colorScheme.surfaceContainerHighest,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: _onSearchChanged,
            ),
          ),

          // Processing indicator
          if (checkInState.isProcessing)
            const LinearProgressIndicator(),

          // Search results
          Expanded(
            child: _buildSearchResults(searchState),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults(ParticipantSearchState searchState) {
    if (searchState.query.isEmpty) {
      return const EmptyState(
        icon: Icons.search,
        title: 'Search for a participant',
        subtitle: 'Enter name, email, or organization to search',
      );
    }

    if (searchState.isSearching) {
      return const LoadingState(message: 'Searching...');
    }

    if (searchState.error != null) {
      return ErrorState(
        message: searchState.error!,
        onRetry: () => ref
            .read(participantSearchProvider.notifier)
            .search(searchState.query),
      );
    }

    if (searchState.results.isEmpty) {
      return EmptyState(
        icon: Icons.person_search,
        title: 'No participants found',
        subtitle: 'Try a different search term',
      );
    }

    return ListView.separated(
      itemCount: searchState.results.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final participant = searchState.results[index];
        final isCheckedIn = _checkedInParticipantIds.contains(participant.id);

        return ParticipantTile(
          participant: participant,
          showCheckInStatus: true,
          isCheckedIn: isCheckedIn,
          onTap: isCheckedIn
              ? null
              : () => _showCheckInConfirmation(participant),
        );
      },
    );
  }

  Future<void> _showCheckInConfirmation(Participant participant) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Check-in'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Check in ${participant.fullName}?'),
            if (participant.organization != null) ...[
              const SizedBox(height: 8),
              Text(
                participant.organization!,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Check In'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _checkInParticipant(participant);
    }
  }
}
