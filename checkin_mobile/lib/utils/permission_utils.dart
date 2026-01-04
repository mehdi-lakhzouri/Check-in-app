import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/material.dart';

/// Permission utility functions
/// 
/// Handles camera permission requests with proper UI feedback
class PermissionUtils {
  /// Request camera permission with user feedback
  /// 
  /// Returns true if permission is granted, false otherwise.
  /// Shows appropriate dialogs for denied/permanently denied states.
  static Future<bool> requestCameraPermission(BuildContext context) async {
    // Check current status first
    final status = await Permission.camera.status;
    
    if (status.isGranted) {
      return true;
    }
    
    if (status.isPermanentlyDenied) {
      // Show dialog to open settings
      if (!context.mounted) return false;
      final shouldOpen = await _showPermanentlyDeniedDialog(context);
      if (shouldOpen) {
        await openAppSettings();
      }
      return false;
    }
    
    // Request permission
    final result = await Permission.camera.request();
    
    if (result.isGranted) {
      return true;
    }
    
    if (result.isDenied) {
      if (!context.mounted) return false;
      _showPermissionDeniedSnackBar(context);
      return false;
    }
    
    if (result.isPermanentlyDenied) {
      if (!context.mounted) return false;
      final shouldOpen = await _showPermanentlyDeniedDialog(context);
      if (shouldOpen) {
        await openAppSettings();
      }
      return false;
    }
    
    return false;
  }

  /// Check if camera permission is granted without requesting
  static Future<bool> hasCameraPermission() async {
    final status = await Permission.camera.status;
    return status.isGranted;
  }

  static Future<bool> _showPermanentlyDeniedDialog(BuildContext context) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.camera_alt_outlined, size: 48),
        title: const Text('Camera Permission Required'),
        content: const Text(
          'Camera access is required to scan QR codes. '
          'Please enable camera permission in your device settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Open Settings'),
          ),
        ],
      ),
    ) ?? false;
  }

  static void _showPermissionDeniedSnackBar(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.white),
            SizedBox(width: 12),
            Expanded(
              child: Text('Camera permission is required to scan QR codes'),
            ),
          ],
        ),
        backgroundColor: Colors.orange,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: 4),
      ),
    );
  }
}
