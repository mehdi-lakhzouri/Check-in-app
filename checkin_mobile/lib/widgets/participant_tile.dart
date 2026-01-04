import 'package:flutter/material.dart';
import '../models/models.dart';

/// Participant Tile Widget for search results
class ParticipantTile extends StatelessWidget {
  final Participant participant;
  final VoidCallback? onTap;
  final bool showCheckInStatus;
  final bool isCheckedIn;

  const ParticipantTile({
    super.key,
    required this.participant,
    this.onTap,
    this.showCheckInStatus = false,
    this.isCheckedIn = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: isCheckedIn
            ? Colors.green.shade100
            : theme.colorScheme.primaryContainer,
        child: isCheckedIn
            ? Icon(Icons.check, color: Colors.green.shade700)
            : Text(
                participant.initials,
                style: TextStyle(
                  color: theme.colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
      title: Text(
        participant.fullName,
        style: theme.textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w500,
          decoration: isCheckedIn ? TextDecoration.lineThrough : null,
          color: isCheckedIn ? theme.colorScheme.onSurfaceVariant : null,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            participant.email,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          if (participant.organization != null)
            Text(
              participant.organization!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
        ],
      ),
      trailing: showCheckInStatus && isCheckedIn
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.green.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Checked In',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: Colors.green.shade700,
                  fontWeight: FontWeight.w600,
                ),
              ),
            )
          : const Icon(Icons.chevron_right),
    );
  }
}

/// Compact Participant Row for check-in lists
class ParticipantRow extends StatelessWidget {
  final String name;
  final String? subtitle;
  final DateTime? checkInTime;
  final VoidCallback? onUndo;

  const ParticipantRow({
    super.key,
    required this.name,
    this.subtitle,
    this.checkInTime,
    this.onUndo,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
          if (checkInTime != null)
            Text(
              _formatTime(checkInTime!),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          if (onUndo != null) ...[
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.undo, size: 20),
              onPressed: onUndo,
              tooltip: 'Undo check-in',
            ),
          ],
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final hour = time.hour;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:$minute $period';
  }
}
