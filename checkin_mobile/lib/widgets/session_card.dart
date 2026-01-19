import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/models.dart';
import 'session_status_badge.dart';

/// Enhanced Session Card Widget
/// 
/// Features:
/// - WCAG AA compliant colors
/// - Minimum 44x44px touch targets
/// - Smooth tap animations
/// - Improved visual hierarchy
/// - Semantic accessibility labels
class SessionCard extends StatefulWidget {
  final Session session;
  final VoidCallback? onTap;
  final bool showCapacity;
  final bool isSelected;

  const SessionCard({
    super.key,
    required this.session,
    this.onTap,
    this.showCapacity = true,
    this.isSelected = false,
  });

  @override
  State<SessionCard> createState() => _SessionCardState();
}

class _SessionCardState extends State<SessionCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.98).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    setState(() => _isPressed = true);
    _animationController.forward();
  }

  void _handleTapUp(TapUpDetails details) {
    setState(() => _isPressed = false);
    _animationController.reverse();
    HapticFeedback.lightImpact();
    widget.onTap?.call();
  }

  void _handleTapCancel() {
    setState(() => _isPressed = false);
    _animationController.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final session = widget.session;
    final hasEnded = session.hasEnded;

    return Semantics(
      button: true,
      label: _buildAccessibilityLabel(),
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: child,
          );
        },
        child: GestureDetector(
          onTapDown: _handleTapDown,
          onTapUp: _handleTapUp,
          onTapCancel: _handleTapCancel,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            constraints: const BoxConstraints(minHeight: 44),
            decoration: BoxDecoration(
              color: hasEnded 
                  ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5)
                  : theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: widget.isSelected
                    ? theme.colorScheme.primary
                    : _isPressed
                        ? theme.colorScheme.outline
                        : theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                width: widget.isSelected ? 2 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: _isPressed ? 0.08 : 0.04),
                  blurRadius: _isPressed ? 8 : 4,
                  offset: Offset(0, _isPressed ? 4 : 2),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header row with title and status badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          session.name,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                            height: 1.3,
                            color: hasEnded 
                                ? theme.colorScheme.onSurface.withValues(alpha: 0.7)
                                : theme.colorScheme.onSurface,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 12),
                      SessionLifecycleBadge.fromSession(
                        session: session,
                        fontSize: 11,
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Session metadata
                  _SessionMetadata(
                    session: session,
                    hasEnded: hasEnded,
                  ),

                  // Capacity indicator
                  if (widget.showCapacity && session.capacity != null && session.capacity! > 0) ...[
                    const SizedBox(height: 14),
                    _EnhancedCapacityIndicator(
                      current: session.checkInsCount,
                      capacity: session.capacity!,
                      isSessionEnded: hasEnded,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _buildAccessibilityLabel() {
    final session = widget.session;
    final parts = <String>[
      session.name,
      'Status: ${session.lifecycle.displayName}',
    ];
    
    if (session.location != null) {
      parts.add('Location: ${session.location}');
    }
    
    if (session.startTime != null) {
      parts.add('Time: ${_formatTimeForAccessibility(session.startTime!)}');
    }
    
    if (session.capacity != null) {
      parts.add('${session.checkInsCount} of ${session.capacity} checked in');
    }
    
    return parts.join('. ');
  }

  String _formatTimeForAccessibility(DateTime time) {
    final hour = time.hour;
    final minute = time.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:${minute.toString().padLeft(2, '0')} $period';
  }
}

/// Session metadata (location and time)
class _SessionMetadata extends StatelessWidget {
  final Session session;
  final bool hasEnded;

  const _SessionMetadata({
    required this.session,
    required this.hasEnded,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final metadataColor = hasEnded
        ? theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.6)
        : theme.colorScheme.onSurfaceVariant;

    return Column(
      children: [
        // Location row
        if (session.location != null && session.location!.isNotEmpty) ...[
          _MetadataRow(
            icon: Icons.location_on_outlined,
            text: session.location!,
            color: metadataColor,
          ),
          const SizedBox(height: 6),
        ],

        // Time row
        _MetadataRow(
          icon: Icons.schedule_outlined,
          text: _buildTimeText(),
          color: metadataColor,
        ),
      ],
    );
  }

  String _buildTimeText() {
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
}

/// Metadata row with icon and text
class _MetadataRow extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;

  const _MetadataRow({
    required this.icon,
    required this.text,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: color,
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 13,
              color: color,
              height: 1.4,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

/// Enhanced Capacity Indicator with better visuals
class _EnhancedCapacityIndicator extends StatelessWidget {
  final int current;
  final int capacity;
  final bool isSessionEnded;

  const _EnhancedCapacityIndicator({
    required this.current,
    required this.capacity,
    this.isSessionEnded = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percentage = capacity > 0 ? (current / capacity).clamp(0.0, 1.0) : 0.0;
    final isFull = current >= capacity;
    final isNearCapacity = percentage >= 0.8;

    // WCAG AA compliant colors
    Color progressColor;
    Color backgroundColor;
    String statusText;

    if (isFull) {
      progressColor = const Color(0xFFC62828); // Red 800
      backgroundColor = const Color(0xFFFFCDD2); // Red 100
      statusText = 'FULL';
    } else if (isNearCapacity) {
      progressColor = const Color(0xFFEF6C00); // Orange 800
      backgroundColor = const Color(0xFFFFE0B2); // Orange 100
      statusText = '${(percentage * 100).round()}%';
    } else {
      progressColor = const Color(0xFF2E7D32); // Green 800
      backgroundColor = const Color(0xFFC8E6C9); // Green 100
      statusText = '';
    }

    if (isSessionEnded) {
      progressColor = progressColor.withValues(alpha: 0.5);
      backgroundColor = backgroundColor.withValues(alpha: 0.5);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: SizedBox(
                  height: 6,
                  child: LinearProgressIndicator(
                    value: percentage,
                    backgroundColor: backgroundColor,
                    valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              '$current / $capacity checked in',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isSessionEnded
                    ? theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.6)
                    : theme.colorScheme.onSurfaceVariant,
              ),
            ),
            if (statusText.isNotEmpty) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: progressColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: progressColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
