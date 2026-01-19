import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Session filter options
enum SessionFilter {
  all,
  open,
  ended;

  String get label {
    switch (this) {
      case SessionFilter.all:
        return 'All';
      case SessionFilter.open:
        return 'Open';
      case SessionFilter.ended:
        return 'Ended';
    }
  }

  IconData get icon {
    switch (this) {
      case SessionFilter.all:
        return Icons.list_alt_rounded;
      case SessionFilter.open:
        return Icons.play_circle_outline_rounded;
      case SessionFilter.ended:
        return Icons.check_circle_outline_rounded;
    }
  }
}

/// Compact filter tabs for session filtering with swipe support
/// 
/// Features:
/// - WCAG AA compliant colors
/// - Compact design for better content density
/// - Tab-style navigation with indicator
/// - Smooth animations
/// - Haptic feedback
class SessionFilterChips extends StatelessWidget {
  final SessionFilter selectedFilter;
  final ValueChanged<SessionFilter> onFilterChanged;
  final Map<SessionFilter, int>? counts;

  const SessionFilterChips({
    super.key,
    required this.selectedFilter,
    required this.onFilterChanged,
    this.counts,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Container(
      height: 36,
      decoration: BoxDecoration(
        color: isDark 
            ? theme.colorScheme.surfaceContainerHigh.withValues(alpha: 0.5)
            : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(10),
      ),
      padding: const EdgeInsets.all(3),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: SessionFilter.values.map((filter) {
          final isSelected = filter == selectedFilter;
          final count = counts?[filter];
          
          return _CompactFilterTab(
            filter: filter,
            isSelected: isSelected,
            count: count,
            onTap: () {
              HapticFeedback.lightImpact();
              onFilterChanged(filter);
            },
          );
        }).toList(),
      ),
    );
  }
}

class _CompactFilterTab extends StatelessWidget {
  final SessionFilter filter;
  final bool isSelected;
  final int? count;
  final VoidCallback onTap;

  const _CompactFilterTab({
    required this.filter,
    required this.isSelected,
    this.count,
    required this.onTap,
  });

  Color _getSelectedColor(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    switch (filter) {
      case SessionFilter.all:
        return isDark ? const Color(0xFF1976D2) : const Color(0xFF1565C0);
      case SessionFilter.open:
        return isDark ? const Color(0xFF388E3C) : const Color(0xFF2E7D32);
      case SessionFilter.ended:
        return isDark ? const Color(0xFF616161) : const Color(0xFF424242);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final selectedColor = _getSelectedColor(context);

    return Semantics(
      button: true,
      selected: isSelected,
      label: '${filter.label} sessions${count != null ? ', $count sessions' : ''}',
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          constraints: const BoxConstraints(minWidth: 60),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? selectedColor : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: selectedColor.withValues(alpha: 0.3),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                filter.label,
                style: TextStyle(
                  color: isSelected 
                      ? Colors.white 
                      : (isDark ? theme.colorScheme.onSurfaceVariant : theme.colorScheme.onSurface),
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  letterSpacing: 0.1,
                ),
              ),
              if (count != null) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Colors.white.withValues(alpha: 0.25)
                        : (isDark 
                            ? theme.colorScheme.surfaceContainerHighest 
                            : theme.colorScheme.primaryContainer.withValues(alpha: 0.5)),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    count.toString(),
                    style: TextStyle(
                      color: isSelected
                          ? Colors.white
                          : (isDark 
                              ? theme.colorScheme.onSurfaceVariant 
                              : theme.colorScheme.onPrimaryContainer),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
