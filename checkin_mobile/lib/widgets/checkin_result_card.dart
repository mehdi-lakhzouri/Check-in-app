import 'package:flutter/material.dart';
import '../models/models.dart';

/// Check-in Result Card
class CheckInResultCard extends StatelessWidget {
  final CheckInResult result;
  final VoidCallback? onDismiss;
  final VoidCallback? onUndo;

  const CheckInResultCard({
    super.key,
    required this.result,
    this.onDismiss,
    this.onUndo,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isSuccess = result.success;

    return Card(
      elevation: 4,
      margin: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isSuccess ? Colors.green : Colors.red,
          width: 2,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Status icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: isSuccess ? Colors.green.shade50 : Colors.red.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isSuccess ? Icons.check_circle : Icons.error,
                size: 48,
                color: isSuccess ? Colors.green : Colors.red,
              ),
            ),

            const SizedBox(height: 16),

            // Status text
            Text(
              isSuccess ? 'Check-in Successful!' : 'Check-in Failed',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: isSuccess ? Colors.green.shade700 : Colors.red.shade700,
              ),
            ),

            const SizedBox(height: 8),

            // Participant name
            if (result.participant != null) ...[
              Text(
                result.participant!.fullName,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (result.participant!.organization != null)
                Text(
                  result.participant!.organization!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
            ],

            // Error message
            if (!isSuccess) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.red.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        result.message,
                        style: TextStyle(color: Colors.red.shade700),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Already checked in message
            if (result.alreadyCheckedIn == true) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.orange.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'This participant is already checked in.',
                        style: TextStyle(color: Colors.orange.shade700),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Capacity info
            if (result.capacityInfo != null) ...[
              const SizedBox(height: 16),
              _buildCapacityInfo(context, result.capacityInfo!),
            ],

            const SizedBox(height: 24),

            // Action buttons
            Row(
              children: [
                if (isSuccess && onUndo != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onUndo,
                      icon: const Icon(Icons.undo),
                      label: const Text('Undo'),
                    ),
                  ),
                if (isSuccess && onUndo != null) const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onDismiss,
                    icon: Icon(isSuccess ? Icons.qr_code_scanner : Icons.refresh),
                    label: Text(isSuccess ? 'Scan Next' : 'Try Again'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCapacityInfo(BuildContext context, CapacityInfo info) {
    final theme = Theme.of(context);
    final percentage = info.capacity > 0
        ? (info.current / info.capacity).clamp(0.0, 1.0)
        : 0.0;
    final isNearCapacity = percentage >= 0.8;
    final isAtCapacity = percentage >= 1.0;

    final color = isAtCapacity
        ? Colors.red
        : isNearCapacity
            ? Colors.orange
            : theme.colorScheme.primary;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.people_outline, color: color),
          const SizedBox(width: 8),
          Text(
            '${info.current} / ${info.capacity} checked in',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (isAtCapacity) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'FULL',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
