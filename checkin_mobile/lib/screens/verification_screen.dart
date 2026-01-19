import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/feedback_service.dart';

/// Verification result screen with Accept/Decline actions
class VerificationScreen extends ConsumerStatefulWidget {
  final VerificationResult verification;
  final Session session;

  const VerificationScreen({
    super.key,
    required this.verification,
    required this.session,
  });

  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> {
  final _feedbackService = FeedbackService();
  final _reasonController = TextEditingController();
  final _notesController = TextEditingController();
  bool _showDeclineReason = false;

  @override
  void initState() {
    super.initState();
    _feedbackService.init();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleAccept() async {
    final result = await ref.read(checkInProvider.notifier).acceptCheckIn(
      participantId: widget.verification.participantId,
      sessionId: widget.session.id,
      notes: _notesController.text.isNotEmpty ? _notesController.text : null,
    );

    if (!mounted) return;

    if (result != null && result.isSuccess) {
      await _feedbackService.success();
      if (mounted) {
        Navigator.of(context).pop(true); // Return true to continue scanning
      }
    } else {
      await _feedbackService.error();
      final error = ref.read(checkInProvider).error;
      if (error != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleDecline() async {
    if (!_showDeclineReason) {
      setState(() => _showDeclineReason = true);
      return;
    }

    if (_reasonController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please provide a reason for declining'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final result = await ref.read(checkInProvider.notifier).declineCheckIn(
      participantId: widget.verification.participantId,
      sessionId: widget.session.id,
      reason: _reasonController.text,
    );

    if (!mounted) return;

    if (result != null && result.isSuccess) {
      await _feedbackService.warning();
      if (mounted) {
        Navigator.of(context).pop(true); // Return true to continue scanning
      }
    } else {
      await _feedbackService.error();
      final error = ref.read(checkInProvider).error;
      if (error != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _handleCancel() {
    ref.read(checkInProvider.notifier).clearVerification();
    Navigator.of(context).pop(true); // Return true to continue scanning
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final checkInState = ref.watch(checkInProvider);
    final isProcessing = checkInState.isProcessing;
    final participant = widget.verification.participant;
    final badge = widget.verification.badge;
    final isAtCapacity = widget.verification.isAtCapacity;
    // canAccept is determined by widget.verification but kept for potential future use
    final _ = widget.verification.canAccept;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Verification'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: isProcessing ? null : _handleCancel,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Capacity warning - show prominently at top if at capacity
            if (isAtCapacity) ...[
              _buildCapacityWarningCard(theme),
              const SizedBox(height: 24),
            ],
            
            // Badge indicator
            _buildBadgeCard(theme, badge),
            const SizedBox(height: 24),

            // Participant info
            if (participant != null) ...[
              _buildParticipantCard(theme, participant),
              const SizedBox(height: 24),
            ],

            // Already checked in message
            if (badge.isAlreadyCheckedIn) ...[
              _buildAlreadyCheckedInCard(theme),
              const SizedBox(height: 24),
            ],

            // Notes field (for accept)
            if (!badge.isAlreadyCheckedIn && widget.verification.canAccept) ...[
              TextField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes (optional)',
                  hintText: 'Add any notes...',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
                enabled: !isProcessing,
              ),
              const SizedBox(height: 16),
            ],

            // Decline reason field
            if (_showDeclineReason) ...[
              TextField(
                controller: _reasonController,
                decoration: const InputDecoration(
                  labelText: 'Reason for declining *',
                  hintText: 'Enter reason...',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
                enabled: !isProcessing,
                autofocus: true,
              ),
              const SizedBox(height: 24),
            ],

            // Action buttons - disable accept if at capacity
            if (!badge.isAlreadyCheckedIn && !isAtCapacity) ...[
              _buildActionButtons(theme, isProcessing),
            ] else if (isAtCapacity && !badge.isAlreadyCheckedIn) ...[
              // Show only continue scanning when at capacity
              FilledButton.icon(
                onPressed: isProcessing ? null : _handleCancel,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Continue Scanning'),
              ),
            ] else ...[
              FilledButton.icon(
                onPressed: isProcessing ? null : _handleCancel,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Continue Scanning'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCapacityWarningCard(ThemeData theme) {
    final capacityInfo = widget.verification.capacityInfo;
    
    return Card(
      color: Colors.red.withValues(alpha: 0.1),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.group_off,
                size: 48,
                color: Colors.red,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'SESSION FULL',
              style: theme.textTheme.titleLarge?.copyWith(
                color: Colors.red,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This session has reached maximum capacity. No more check-ins can be accepted.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (capacityInfo != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${capacityInfo.current}/${capacityInfo.max} participants',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBadgeCard(ThemeData theme, VerificationBadge badge) {
    final Color badgeColor;
    final IconData badgeIcon;
    final String badgeText;
    final String badgeDescription;

    switch (badge) {
      case VerificationBadge.registered:
        badgeColor = Colors.green;
        badgeIcon = Icons.check_circle;
        badgeText = 'REGISTERED';
        badgeDescription = 'Participant is registered for this session';
      case VerificationBadge.notRegistered:
        badgeColor = Colors.orange;
        badgeIcon = Icons.warning;
        badgeText = 'NOT REGISTERED';
        badgeDescription = 'Participant is not registered for this session';
      case VerificationBadge.alreadyCheckedIn:
        badgeColor = Colors.blue;
        badgeIcon = Icons.info;
        badgeText = 'ALREADY CHECKED IN';
        badgeDescription = 'Participant has already checked in to this session';
    }

    return Card(
      color: badgeColor.withValues(alpha: 0.1),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(
              badgeIcon,
              size: 64,
              color: badgeColor,
            ),
            const SizedBox(height: 12),
            Text(
              badgeText,
              style: theme.textTheme.titleLarge?.copyWith(
                color: badgeColor,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              badgeDescription,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildParticipantCard(ThemeData theme, Participant participant) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: theme.colorScheme.primaryContainer,
                  radius: 28,
                  child: Text(
                    _getInitials(participant.fullName),
                    style: TextStyle(
                      color: theme.colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        participant.fullName,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        participant.email,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (participant.organization != null) ...[
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.business,
                    size: 16,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    participant.organization!,
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAlreadyCheckedInCard(ThemeData theme) {
    return Card(
      color: Colors.blue.withValues(alpha: 0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(
              Icons.info_outline,
              color: Colors.blue,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'This participant has already been checked in to this session. No further action is required.',
                style: theme.textTheme.bodyMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(ThemeData theme, bool isProcessing) {
    final canAccept = widget.verification.canAccept;
    final canDecline = widget.verification.canDecline;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (canAccept) ...[
          FilledButton.icon(
            onPressed: isProcessing ? null : _handleAccept,
            icon: isProcessing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.check),
            label: Text(
              widget.verification.isRegistered
                  ? 'Accept Check-in'
                  : 'Accept (Unregistered)',
            ),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (canDecline) ...[
          OutlinedButton.icon(
            onPressed: isProcessing ? null : _handleDecline,
            icon: isProcessing && _showDeclineReason
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.close),
            label: Text(_showDeclineReason ? 'Confirm Decline' : 'Decline'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
          const SizedBox(height: 12),
        ],
        TextButton(
          onPressed: isProcessing ? null : _handleCancel,
          child: const Text('Cancel'),
        ),
      ],
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts.first.isNotEmpty) {
      return parts.first[0].toUpperCase();
    }
    return '?';
  }
}
