import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/providers.dart';
import 'sessions_screen.dart';

/// Ultra-lean, modern splash screen with elegant animations
/// Design: Minimalist, professional, platform-neutral
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  // Animation controllers
  late final AnimationController _logoController;
  late final AnimationController _textController;
  late final AnimationController _loadingController;
  late final AnimationController _breatheController;

  // Animations
  late final Animation<double> _logoScale;
  late final Animation<double> _logoOpacity;
  late final Animation<double> _titleOpacity;
  late final Animation<Offset> _titleSlide;
  late final Animation<double> _subtitleOpacity;
  late final Animation<Offset> _subtitleSlide;
  late final Animation<double> _loadingOpacity;
  late final Animation<double> _breatheAnimation;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startAnimationSequence();
    _initApp();
  }

  void _setupAnimations() {
    // Logo animation - scale and fade in
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _logoScale = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: Curves.easeOutBack,
      ),
    );

    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    // Text animations - staggered fade and slide
    _textController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _titleOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    _titleSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.0, 0.7, curve: Curves.easeOutCubic),
      ),
    );

    _subtitleOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.3, 0.9, curve: Curves.easeOut),
      ),
    );

    _subtitleSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.3, 1.0, curve: Curves.easeOutCubic),
      ),
    );

    // Loading indicator fade in
    _loadingController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _loadingOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _loadingController,
        curve: Curves.easeOut,
      ),
    );

    // Subtle breathing effect for logo container
    _breatheController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _breatheAnimation = Tween<double>(begin: 1.0, end: 1.02).animate(
      CurvedAnimation(
        parent: _breatheController,
        curve: Curves.easeInOut,
      ),
    );
  }

  void _startAnimationSequence() async {
    // Set system UI for immersive splash experience
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Color(0xFFF8FAFC),
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );

    // Staggered animation sequence
    await Future.delayed(const Duration(milliseconds: 100));
    _logoController.forward();

    await Future.delayed(const Duration(milliseconds: 300));
    _textController.forward();

    await Future.delayed(const Duration(milliseconds: 400));
    _loadingController.forward();

    // Start breathing loop
    _breatheController.repeat(reverse: true);
  }

  Future<void> _initApp() async {
    // Initialize settings
    await ref.read(settingsProvider.notifier).init();

    if (!mounted) return;

    // Minimum splash display time for smooth UX
    await Future.delayed(const Duration(milliseconds: 1800));

    if (!mounted) return;

    // Connect to server and navigate
    ref.read(connectionProvider.notifier).connect();
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const SessionsScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(
              parent: animation,
              curve: Curves.easeOut,
            ),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 400),
      ),
    );
  }

  @override
  void dispose() {
    _logoController.dispose();
    _textController.dispose();
    _loadingController.dispose();
    _breatheController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          // Soft, professional gradient - muted cream to warm white
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFF8FAFC), // Slate 50
              Color(0xFFF1F5F9), // Slate 100
              Color(0xFFE2E8F0), // Slate 200
            ],
            stops: [0.0, 0.5, 1.0],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // Subtle decorative elements
              _buildBackgroundAccents(),

              // Main content
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Spacer(flex: 3),

                    // Animated logo container
                    _buildLogoSection(),

                    const SizedBox(height: 40),

                    // Title and subtitle
                    _buildTextSection(),

                    const Spacer(flex: 2),

                    // Elegant loading indicator
                    _buildLoadingIndicator(),

                    const SizedBox(height: 48),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackgroundAccents() {
    return Positioned.fill(
      child: AnimatedBuilder(
        animation: _breatheController,
        builder: (context, child) {
          return CustomPaint(
            painter: _BackgroundAccentPainter(
              progress: _breatheAnimation.value,
            ),
          );
        },
      ),
    );
  }

  Widget _buildLogoSection() {
    return AnimatedBuilder(
      animation: Listenable.merge([_logoController, _breatheController]),
      builder: (context, child) {
        return Transform.scale(
          scale: _logoScale.value * _breatheAnimation.value,
          child: Opacity(
            opacity: _logoOpacity.value,
            child: Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E88E5).withValues(alpha: 0.08),
                    blurRadius: 32,
                    offset: const Offset(0, 8),
                    spreadRadius: 0,
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Center(
                child: _buildAnimatedIcon(),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnimatedIcon() {
    return ShaderMask(
      shaderCallback: (bounds) => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color(0xFF1E88E5), // Primary blue
          Color(0xFF42A5F5), // Lighter blue
        ],
      ).createShader(bounds),
      child: const Icon(
        Icons.qr_code_scanner_rounded,
        size: 44,
        color: Colors.white,
      ),
    );
  }

  Widget _buildTextSection() {
    return AnimatedBuilder(
      animation: _textController,
      builder: (context, child) {
        return Column(
          children: [
            // App name
            SlideTransition(
              position: _titleSlide,
              child: Opacity(
                opacity: _titleOpacity.value,
                child: const Text(
                  'IASTAM',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                    color: Color(0xFF1E293B), // Slate 800
                    height: 1.2,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 6),

            // Subtitle
            SlideTransition(
              position: _subtitleSlide,
              child: Opacity(
                opacity: _subtitleOpacity.value,
                child: const Text(
                  'Check-in Portal',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    letterSpacing: 0.5,
                    color: Color(0xFF64748B), // Slate 500
                    height: 1.4,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildLoadingIndicator() {
    return AnimatedBuilder(
      animation: _loadingController,
      builder: (context, child) {
        return Opacity(
          opacity: _loadingOpacity.value,
          child: const _PulsingDotsLoader(),
        );
      },
    );
  }
}

/// Elegant pulsing dots loading indicator
class _PulsingDotsLoader extends StatefulWidget {
  const _PulsingDotsLoader();

  @override
  State<_PulsingDotsLoader> createState() => _PulsingDotsLoaderState();
}

class _PulsingDotsLoaderState extends State<_PulsingDotsLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 24,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (index) {
          return AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final delay = index * 0.2;
              final progress = (_controller.value - delay) % 1.0;
              final scale = _calculateDotScale(progress);
              final opacity = _calculateDotOpacity(progress);

              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                child: Transform.scale(
                  scale: scale,
                  child: Opacity(
                    opacity: opacity,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            const Color(0xFF1E88E5).withValues(alpha: 0.8),
                            const Color(0xFF42A5F5).withValues(alpha: 0.6),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          );
        }),
      ),
    );
  }

  double _calculateDotScale(double progress) {
    if (progress < 0.5) {
      return 0.6 + (0.4 * (progress * 2)); // Scale up
    } else {
      return 1.0 - (0.4 * ((progress - 0.5) * 2)); // Scale down
    }
  }

  double _calculateDotOpacity(double progress) {
    if (progress < 0.5) {
      return 0.4 + (0.6 * (progress * 2)); // Fade in
    } else {
      return 1.0 - (0.6 * ((progress - 0.5) * 2)); // Fade out
    }
  }
}

/// Subtle background accent painter
class _BackgroundAccentPainter extends CustomPainter {
  final double progress;

  _BackgroundAccentPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.fill
      ..shader = RadialGradient(
        center: const Alignment(-0.5, -0.5),
        radius: 1.2,
        colors: [
          const Color(0xFF1E88E5).withValues(alpha: 0.03 * progress),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.2, size.height * 0.3),
        width: size.width * 0.8 * progress,
        height: size.height * 0.5 * progress,
      ),
      paint,
    );

    // Second subtle accent
    final paint2 = Paint()
      ..style = PaintingStyle.fill
      ..shader = RadialGradient(
        center: const Alignment(0.5, 0.5),
        radius: 1.0,
        colors: [
          const Color(0xFF64B5F6).withValues(alpha: 0.02 * progress),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.8, size.height * 0.7),
        width: size.width * 0.6 * progress,
        height: size.height * 0.4 * progress,
      ),
      paint2,
    );
  }

  @override
  bool shouldRepaint(_BackgroundAccentPainter oldDelegate) =>
      oldDelegate.progress != progress;
}
