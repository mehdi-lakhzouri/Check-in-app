import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

/// Shimmer Loading Widgets
/// 
/// Provides skeleton loading states for better perceived performance.

/// Base shimmer container
class ShimmerContainer extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const ShimmerContainer({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 4,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[700] : Colors.white,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// Session card shimmer placeholder
class SessionCardShimmer extends StatelessWidget {
  const SessionCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title row
              Row(
                children: [
                  const Expanded(
                    child: ShimmerContainer(width: double.infinity, height: 20),
                  ),
                  const SizedBox(width: 8),
                  ShimmerContainer(width: 60, height: 24, borderRadius: 12),
                ],
              ),
              const SizedBox(height: 12),
              // Location
              const ShimmerContainer(width: 150, height: 14),
              const SizedBox(height: 8),
              // Time
              const ShimmerContainer(width: 120, height: 14),
              const SizedBox(height: 12),
              // Capacity bar
              const ShimmerContainer(width: double.infinity, height: 8, borderRadius: 4),
            ],
          ),
        ),
      ),
    );
  }
}

/// List of session card shimmers
class SessionListShimmer extends StatelessWidget {
  final int count;

  const SessionListShimmer({super.key, this.count = 5});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      itemBuilder: (_, __) => const SessionCardShimmer(),
    );
  }
}

/// Participant tile shimmer
class ParticipantTileShimmer extends StatelessWidget {
  const ParticipantTileShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Colors.white,
        ),
        title: const ShimmerContainer(width: 150, height: 16),
        subtitle: const Padding(
          padding: EdgeInsets.only(top: 4),
          child: ShimmerContainer(width: 100, height: 12),
        ),
        trailing: ShimmerContainer(width: 80, height: 32, borderRadius: 16),
      ),
    );
  }
}

/// List of participant tile shimmers
class ParticipantListShimmer extends StatelessWidget {
  final int count;

  const ParticipantListShimmer({super.key, this.count = 10});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      itemBuilder: (_, __) => const ParticipantTileShimmer(),
    );
  }
}

/// Stats card shimmer
class StatsCardShimmer extends StatelessWidget {
  const StatsCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const ShimmerContainer(width: 80, height: 12),
              const SizedBox(height: 8),
              const ShimmerContainer(width: 60, height: 32),
              const SizedBox(height: 4),
              const ShimmerContainer(width: 100, height: 10),
            ],
          ),
        ),
      ),
    );
  }
}

/// Full screen shimmer loading
class FullScreenShimmer extends StatelessWidget {
  final String? message;

  const FullScreenShimmer({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 100,
            height: 100,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: 24),
            Text(
              message!,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
