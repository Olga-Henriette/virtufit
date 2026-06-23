import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/avatar_viewer_bloc.dart';
import '../bloc/avatar_viewer_event.dart';
import '../bloc/avatar_viewer_state.dart';
import '../widgets/avatar_silhouette.dart';
import '../widgets/avatar_info_tile.dart';

class AvatarViewerScreen extends StatefulWidget {
  const AvatarViewerScreen({super.key});

  @override
  State<AvatarViewerScreen> createState() => _AvatarViewerScreenState();
}

class _AvatarViewerScreenState extends State<AvatarViewerScreen> {
  @override
  void initState() {
    super.initState();
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId != null) {
      context.read<AvatarViewerBloc>().add(AvatarViewerLoadRequested(userId));
    }
  }

  void _refresh() {
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId != null) {
      context.read<AvatarViewerBloc>().add(AvatarViewerRefreshRequested(userId));
    }
  }

  Color _bmiColor(ThemeData theme, String category) {
    switch (category) {
      case 'Maigreur': return Colors.orange;
      case 'Normal':   return Colors.green;
      case 'Surpoids': return Colors.orange;
      default:         return theme.colorScheme.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon avatar'),
        leading: IconButton(
          icon:      const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        actions: [
          IconButton(
            icon:      const Icon(Icons.refresh),
            tooltip:   'Actualiser',
            onPressed: _refresh,
          ),
        ],
      ),
      body: BlocBuilder<AvatarViewerBloc, AvatarViewerState>(
        builder: (context, state) {
          switch (state.status) {
            case AvatarViewerStatus.initial:
            case AvatarViewerStatus.loading:
              return const Center(child: CircularProgressIndicator());

            case AvatarViewerStatus.notFound:
              return _buildEmptyState(theme);

            case AvatarViewerStatus.error:
              return _buildErrorState(theme, state.errorMessage);

            case AvatarViewerStatus.loaded:
              return _buildLoaded(theme, state);
          }
        },
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.person_off_outlined,
                size: 64, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('Aucun avatar trouvé', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Renseignez vos mensurations pour créer votre premier avatar.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/avatar/measurements'),
              child:     const Text('Créer mon avatar'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(ThemeData theme, String? message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(message ?? 'Une erreur est survenue.',
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(onPressed: _refresh, child: const Text('Réessayer')),
          ],
        ),
      ),
    );
  }

  Widget _buildLoaded(ThemeData theme, AvatarViewerState state) {
    final avatar = state.avatar!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Carte silhouette
          Container(
            width:   double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end:   Alignment.bottomCenter,
                colors: [
                  theme.colorScheme.primaryContainer.withValues(alpha: 0.4),
                  theme.colorScheme.surface,
                ],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: AvatarSilhouette(avatar: avatar),
          ),

          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.view_in_ar_outlined,
                    size: 14, color: theme.colorScheme.secondary),
                const SizedBox(width: 6),
                Text(
                  'Aperçu stylisé — vue 3D Unity à venir',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.secondary,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 28),

          // Infos avatar
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Informations',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 12),

          AvatarInfoTile(
            icon:  Icons.height,
            label: 'Taille',
            value: '${avatar.heightCm.toStringAsFixed(0)} cm',
          ),
          const SizedBox(height: 8),
          AvatarInfoTile(
            icon:  Icons.monitor_weight_outlined,
            label: 'Poids',
            value: '${avatar.weightKg.toStringAsFixed(0)} kg',
          ),
          const SizedBox(height: 8),
          AvatarInfoTile(
            icon:       Icons.favorite_border,
            label:      'IMC',
            value:      '${avatar.bmi.toStringAsFixed(1)} (${avatar.bmiCategory})',
            valueColor: _bmiColor(theme, avatar.bmiCategory),
          ),
          const SizedBox(height: 8),
          AvatarInfoTile(
            icon:  Icons.person_outline,
            label: 'Genre',
            value: switch (avatar.gender) {
              'male'   => 'Homme',
              'female' => 'Femme',
              _        => 'Neutre',
            },
          ),
          const SizedBox(height: 8),
          AvatarInfoTile(
            icon:  Icons.deblur_outlined,
            label: 'Sommets du maillage',
            value: avatar.mesh.verticesCount.toString(),
          ),
          const SizedBox(height: 8),
          AvatarInfoTile(
            icon:  Icons.speed_outlined,
            label: 'Temps de génération',
            value: '${avatar.generationTimeMs.toStringAsFixed(0)} ms',
          ),

          const SizedBox(height: 32),

          SizedBox(
            height: 52,
            width:  double.infinity,
            child: FilledButton.icon(
              icon:  const Icon(Icons.checkroom_outlined),
              label: const Text('Essayer des vêtements'),
              onPressed: () => context.go('/home'),
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            icon:  const Icon(Icons.refresh, size: 18),
            label: const Text('Recommencer la création d\'avatar'),
            onPressed: () => context.go('/avatar/measurements'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}