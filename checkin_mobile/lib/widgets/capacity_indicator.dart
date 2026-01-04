import 'package:flutter/material.dart';

/// Capacity Indicator Widget
class CapacityIndicator extends StatelessWidget {
  final int current;
  final int capacity;
  final bool showPercentage;
  final bool showCount;

  const CapacityIndicator({
    super.key,
    required this.current,
    required this.capacity,
    this.showPercentage = false,
    this.showCount = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percentage = capacity > 0 ? (current / capacity).clamp(0.0, 1.0) : 0.0;
    final isNearCapacity = percentage >= 0.8;
    final isAtCapacity = percentage >= 1.0;

    final color = isAtCapacity
        ? Colors.red
        : isNearCapacity
            ? Colors.orange
            : theme.colorScheme.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Progress bar
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: percentage,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            valueColor: AlwaysStoppedAnimation(color),
            minHeight: 6,
          ),
        ),

        const SizedBox(height: 4),

        // Labels
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (showCount)
              Text(
                '$current / $capacity checked in',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            if (showPercentage)
              Text(
                '${(percentage * 100).toInt()}%',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
            if (isAtCapacity)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'FULL',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.red.shade700,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              )
            else if (isNearCapacity)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${capacity - current} left',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.orange.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Compact Capacity Badge
class CapacityBadge extends StatelessWidget {
  final int current;
  final int capacity;

  const CapacityBadge({
    super.key,
    required this.current,
    required this.capacity,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percentage = capacity > 0 ? (current / capacity).clamp(0.0, 1.0) : 0.0;
    final isNearCapacity = percentage >= 0.8;
    final isAtCapacity = percentage >= 1.0;

    final bgColor = isAtCapacity
        ? Colors.red.shade100
        : isNearCapacity
            ? Colors.orange.shade100
            : theme.colorScheme.primaryContainer;

    final textColor = isAtCapacity
        ? Colors.red.shade700
        : isNearCapacity
            ? Colors.orange.shade700
            : theme.colorScheme.onPrimaryContainer;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.people_outline,
            size: 14,
            color: textColor,
          ),
          const SizedBox(width: 4),
          Text(
            '$current/$capacity',
            style: theme.textTheme.labelSmall?.copyWith(
              color: textColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
