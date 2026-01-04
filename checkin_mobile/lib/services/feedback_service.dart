import 'package:flutter/services.dart';
import 'package:vibration/vibration.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

/// Feedback Service for haptic and audio feedback
/// 
/// Provides tactile and audio feedback for check-in operations,
/// essential for noisy conference environments.
class FeedbackService {
  static final FeedbackService _instance = FeedbackService._internal();
  factory FeedbackService() => _instance;
  FeedbackService._internal();

  final AudioPlayer _player = AudioPlayer();
  bool? _hasVibrator;
  bool _initialized = false;

  /// Initialize the feedback service
  Future<void> init() async {
    if (_initialized) return;
    
    try {
      _hasVibrator = await Vibration.hasVibrator();
      
      // Pre-load audio for faster playback
      await _player.setSource(AssetSource('sounds/success.mp3'));
      await _player.setReleaseMode(ReleaseMode.stop);
      
      _initialized = true;
      debugPrint('FeedbackService initialized. Vibrator: $_hasVibrator');
    } catch (e) {
      debugPrint('FeedbackService init error: $e');
      _initialized = true; // Mark as initialized to prevent retry loops
    }
  }

  /// Success feedback - strong vibration + success sound
  /// 
  /// Used after successful check-in
  Future<void> success() async {
    await _hapticSuccess();
    await _playSound('sounds/success.mp3');
  }

  /// Error feedback - pattern vibration + error sound
  /// 
  /// Used when check-in fails
  Future<void> error() async {
    await _hapticError();
    await _playSound('sounds/error.mp3');
  }

  /// Warning feedback - light vibration only
  /// 
  /// Used for warnings like "already checked in"
  Future<void> warning() async {
    await _hapticWarning();
  }

  /// Light tap feedback for button presses
  Future<void> lightTap() async {
    await HapticFeedback.lightImpact();
  }

  /// Medium tap feedback for important actions
  Future<void> mediumTap() async {
    await HapticFeedback.mediumImpact();
  }

  /// Selection feedback for list selections
  Future<void> selectionTap() async {
    await HapticFeedback.selectionClick();
  }

  // Private haptic methods
  Future<void> _hapticSuccess() async {
    try {
      if (_hasVibrator == true) {
        // Strong single vibration for success
        await Vibration.vibrate(duration: 100, amplitude: 200);
      } else {
        await HapticFeedback.heavyImpact();
      }
    } catch (e) {
      // Fallback to system haptics
      await HapticFeedback.heavyImpact();
    }
  }

  Future<void> _hapticError() async {
    try {
      if (_hasVibrator == true) {
        // Double pulse for error
        await Vibration.vibrate(
          pattern: [0, 100, 100, 100],
          intensities: [0, 200, 0, 200],
        );
      } else {
        await HapticFeedback.heavyImpact();
        await Future.delayed(const Duration(milliseconds: 100));
        await HapticFeedback.heavyImpact();
      }
    } catch (e) {
      await HapticFeedback.heavyImpact();
    }
  }

  Future<void> _hapticWarning() async {
    try {
      if (_hasVibrator == true) {
        await Vibration.vibrate(duration: 50, amplitude: 100);
      } else {
        await HapticFeedback.mediumImpact();
      }
    } catch (e) {
      await HapticFeedback.mediumImpact();
    }
  }

  Future<void> _playSound(String assetPath) async {
    try {
      await _player.stop();
      await _player.play(AssetSource(assetPath));
    } catch (e) {
      debugPrint('Sound playback error: $e');
    }
  }

  /// Dispose of resources
  void dispose() {
    _player.dispose();
  }
}
