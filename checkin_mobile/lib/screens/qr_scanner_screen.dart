import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/feedback_service.dart';
import '../utils/permission_utils.dart';
import 'checkin_result_screen.dart';
import 'verification_screen.dart';

/// QR Scanner Screen - auto-accepts registered participants
class QrScannerScreen extends ConsumerStatefulWidget {
  final Session session;

  const QrScannerScreen({
    super.key,
    required this.session,
  });

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> {
  MobileScannerController? _controller;
  bool _isProcessing = false;
  String? _lastScannedCode;
  bool _hasPermission = false;
  bool _isCheckingPermission = true;
  final _feedbackService = FeedbackService();

  @override
  void initState() {
    super.initState();
    _feedbackService.init();
    _checkPermissionAndInitCamera();
  }

  Future<void> _checkPermissionAndInitCamera() async {
    setState(() => _isCheckingPermission = true);
    
    final hasPermission = await PermissionUtils.hasCameraPermission();
    
    if (hasPermission) {
      _initCamera();
    } else if (mounted) {
      final granted = await PermissionUtils.requestCameraPermission(context);
      if (granted) {
        _initCamera();
      }
    }
    
    if (mounted) {
      final finalPermission = hasPermission || await PermissionUtils.hasCameraPermission();
      if (mounted) {
        setState(() {
          _hasPermission = finalPermission;
          _isCheckingPermission = false;
        });
      }
    }
  }

  void _initCamera() {
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
    );
    if (mounted) setState(() => _hasPermission = true);
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;

    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    // Validate QR code format
    if (!code.startsWith(AppConfig.qrCodePrefix)) {
      await _feedbackService.warning();
      _showError('Invalid QR code format');
      return;
    }

    // Prevent duplicate scans
    if (code == _lastScannedCode) return;
    _lastScannedCode = code;

    setState(() => _isProcessing = true);
    await _feedbackService.lightTap(); // Tactile feedback on scan detection

    // Verify QR code first
    final verification = await ref.read(checkInProvider.notifier).verifyQr(
          qrCode: code,
          sessionId: widget.session.id,
        );

    if (!mounted) return;

    if (verification != null) {
      // If participant is REGISTERED, auto-accept immediately
      if (verification.isRegistered) {
        await _autoAcceptRegisteredParticipant(verification);
      } 
      // If NOT_REGISTERED or ALREADY_CHECKED_IN, show verification screen
      else {
        setState(() => _isProcessing = false);
        await _feedbackService.lightTap();
        
        if (!mounted) return;
        
        // Navigate to verification screen for manual decision
        final shouldContinue = await Navigator.of(context).push<bool>(
          MaterialPageRoute(
            builder: (_) => VerificationScreen(
              verification: verification,
              session: widget.session,
            ),
          ),
        );

        if (shouldContinue == false && mounted) {
          Navigator.of(context).pop();
        }
      }
    } else {
      setState(() => _isProcessing = false);
      // Show error from provider
      await _feedbackService.error();
      final error = ref.read(checkInProvider).verification.error ?? 
                    ref.read(checkInProvider).error;
      if (error != null) {
        _showError(error);
      }
    }

    // Reset last scanned code after a delay
    await Future.delayed(const Duration(seconds: 2));
    _lastScannedCode = null;
  }

  /// Auto-accept registered participants without showing Accept/Decline UI
  Future<void> _autoAcceptRegisteredParticipant(VerificationResult verification) async {
    final result = await ref.read(checkInProvider.notifier).acceptCheckIn(
      participantId: verification.participantId,
      sessionId: widget.session.id,
    );

    if (!mounted) return;
    setState(() => _isProcessing = false);

    if (result != null && result.isSuccess) {
      await _feedbackService.success();
      
      if (!mounted) return;
      
      // Show brief success result
      final shouldContinue = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => CheckInResultScreen(
            result: CheckInResult(
              status: 'success',
              message: 'Check-in successful',
              checkIn: result.checkIn,
              capacityInfo: result.capacityInfo,
              participant: verification.participant,
            ),
            session: widget.session,
          ),
        ),
      );

