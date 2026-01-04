import 'package:flutter/material.dart';

/// Connection Status Indicator
class ConnectionIndicator extends StatelessWidget {
  final bool isConnected;
  final bool isConnecting;
  final VoidCallback? onTap;
  final bool showLabel;

  const ConnectionIndicator({
    super.key,
    required this.isConnected,
    this.isConnecting = false,
    this.onTap,
    this.showLabel = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isConnecting) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              if (showLabel) ...[
                const SizedBox(width: 6),
                Text(
                  'Connecting...',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    final color = isConnected ? Colors.green : Colors.red;
    final label = isConnected ? 'Connected' : 'Disconnected';
    final icon = isConnected ? Icons.wifi : Icons.wifi_off;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            if (showLabel) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Connection Banner (shown when disconnected)
class ConnectionBanner extends StatelessWidget {
  final bool isConnected;
  final VoidCallback? onRetry;

  const ConnectionBanner({
    super.key,
    required this.isConnected,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    if (isConnected) return const SizedBox.shrink();

    return MaterialBanner(
      backgroundColor: Colors.red.shade50,
      leading: Icon(Icons.wifi_off, color: Colors.red.shade700),
      content: Text(
        'Connection lost. Some features may not work.',
        style: TextStyle(color: Colors.red.shade700),
      ),
      actions: [
        if (onRetry != null)
          TextButton(
            onPressed: onRetry,
            child: const Text('RETRY'),
          ),
      ],
    );
  }
}
