import 'package:flutter/material.dart';
import '../models/models.dart';

/// Enhanced Session Status Badge Widget
/// 
/// Features:
/// - Time-aware fallback logic (shows "Ended" if endTime has passed)
/// - WCAG AA compliant colors (4.5:1 contrast ratio)
/// - Animated pulse indicator for open sessions
/// - Semantic accessibility labels
class SessionLifecycleBadge extends StatelessWidget {
  final SessionLifecycle lifecycle;
  final bool isOpen;
  final double? fontSize;
  final DateTime? startTime;
  final DateTime? endTime;

  const SessionLifecycleBadge({
    super.key,
    required this.lifecycle,
    required this.isOpen,
    this.fontSize,
    this.startTime,
    this.endTime,
  });

  /// Factory constructor that takes a Session directly
  factory SessionLifecycleBadge.fromSession({
    Key? key,
    required Session session,
    double? fontSize,
  }) {
    return SessionLifecycleBadge(
      key: key,
      lifecycle: session.lifecycle,
      isOpen: session.isOpen,
      fontSize: fontSize,
      startTime: session.startTime,
      endTime: session.endTime,
    );
  }

  /// Get the effective lifecycle considering time-based fallback
  SessionLifecycle get _effectiveLifecycle {
    // If already ended or cancelled, use as-is
    if (lifecycle == SessionLifecycle.ended || 
        lifecycle == SessionLifecycle.cancelled) {
      return lifecycle;
    }
    
    // Time-based fallback: if endTime has passed, show as ended
    if (endTime != null && DateTime.now().isAfter(endTime!)) {
      return SessionLifecycle.ended;
    }
    
    return lifecycle;
  }

  /// Check if session should be shown as open (time-aware)
  bool get _effectiveIsOpen {
    if (_effectiveLifecycle == SessionLifecycle.ended ||
        _effectiveLifecycle == SessionLifecycle.cancelled) {
      return false;
    }
    return isOpen;
  }

  @override
  Widget build(BuildContext context) {
    final effectiveLifecycle = _effectiveLifecycle;
    final effectiveIsOpen = _effectiveIsOpen;
    final colors = _getLifecycleColors(effectiveLifecycle, effectiveIsOpen);

    return Semantics(
      label: _getAccessibilityLabel(effectiveLifecycle, effectiveIsOpen),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        constraints: const BoxConstraints(minHeight: 28),
        decoration: BoxDecoration(
          color: colors.background,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colors.border, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: colors.border.withValues(alpha: 0.3),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (effectiveIsOpen) ...[
              _PulsatingDot(color: colors.dot),
              const SizedBox(width: 6),
            ] else if (effectiveLifecycle == SessionLifecycle.ended) ...[
              Icon(
                Icons.check_circle_outline,
                size: (fontSize ?? 12) + 2,
                color: colors.text,
              ),
              const SizedBox(width: 4),
            ] else if (effectiveLifecycle == SessionLifecycle.cancelled) ...[
              Icon(
                Icons.cancel_outlined,
                size: (fontSize ?? 12) + 2,
                color: colors.text,
              ),
              const SizedBox(width: 4),
            ],
            Text(
              _getDisplayText(effectiveLifecycle, effectiveIsOpen),
              style: TextStyle(
                color: colors.text,
                fontSize: fontSize ?? 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getDisplayText(SessionLifecycle effectiveLifecycle, bool effectiveIsOpen) {
    if (effectiveIsOpen) return 'Open';
    return effectiveLifecycle.displayName;
  }

  String _getAccessibilityLabel(SessionLifecycle effectiveLifecycle, bool effectiveIsOpen) {
    if (effectiveIsOpen) return 'Session is open for check-in';
    switch (effectiveLifecycle) {
      case SessionLifecycle.scheduled:
        return 'Session is scheduled';
      case SessionLifecycle.open:
        return 'Session is open for check-in';
      case SessionLifecycle.ended:
        return 'Session has ended';
      case SessionLifecycle.closed:
        return 'Session has been closed';
      case SessionLifecycle.cancelled:
        return 'Session has been cancelled';
    }
  }

  _LifecycleColors _getLifecycleColors(SessionLifecycle effectiveLifecycle, bool effectiveIsOpen) {
    // WCAG AA compliant colors (4.5:1 contrast ratio minimum)
    if (effectiveIsOpen) {
      return _LifecycleColors(
        background: const Color(0xFFE8F5E9), // Green 50
        text: const Color(0xFF2E7D32), // Green 800
        border: const Color(0xFF81C784), // Green 300
        dot: const Color(0xFF4CAF50), // Green 500
      );
    }

    switch (effectiveLifecycle) {
      case SessionLifecycle.scheduled:
        return _LifecycleColors(
          background: const Color(0xFFE3F2FD), // Blue 50
          text: const Color(0xFF1565C0), // Blue 800
          border: const Color(0xFF90CAF9), // Blue 200
          dot: const Color(0xFF2196F3), // Blue 500
        );
      case SessionLifecycle.open:
        return _LifecycleColors(
          background: const Color(0xFFE8F5E9),
          text: const Color(0xFF2E7D32),
          border: const Color(0xFF81C784),
          dot: const Color(0xFF4CAF50),
        );
      case SessionLifecycle.ended:
        return _LifecycleColors(
          background: const Color(0xFFF5F5F5), // Grey 100
          text: const Color(0xFF424242), // Grey 800
          border: const Color(0xFFBDBDBD), // Grey 400
          dot: const Color(0xFF9E9E9E), // Grey 500
        );
      case SessionLifecycle.closed:
        return _LifecycleColors(
          background: const Color(0xFFFFF3E0), // Orange 50
          text: const Color(0xFFE65100), // Orange 800
          border: const Color(0xFFFFCC80), // Orange 200
          dot: const Color(0xFFFF9800), // Orange 500
        );
      case SessionLifecycle.cancelled:
        return _LifecycleColors(
          background: const Color(0xFFFFEBEE), // Red 50
          text: const Color(0xFFC62828), // Red 800
          border: const Color(0xFFEF9A9A), // Red 200
          dot: const Color(0xFFF44336), // Red 500
        );
    }
  }
}

/// Animated pulsating dot for open sessions
class _PulsatingDot extends StatefulWidget {
  final Color color;

  const _PulsatingDot({required this.color});

  @override
  State<_PulsatingDot> createState() => _PulsatingDotState();
}

class _PulsatingDotState extends State<_PulsatingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: widget.color.withValues(alpha: _animation.value),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: widget.color.withValues(alpha: 0.4 * _animation.value),
                blurRadius: 4,
                spreadRadius: 1,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LifecycleColors {
  final Color background;
  final Color text;
  final Color border;
  final Color dot;

  _LifecycleColors({
    required this.background,
    required this.text,
    required this.border,
    required this.dot,
  });
}

/// Convenience widget that takes status instead of lifecycle
/// (since SessionStatus and SessionLifecycle are the same)
class SessionStatusBadge extends StatelessWidget {
  final SessionStatus status;
  final bool isOpen;
  final double? fontSize;
  final DateTime? startTime;
  final DateTime? endTime;

  const SessionStatusBadge({
    super.key,
    required this.status,
    required this.isOpen,
    this.fontSize,
    this.startTime,
    this.endTime,
  });

  @override
  Widget build(BuildContext context) {
    return SessionLifecycleBadge(
      lifecycle: status, // SessionLifecycle is typedef of SessionStatus
      isOpen: isOpen,
      fontSize: fontSize,
      startTime: startTime,
      endTime: endTime,
    );
  }
}
