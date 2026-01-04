import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Animated Check-in Result Widget
/// 
/// Provides engaging visual feedback for check-in results
class AnimatedCheckInResult extends StatelessWidget {
  final bool success;
  final String title;
  final String? subtitle;
  final VoidCallback? onAnimationComplete;

  const AnimatedCheckInResult({
    super.key,
    required this.success,
    required this.title,
    this.subtitle,
    this.onAnimationComplete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = success ? Colors.green : Colors.red;
    
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Animated icon
        _AnimatedResultIcon(
          success: success,
          onComplete: onAnimationComplete,
        ),
        
        const SizedBox(height: 24),
        
        // Title with fade-in
        Text(
          title,
          style: theme.textTheme.headlineSmall?.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        )
        .animate(delay: 300.ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.3, end: 0),
        
        if (subtitle != null) ...[
          const SizedBox(height: 8),
          Text(
            subtitle!,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          )
          .animate(delay: 500.ms)
          .fadeIn(duration: 400.ms),
        ],
      ],
    );
  }
}

/// Animated icon with scale and color effects
class _AnimatedResultIcon extends StatelessWidget {
  final bool success;
  final VoidCallback? onComplete;

  const _AnimatedResultIcon({
    required this.success,
    this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    final color = success ? Colors.green : Colors.red;
    final icon = success ? Icons.check_circle : Icons.cancel;
    
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.1),
      ),
      child: Icon(
        icon,
        size: 80,
        color: color,
      ),
    )
    .animate(onComplete: (_) => onComplete?.call())
    .scale(
      begin: const Offset(0, 0),
      end: const Offset(1, 1),
      duration: 400.ms,
      curve: Curves.elasticOut,
    )
    .then() // Chain animations
    .shimmer(
      duration: 1200.ms,
      color: color.withValues(alpha: 0.3),
    );
  }
}

/// Pulsing status indicator
class PulsingIndicator extends StatelessWidget {
  final Color color;
  final double size;

  const PulsingIndicator({
    super.key,
    required this.color,
    this.size = 12,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
      ),
    )
    .animate(onPlay: (c) => c.repeat(reverse: true))
    .scale(begin: const Offset(1, 1), end: const Offset(1.3, 1.3), duration: 600.ms)
    .fade(begin: 1, end: 0.5, duration: 600.ms);
  }
}

/// Connection status animation
class ConnectionStatusAnimation extends StatelessWidget {
  final bool isConnected;
  final bool isConnecting;

  const ConnectionStatusAnimation({
    super.key,
    required this.isConnected,
    required this.isConnecting,
  });

  @override
  Widget build(BuildContext context) {
    if (isConnecting) {
      return const SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(
          strokeWidth: 2,
        ),
      );
    }
    
    return Icon(
      isConnected ? Icons.wifi : Icons.wifi_off,
      color: isConnected ? Colors.green : Colors.red,
      size: 20,
    )
    .animate(target: isConnected ? 0 : 1)
    .shake(hz: 2, duration: 500.ms);
  }
}

/// Capacity progress animation
class AnimatedCapacityBar extends StatelessWidget {
  final double progress;
  final Color color;

  const AnimatedCapacityBar({
    super.key,
    required this.progress,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 8,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        color: color.withValues(alpha: 0.2),
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: progress.clamp(0.0, 1.0),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            color: color,
          ),
        ),
      ),
    )
    .animate()
    .scaleX(begin: 0, end: 1, duration: 800.ms, curve: Curves.easeOutCubic);
  }
}

/// Scanning animation overlay
class ScanningAnimation extends StatelessWidget {
  const ScanningAnimation({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 250,
      height: 250,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white, width: 2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Stack(
        children: [
          // Scanning line
          Positioned(
            left: 0,
            right: 0,
            child: Container(
              height: 2,
              color: Colors.green,
            )
            .animate(onPlay: (c) => c.repeat())
            .moveY(begin: 0, end: 246, duration: 2.seconds)
            .then()
            .moveY(begin: 246, end: 0, duration: 2.seconds),
          ),
          
          // Corner decorations
          ..._buildCorners(),
        ],
      ),
    );
  }

  List<Widget> _buildCorners() {
    const cornerSize = 30.0;
    const cornerWidth = 4.0;
    
    return [
      // Top-left
      Positioned(
        top: 0, left: 0,
        child: _Corner(cornerSize: cornerSize, cornerWidth: cornerWidth),
      ),
      // Top-right
      Positioned(
        top: 0, right: 0,
        child: Transform.rotate(
          angle: 1.5708, // 90 degrees
          child: _Corner(cornerSize: cornerSize, cornerWidth: cornerWidth),
        ),
      ),
      // Bottom-left
      Positioned(
        bottom: 0, left: 0,
        child: Transform.rotate(
          angle: -1.5708, // -90 degrees
          child: _Corner(cornerSize: cornerSize, cornerWidth: cornerWidth),
        ),
      ),
      // Bottom-right
      Positioned(
        bottom: 0, right: 0,
        child: Transform.rotate(
          angle: 3.1416, // 180 degrees
          child: _Corner(cornerSize: cornerSize, cornerWidth: cornerWidth),
        ),
      ),
    ];
  }
}

class _Corner extends StatelessWidget {
  final double cornerSize;
  final double cornerWidth;

  const _Corner({required this.cornerSize, required this.cornerWidth});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: cornerSize,
      height: cornerSize,
      child: CustomPaint(
        painter: _CornerPainter(cornerWidth),
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  final double strokeWidth;
  
  _CornerPainter(this.strokeWidth);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    
    final path = Path()
      ..moveTo(0, size.height)
      ..lineTo(0, 0)
      ..lineTo(size.width, 0);
    
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
