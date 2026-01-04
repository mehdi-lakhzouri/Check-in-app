import 'package:flutter/material.dart';
import '../models/models.dart';

/// Session Status Badge Widget
class SessionStatusBadge extends StatelessWidget {
  final SessionStatus status;
  final bool isOpen;
  final double? fontSize;

  const SessionStatusBadge({
    super.key,
    required this.status,
    required this.isOpen,
    this.fontSize,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = _getStatusColors(theme);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isOpen) ...[
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: colors.dot,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            _getDisplayText(),
            style: TextStyle(
              color: colors.text,
              fontSize: fontSize ?? 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _getDisplayText() {
    if (isOpen) return 'Open';
    return status.displayName;
  }

  _StatusColors _getStatusColors(ThemeData theme) {
    if (isOpen) {
      return _StatusColors(
        background: Colors.green.shade50,
        text: Colors.green.shade700,
        border: Colors.green.shade200,
        dot: Colors.green.shade500,
      );
    }

    switch (status) {
      case SessionStatus.scheduled:
        return _StatusColors(
          background: Colors.blue.shade50,
          text: Colors.blue.shade700,
          border: Colors.blue.shade200,
          dot: Colors.blue.shade500,
        );
      case SessionStatus.open:
        return _StatusColors(
          background: Colors.green.shade50,
          text: Colors.green.shade700,
          border: Colors.green.shade200,
          dot: Colors.green.shade500,
        );
      case SessionStatus.ended:
        return _StatusColors(
          background: Colors.grey.shade100,
          text: Colors.grey.shade700,
          border: Colors.grey.shade300,
          dot: Colors.grey.shade500,
        );
      case SessionStatus.closed:
        return _StatusColors(
          background: Colors.orange.shade50,
          text: Colors.orange.shade700,
          border: Colors.orange.shade200,
          dot: Colors.orange.shade500,
        );
      case SessionStatus.cancelled:
        return _StatusColors(
          background: Colors.red.shade50,
          text: Colors.red.shade700,
          border: Colors.red.shade200,
          dot: Colors.red.shade500,
        );
    }
  }
}

class _StatusColors {
  final Color background;
  final Color text;
  final Color border;
  final Color dot;

  _StatusColors({
    required this.background,
    required this.text,
    required this.border,
    required this.dot,
  });
}
