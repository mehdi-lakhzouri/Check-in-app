import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../widgets/widgets.dart';
import 'settings_screen.dart';
import 'session_detail_screen.dart';

/// Sessions Screen - List all sessions with filtering and swipe navigation
/// 
/// Features:
/// - Swipe-based navigation between filter tabs (All, Open, Ended)
/// - Compact sticky filter chips
/// - Pull-to-refresh on all views
/// - Smooth animations and transitions
/// - Proper accessibility support
class SessionsScreen extends ConsumerStatefulWidget {
  const SessionsScreen({super.key});

  @override
  ConsumerState<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends ConsumerState<SessionsScreen>
    with TickerProviderStateMixin {
  final _searchController = TextEditingController();
  late final PageController _pageController;
  late final AnimationController _filterAnimationController;
  
  SessionFilter _currentFilter = SessionFilter.open; // Default to "Open"
  bool _isSearchExpanded = false;

  @override
  void initState() {
    super.initState();
    
    // Initialize page controller starting at "Open" (index 1)
    _pageController = PageController(initialPage: 1);
    
    // Animation controller for filter transitions
    _filterAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    // Load sessions on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionsProvider.notifier).loadSessions();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _pageController.dispose();
    _filterAnimationController.dispose();
    super.dispose();
  }

  void _onFilterChanged(SessionFilter filter) {
    final index = SessionFilter.values.indexOf(filter);
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _onPageChanged(int index) {
    HapticFeedback.selectionClick();
    setState(() {
      _currentFilter = SessionFilter.values[index];
    });
  }

  List<Session> _getFilteredSessions(List<Session> allSessions, SessionFilter filter) {
    // Apply search filter
    var sessions = allSessions;
    final searchQuery = _searchController.text.toLowerCase();
    
    if (searchQuery.isNotEmpty) {
      sessions = sessions.where((s) => 
        s.name.toLowerCase().contains(searchQuery) ||
        (s.location?.toLowerCase().contains(searchQuery) ?? false)
      ).toList();
    }

    // Apply status filter
    switch (filter) {
      case SessionFilter.all:
        return sessions;
      case SessionFilter.open:
        return sessions.where((s) => 
          !s.hasEnded && s.lifecycle != SessionLifecycle.cancelled
        ).toList();
      case SessionFilter.ended:
        return sessions.where((s) => s.hasEnded).toList();
    }
  }

  int _getFilterCount(List<Session> sessions, SessionFilter filter) {
    switch (filter) {
      case SessionFilter.all:
        return sessions.length;
      case SessionFilter.open:
        return sessions.where((s) => 
          !s.hasEnded && s.lifecycle != SessionLifecycle.cancelled
        ).length;
      case SessionFilter.ended:
        return sessions.where((s) => s.hasEnded).length;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final connection = ref.watch(connectionProvider);
    final sessionsState = ref.watch(sessionsProvider);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('Sessions'),
        elevation: 0,
        scrolledUnderElevation: 1,
        actions: [
          // Search toggle
          Semantics(
            label: 'Search sessions',
            button: true,
            child: IconButton(
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  _isSearchExpanded ? Icons.close : Icons.search,
                  key: ValueKey(_isSearchExpanded),
                ),
              ),
              onPressed: () {
                HapticFeedback.lightImpact();
                setState(() {
                  _isSearchExpanded = !_isSearchExpanded;
                  if (!_isSearchExpanded) {
                    _searchController.clear();
                  }
                });
              },
            ),
          ),
          // Connection indicator
          ConnectionIndicator(
            isConnected: connection.isConnected,
            isConnecting: connection.isConnecting,
            showLabel: false,
            onTap: () {
              if (!connection.isConnected) {
                ref.read(connectionProvider.notifier).connect();
              }
            },
          ),
          const SizedBox(width: 8),
          // Settings
          Semantics(
            label: 'Settings',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.settings_outlined),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
              },
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar (animated)
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            height: _isSearchExpanded ? 64 : 0,
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: _isSearchExpanded ? 1 : 0,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: TextField(
                  controller: _searchController,
                  autofocus: false,
                  decoration: InputDecoration(
                    hintText: 'Search by name or location...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 20),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: theme.colorScheme.surfaceContainerHighest,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ),
          ),

          // Sticky Filter Tabs - Compact design
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              border: Border(
                bottom: BorderSide(
                  color: theme.colorScheme.outlineVariant.withValues(alpha: 0.2),
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: [
                // Compact filter tabs
                SessionFilterChips(
                  selectedFilter: _currentFilter,
                  onFilterChanged: _onFilterChanged,
                  counts: {
                    SessionFilter.all: _getFilterCount(sessionsState.sessions, SessionFilter.all),
                    SessionFilter.open: _getFilterCount(sessionsState.sessions, SessionFilter.open),
                    SessionFilter.ended: _getFilterCount(sessionsState.sessions, SessionFilter.ended),
                  },
                ),
                const Spacer(),
                // Swipe hint indicator
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.swipe,
                      size: 14,
                      color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Swipe',
                      style: TextStyle(
                        fontSize: 11,
                        color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Connection banner
          if (!connection.isConnected && !connection.isConnecting)
            EnhancedConnectionBanner(
              isOffline: !connection.isConnected,
              onRetry: () => ref.read(connectionProvider.notifier).connect(),
            ),
          
          // Swipeable Sessions PageView
          Expanded(
            child: PageView.builder(
              controller: _pageController,
              onPageChanged: _onPageChanged,
              itemCount: SessionFilter.values.length,
              itemBuilder: (context, index) {
                final filter = SessionFilter.values[index];
                return _SessionsListView(
                  sessions: _getFilteredSessions(sessionsState.sessions, filter),
                  isLoading: sessionsState.isLoading,
                  error: sessionsState.error,
                  onRefresh: () => ref.read(sessionsProvider.notifier).refresh(),
                  emptyMessage: _getEmptyMessage(filter),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _getEmptyMessage(SessionFilter filter) {
    switch (filter) {
      case SessionFilter.all:
        return 'No sessions found';
      case SessionFilter.open:
        return 'No open sessions';
      case SessionFilter.ended:
        return 'No ended sessions';
    }
  }
}

/// Enhanced Sessions List Widget with animations and pull-to-refresh
class _SessionsListView extends StatelessWidget {
  final List<Session> sessions;
  final bool isLoading;
  final String? error;
  final Future<void> Function() onRefresh;
  final String emptyMessage;

  const _SessionsListView({
    required this.sessions,
    required this.isLoading,
    this.error,
    required this.onRefresh,
    this.emptyMessage = 'No sessions found',
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading && sessions.isEmpty) {
      return const _SessionsLoadingShimmer();
    }

    if (error != null && sessions.isEmpty) {
      return ErrorState(
        message: error!,
        onRetry: onRefresh,
      );
    }

    if (sessions.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: EmptyState(
              icon: Icons.event_busy_outlined,
              title: emptyMessage,
              subtitle: 'Pull down to refresh',
              action: OutlinedButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(120, 44),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: sessions.length,
        padding: const EdgeInsets.only(top: 8, bottom: 100),
        itemBuilder: (context, index) {
          final session = sessions[index];
          return AnimatedSlide(
            index: index,
            child: SessionCard(
              session: session,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => SessionDetailScreen(session: session),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

/// Shimmer loading for sessions list
class _SessionsLoadingShimmer extends StatelessWidget {
  const _SessionsLoadingShimmer();

  @override
  Widget build(BuildContext context) {
    return const SessionListShimmer(count: 5);
  }
}

/// Animated slide widget for list items
class AnimatedSlide extends StatefulWidget {
  final int index;
  final Widget child;

  const AnimatedSlide({
    super.key,
    required this.index,
    required this.child,
  });

  @override
  State<AnimatedSlide> createState() => _AnimatedSlideState();
}

class _AnimatedSlideState extends State<AnimatedSlide>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: Duration(milliseconds: 300 + (widget.index * 50).clamp(0, 200)),
      vsync: this,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: widget.child,
      ),
    );
  }
}
