import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Capacity Indicator Widget with Pie Chart
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

    return Row(
      children: [
        // Pie chart indicator
        SizedBox(
          width: 50,
          height: 50,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Background circle
              CustomPaint(
                size: const Size(50, 50),
                painter: _PieChartPainter(
                  percentage: percentage,
                  color: color,
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                ),
              ),
              // Percentage text
              Text(
                '${(percentage * 100).toInt()}%',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurface,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(width: 12),

        // Labels
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (showCount)
                Text(
                  '$current / $capacity checked in',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              const SizedBox(height: 4),
              if (isAtCapacity)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
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
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade100,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${capacity - current} spots left',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: Colors.orange.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Custom Painter for Pie Chart
class _PieChartPainter extends CustomPainter {
  final double percentage;
  final Color color;
  final Color backgroundColor;

  _PieChartPainter({
    required this.percentage,
    required this.color,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2;

    // Draw background circle
    final backgroundPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radius, backgroundPaint);

    // Draw border
    final borderPaint = Paint()
      ..color = backgroundColor.withValues(alpha: 0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawCircle(center, radius, borderPaint);

    // Draw filled pie segment
    if (percentage > 0) {
      final progressPaint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;

      final sweepAngle = 2 * math.pi * percentage;
      final startAngle = -math.pi / 2; // Start from top

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        true,
        progressPaint,
      );
    }

    // Draw inner white circle for donut effect
    final innerPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radius * 0.65, innerPaint);
  }

  @override
  bool shouldRepaint(_PieChartPainter oldDelegate) {
    return oldDelegate.percentage != percentage ||
        oldDelegate.color != color ||
        oldDelegate.backgroundColor != backgroundColor;
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
