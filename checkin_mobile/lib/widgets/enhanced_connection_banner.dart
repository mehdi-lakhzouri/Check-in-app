import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Enhanced Connection Banner with animations
/// 
/// Shows prominent banner when offline with retry button
class EnhancedConnectionBanner extends StatelessWidget {
  final bool isOffline;
  final bool isReconnecting;
  final VoidCallback? onRetry;
  final int? pendingCount;

  const EnhancedConnectionBanner({
    super.key,
    required this.isOffline,
    this.isReconnecting = false,
    this.onRetry,
    this.pendingCount,
  });

  @override
  Widget build(BuildContext context) {
    if (!isOffline) return const SizedBox.shrink();

    return Material(
      color: Colors.red.shade700,
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              // Icon with animation
              Icon(
                Icons.wifi_off,
                color: Colors.white,
                size: 20,
              )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .fade(begin: 1, end: 0.5, duration: 800.ms),
              
              const SizedBox(width: 12),
              
              // Message
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'No internet connection',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    if (pendingCount != null && pendingCount! > 0)
                      Text(
                        '$pendingCount check-in${pendingCount! > 1 ? 's' : ''} pending sync',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 12,
                        ),
                      )
                    else
                      Text(
                        'Check-ins will be queued',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
              
              // Retry button
              if (isReconnecting)
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation(Colors.white),
                  ),
                )
              else
                TextButton(
                  onPressed: onRetry,
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.2),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  ),
                  child: const Text('RETRY'),
                ),
            ],
          ),
        ),
      ),
    )
    .animate()
    .slideY(begin: -1, end: 0, duration: 300.ms, curve: Curves.easeOut)
    .fadeIn(duration: 300.ms);
  }
}

/// Minimal connection indicator for app bars
class MinimalConnectionIndicator extends StatelessWidget {
  final bool isConnected;
  final bool isConnecting;
  final VoidCallback? onTap;

  const MinimalConnectionIndicator({
    super.key,
    required this.isConnected,
    this.isConnecting = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isConnecting)
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(
                    Theme.of(context).colorScheme.primary,
                  ),
                ),
              )
            else
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isConnected ? Colors.green : Colors.red,
                ),
              )
              .animate(
                target: isConnected ? 0 : 1,
                onPlay: (c) {
                  if (!isConnected) c.repeat(reverse: true);
                },
              )
              .scale(
                begin: const Offset(1, 1),
                end: const Offset(1.2, 1.2),
                duration: 600.ms,
              ),
          ],
        ),
      ),
    );
  }
}

/// Toast-style connection notification
class ConnectionToast extends StatelessWidget {
  final bool isConnected;
  final VoidCallback? onDismiss;

  const ConnectionToast({
    super.key,
    required this.isConnected,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final color = isConnected ? Colors.green : Colors.red;
    final icon = isConnected ? Icons.wifi : Icons.wifi_off;
    final message = isConnected ? 'Connected' : 'Connection lost';

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.4),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Text(
            message,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    )
    .animate()
    .fadeIn(duration: 200.ms)
    .slideY(begin: 0.5, end: 0, duration: 300.ms, curve: Curves.easeOut)
    .then(delay: 2.seconds)
    .fadeOut(duration: 200.ms)
    .callback(callback: (_) => onDismiss?.call());
  }
}
