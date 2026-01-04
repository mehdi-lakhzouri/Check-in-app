import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../widgets/widgets.dart';
import 'settings_screen.dart';
import 'session_detail_screen.dart';

/// Sessions Screen - List all sessions
class SessionsScreen extends ConsumerStatefulWidget {
  const SessionsScreen({super.key});

  @override
  ConsumerState<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends ConsumerState<SessionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    
    // Load sessions on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionsProvider.notifier).loadSessions();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final connection = ref.watch(connectionProvider);
    final sessionsState = ref.watch(sessionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sessions'),
        actions: [
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
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              // Search bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search sessions...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              ref.read(sessionsProvider.notifier).searchSessions('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: theme.colorScheme.surfaceContainerHighest,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  ),
                  onChanged: (value) {
                    ref.read(sessionsProvider.notifier).searchSessions(value);
                  },
                ),
              ),
              // Tabs
              TabBar(
                controller: _tabController,
                tabs: const [
                  Tab(text: 'All'),
                  Tab(text: 'Open'),
                  Tab(text: 'Upcoming'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          // Connection banner
          if (!connection.isConnected && !connection.isConnecting)
            ConnectionBanner(
              isConnected: connection.isConnected,
              onRetry: () => ref.read(connectionProvider.notifier).connect(),
            ),
          
          // Sessions list
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _SessionsList(
                  sessions: sessionsState.sessions,
                  isLoading: sessionsState.isLoading,
                  error: sessionsState.error,
                  onRefresh: () => ref.read(sessionsProvider.notifier).refresh(),
                ),
                _SessionsList(
                  sessions: sessionsState.openSessions,
                  isLoading: sessionsState.isLoading,
                  error: sessionsState.error,
                  onRefresh: () => ref.read(sessionsProvider.notifier).refresh(),
                  emptyMessage: 'No open sessions',
                ),
                _SessionsList(
                  sessions: sessionsState.sessions
                      .where((s) => s.isUpcoming)
                      .toList(),
                  isLoading: sessionsState.isLoading,
                  error: sessionsState.error,
                  onRefresh: () => ref.read(sessionsProvider.notifier).refresh(),
                  emptyMessage: 'No upcoming sessions',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Sessions List Widget
class _SessionsList extends StatelessWidget {
  final List<Session> sessions;
  final bool isLoading;
  final String? error;
  final Future<void> Function() onRefresh;
  final String emptyMessage;

  const _SessionsList({
    required this.sessions,
    required this.isLoading,
    this.error,
    required this.onRefresh,
    this.emptyMessage = 'No sessions found',
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading && sessions.isEmpty) {
      return const LoadingState(message: 'Loading sessions...');
    }

    if (error != null && sessions.isEmpty) {
      return ErrorState(
        message: error!,
        onRetry: onRefresh,
      );
    }

    if (sessions.isEmpty) {
      return EmptyState(
        icon: Icons.event_busy,
        title: emptyMessage,
        subtitle: 'Pull down to refresh',
        action: OutlinedButton.icon(
          onPressed: onRefresh,
          icon: const Icon(Icons.refresh),
          label: const Text('Refresh'),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        itemCount: sessions.length,
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemBuilder: (context, index) {
          final session = sessions[index];
          return SessionCard(
            session: session,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => SessionDetailScreen(session: session),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
