import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../widgets/widgets.dart';

/// Check-in Result Screen
class CheckInResultScreen extends ConsumerWidget {
  final CheckInResult result;
  final Session session;

  const CheckInResultScreen({
    super.key,
    required this.result,
    required this.session,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: result.success
          ? Colors.green.shade50
          : Colors.red.shade50,
      appBar: AppBar(
        title: Text(result.success ? 'Success!' : 'Check-in Failed'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: CheckInResultCard(
                  result: result,
                  onDismiss: () {
                    // Go back to scanner/manual checkin
                    Navigator.of(context).pop(true);
                  },
                  onUndo: result.success && result.checkIn != null
                      ? () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Undo Check-in?'),
                              content: const Text(
                                'This will remove the check-in. Are you sure?',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: const Text('Cancel'),
                                ),
                                FilledButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text('Undo'),
                                ),
                              ],
                            ),
                          );

                          if (confirm == true) {
                            final success = await ref
                                .read(checkInProvider.notifier)
                                .undoCheckIn(result.checkIn!.id);
                            
                            if (success && context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Check-in removed'),
                                ),
                              );
                              Navigator.of(context).pop(true);
                            }
                          }
                        }
                      : null,
                ),
              ),
            ),

            // Quick actions at bottom
            Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.of(context).pop(false),
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('Back to Session'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => Navigator.of(context).pop(true),
                      icon: const Icon(Icons.qr_code_scanner),
                      label: const Text('Scan Next'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