      if (shouldContinue == false && mounted) {
        Navigator.of(context).pop();
      }
    } else {
      await _feedbackService.error();
      final error = ref.read(checkInProvider).error;
      if (error != null) {
        _showError(error);
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Show permission request screen if no permission
    if (_isCheckingPermission) {
      return Scaffold(
        appBar: AppBar(title: const Text('Scan QR Code')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (!_hasPermission) {
      return Scaffold(
        appBar: AppBar(title: const Text('Scan QR Code')),
        body: _buildPermissionDeniedView(theme),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR Code'),
        actions: [
          if (_controller != null) ...[
            IconButton(
              icon: ValueListenableBuilder(
                valueListenable: _controller!,
                builder: (context, state, child) {
                  return Icon(
                    state.torchState == TorchState.on
                        ? Icons.flash_on
                        : Icons.flash_off,
                  );
                },
              ),
              onPressed: () => _controller?.toggleTorch(),
            ),
            IconButton(
              icon: const Icon(Icons.flip_camera_ios),
              onPressed: () => _controller?.switchCamera(),
            ),
          ],
        ],
      ),
      body: Stack(
        children: [
          // Scanner
          if (_controller != null)
            MobileScanner(
              controller: _controller!,
              onDetect: _onDetect,
            ),

          // Overlay
          CustomPaint(
            painter: _ScannerOverlayPainter(),
            child: const SizedBox.expand(),
          ),

          // Processing indicator
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Processing check-in...',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Session info bar at bottom
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(16),
              color: theme.colorScheme.surface.withValues(alpha: 0.9),
              child: SafeArea(
                top: false,
                child: Column(
                  children: [
                    Text(
                      widget.session.name,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (widget.session.capacity != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        '${widget.session.checkInsCount} / ${widget.session.capacity} checked in',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionDeniedView(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.camera_alt_outlined,
              size: 80,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'Camera Permission Required',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'To scan QR codes, please grant camera access in your device settings.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: _checkPermissionAndInitCamera,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () async {
                await PermissionUtils.requestCameraPermission(context);
                _checkPermissionAndInitCamera();
              },
              icon: const Icon(Icons.settings),
              label: const Text('Open Settings'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Scanner overlay painter
class _ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black54
      ..style = PaintingStyle.fill;

    final scanArea = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2 - 50),
      width: size.width * 0.75,
      height: size.width * 0.75,
    );

    // Draw overlay
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()
          ..addRRect(
            RRect.fromRectAndRadius(scanArea, const Radius.circular(16)),
          ),
      ),
      paint,
    );

    // Draw scan area border
    final borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    canvas.drawRRect(
      RRect.fromRectAndRadius(scanArea, const Radius.circular(16)),
      borderPaint,
    );

    // Draw corner accents
    final accentPaint = Paint()
      ..color = Colors.blue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;

    const cornerLength = 30.0;

    // Top-left corner
    canvas.drawLine(
      scanArea.topLeft + const Offset(0, cornerLength),
      scanArea.topLeft,
      accentPaint,
    );
    canvas.drawLine(
      scanArea.topLeft,
      scanArea.topLeft + const Offset(cornerLength, 0),
      accentPaint,
    );

    // Top-right corner
    canvas.drawLine(
      scanArea.topRight + const Offset(0, cornerLength),
      scanArea.topRight,
      accentPaint,
    );
    canvas.drawLine(
      scanArea.topRight,
      scanArea.topRight + const Offset(-cornerLength, 0),
      accentPaint,
    );

    // Bottom-left corner
    canvas.drawLine(
      scanArea.bottomLeft + const Offset(0, -cornerLength),
      scanArea.bottomLeft,
      accentPaint,
    );
    canvas.drawLine(
      scanArea.bottomLeft,
      scanArea.bottomLeft + const Offset(cornerLength, 0),
      accentPaint,
    );

    // Bottom-right corner
    canvas.drawLine(
      scanArea.bottomRight + const Offset(0, -cornerLength),
      scanArea.bottomRight,
      accentPaint,
    );
    canvas.drawLine(
      scanArea.bottomRight,
      scanArea.bottomRight + const Offset(-cornerLength, 0),
      accentPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
