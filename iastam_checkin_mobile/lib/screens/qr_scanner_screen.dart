import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../models/session_manual.dart';
import '../models/check_in_manual.dart';
import '../providers/checkin_provider.dart';
import 'attendee_list_screen.dart';

class QrScannerScreen extends ConsumerStatefulWidget {
  final Session session;

  const QrScannerScreen({super.key, required this.session});

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> {
  MobileScannerController cameraController = MobileScannerController();
  bool isScanned = false;

  @override
  void initState() {
    super.initState();
    // Clear any previous state when opening a new scanner session
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(checkinProvider.notifier).resetToInitialState();
    });
  }

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    print('=== QR SCAN DEBUG: _onDetect called ===');
    print('=== isScanned: $isScanned ===');
    if (isScanned) return;

    final List<Barcode> barcodes = capture.barcodes;
    print('=== Number of barcodes detected: ${barcodes.length} ===');
    for (final barcode in barcodes) {
      final String? code = barcode.rawValue;
      print('=== Barcode rawValue: $code ===');
      print('=== Barcode format: ${barcode.format} ===');
      if (code != null && code.isNotEmpty) {
        print('=== Processing QR code: $code ===');
        setState(() {
          isScanned = true;
        });
        _processQrCode(code);
        break;
      }
    }
  }

  void _processQrCode(String qrCode) {
    print('=== QR SCAN DEBUG: _processQrCode called with: $qrCode ===');
    print('=== Session ID: ${widget.session.id} ===');
    ref.read(checkinProvider.notifier).checkinWithQr(qrCode, widget.session.id);
  }

  void _resetScanner() {
    setState(() {
      isScanned = false;
    });
    // Reset to initial state
    ref.read(checkinProvider.notifier).resetToInitialState();

    // Recreate the camera controller to ensure fresh camera state
    cameraController.dispose();
    cameraController = MobileScannerController();
    
    // Trigger a rebuild to reinitialize the camera
    setState(() {});
  }

  void _navigateToAttendeeList() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AttendeeListScreen(session: widget.session),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final checkinState = ref.watch(checkinProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.session.name),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Session info header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Colors.grey.shade100,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.session.name,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    if (widget.session.checkInsCount != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade100,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.people,
                              size: 16,
                              color: Colors.blue.shade700,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${widget.session.checkInsCount}',
                              style: TextStyle(
                                color: Colors.blue.shade700,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.category, size: 16, color: Colors.grey.shade600),
                    const SizedBox(width: 4),
                    Text(
                      widget.session.sessionType.toUpperCase(),
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const SizedBox(width: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: widget.session.isOpen
                            ? Colors.green.shade100
                            : Colors.orange.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.session.isOpen
                            ? 'Open'
                            : 'Registration Required',
                        style: TextStyle(
                          color: widget.session.isOpen
                              ? Colors.green.shade800
                              : Colors.orange.shade800,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Scanner or result area
          Expanded(
            child: checkinState.isLoading
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Processing check-in...'),
                      ],
                    ),
                  )
                : checkinState.lastCheckin != null
                ? _buildSuccessView(checkinState.lastCheckin!)
                : checkinState.error != null
                ? _buildErrorView(checkinState.error!)
                : _buildScannerView(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _navigateToAttendeeList(),
        icon: const Icon(Icons.people),
        label: const Text('Attendees'),
        backgroundColor: Colors.green.shade600,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildScannerView() {
    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Point your camera at the participant\'s QR code',
            style: TextStyle(fontSize: 16),
            textAlign: TextAlign.center,
          ),
        ),
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.shade300, width: 2),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: MobileScanner(
                controller: cameraController,
                onDetect: _onDetect,
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const Icon(Icons.qr_code_scanner, size: 48, color: Colors.blue),
              const SizedBox(height: 8),
              Text(
                'Scan QR Code',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.blue.shade700,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessView(CheckIn checkin) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle, size: 80, color: Colors.green.shade600),
          const SizedBox(height: 16),
          Text(
            'Check-in Successful!',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.green.shade700,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            elevation: 4,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (checkin.participant != null) ...[
                    Text(
                      'Participant',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      checkin.participant!.fullName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (checkin.participant!.organization?.isNotEmpty ==
                        true) ...[
                      const SizedBox(height: 2),
                      Text(
                        checkin.participant!.organization!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                  ],
                  Text(
                    'Check-in Time',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${checkin.checkInTime.hour.toString().padLeft(2, '0')}:${checkin.checkInTime.minute.toString().padLeft(2, '0')}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _resetScanner,
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text('Scan Another'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade600,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(16),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _navigateToAttendeeList(),
                  icon: const Icon(Icons.people),
                  label: const Text('View All'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green.shade600,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(16),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(String error) {
    final isAlreadyCheckedIn = error.toLowerCase().contains(
      'already checked in',
    );

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isAlreadyCheckedIn ? Icons.info_outline : Icons.error_outline,
            size: 80,
            color: isAlreadyCheckedIn
                ? Colors.orange.shade600
                : Colors.red.shade600,
          ),
          const SizedBox(height: 16),
          Text(
            isAlreadyCheckedIn ? 'Already Checked In' : 'Check-in Failed',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: isAlreadyCheckedIn
                  ? Colors.orange.shade700
                  : Colors.red.shade700,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            elevation: 4,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    error,
                    style: Theme.of(context).textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                  if (isAlreadyCheckedIn) ...[
                    const SizedBox(height: 12),
                    Text(
                      'This participant has already been checked into this session.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          if (isAlreadyCheckedIn) ...[
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _resetScanner,
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Scan Another'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _navigateToAttendeeList(),
                    icon: const Icon(Icons.people),
                    label: const Text('View All'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _resetScanner,
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Try Scanning Again'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _navigateToAttendeeList(),
                    icon: const Icon(Icons.person_search),
                    label: const Text('Manual Check-in'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
