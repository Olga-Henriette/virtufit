import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/tryon_history_bloc.dart';
import '../bloc/tryon_history_event.dart';
import '../bloc/tryon_history_state.dart';
import '../widgets/tryon_history_tile.dart';

class TryOnHistoryScreen extends StatefulWidget {
  const TryOnHistoryScreen({super.key});

  @override
  State<TryOnHistoryScreen> createState() => _TryOnHistoryScreenState();
}

class _TryOnHistoryScreenState extends State<TryOnHistoryScreen> {
  @override
  void initState() {
    super.initState();
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId != null) {
      context.read<TryOnHistoryBloc>().add(TryOnHistoryLoadRequested(userId));
    }
  }

  Future<void> _onRefresh() async {
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId != null) {
      context.read<TryOnHistoryBloc>().add(TryOnHistoryRefreshRequested(userId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes essayages'),
        leading: IconButton(
          icon:      const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<TryOnHistoryBloc, TryOnHistoryState>(
        builder: (context, state) {
          switch (state.status) {
            case TryOnHistoryStatus.loading:
              return const Center(child: CircularProgressIndicator());

            case TryOnHistoryStatus.error:
              return _buildError(theme, state.errorMessage);

            case TryOnHistoryStatus.empty:
              return _buildEmpty(theme);

            case TryOnHistoryStatus.loaded:
              return RefreshIndicator(
                onRefresh: _onRefresh,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: state.sessions.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final session = state.sessions[i];
                    return TryOnHistoryTile(
                      session: session,
                      onTap: () => context.push('/tryon/fit-analysis', extra: {
                        'sessionId': session.sessionId,
                      }),
                    );
                  },
                ),
              );
          }
        },
      ),
    );
  }

  Widget _buildEmpty(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.history_outlined,
                size: 64, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('Aucun essayage encore', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Parcourez le catalogue pour essayer votre premier vêtement.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/tryon/catalogue'),
              child: const Text('Voir le catalogue'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(ThemeData theme, String? message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(message ?? 'Une erreur est survenue.', textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(onPressed: _onRefresh, child: const Text('Réessayer')),
          ],
        ),
      ),
    );
  }
}