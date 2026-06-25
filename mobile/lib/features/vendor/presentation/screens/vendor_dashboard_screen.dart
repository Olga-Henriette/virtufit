import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/vendor_dashboard_bloc.dart';
import '../bloc/vendor_dashboard_event.dart';
import '../bloc/vendor_dashboard_state.dart';
import '../../data/models/vendor_dashboard_model.dart';

class VendorDashboardScreen extends StatefulWidget {
  const VendorDashboardScreen({super.key});

  @override
  State<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends State<VendorDashboardScreen> {
  @override
  void initState() {
    super.initState();
    final vendorId = context.read<AuthBloc>().state.user?.id;
    if (vendorId != null) {
      context.read<VendorDashboardBloc>().add(
        VendorDashboardLoadRequested(vendorId),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tableau de bord'),
        actions: [
          IconButton(
            icon:      const Icon(Icons.add_circle_outline),
            tooltip:   'Ajouter un vêtement',
            onPressed: () => context.push('/vendor/upload'),
          ),
          IconButton(
            icon:      const Icon(Icons.inventory_2_outlined),
            tooltip:   'Gérer le catalogue',
            onPressed: () => context.push('/vendor/catalog'),
          ),
        ],
      ),
      body: BlocBuilder<VendorDashboardBloc, VendorDashboardState>(
        builder: (context, state) {
          switch (state.status) {
            case VendorDashboardStatus.loading:
              return const Center(child: CircularProgressIndicator());

            case VendorDashboardStatus.empty:
              return _buildEmpty(theme);

            case VendorDashboardStatus.error:
              return Center(child: Text(state.errorMessage ?? 'Erreur'));

            case VendorDashboardStatus.loaded:
              return _buildDashboard(theme, state.dashboard!);
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
            Icon(Icons.store_outlined,
                size: 64, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('Aucun vêtement dans votre catalogue',
                style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              'Ajoutez votre premier vêtement pour voir vos statistiques.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              icon:  const Icon(Icons.add),
              label: const Text('Ajouter un vêtement'),
              onPressed: () => context.push('/vendor/upload'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboard(ThemeData theme, VendorDashboardModel dashboard) {
    final stats = dashboard.catalogueStats;

    return RefreshIndicator(
      onRefresh: () async {
        final vendorId = context.read<AuthBloc>().state.user?.id;
        if (vendorId != null) {
          context.read<VendorDashboardBloc>().add(
            VendorDashboardLoadRequested(vendorId),
          );
        }
      },
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          GridView.count(
            crossAxisCount:   2,
            shrinkWrap:       true,
            physics:          const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing:  12,
            childAspectRatio: 1.5,
            children: [
              _buildStatCard(theme, 'Articles', stats.totalClothingItems.toString(),
                  Icons.checkroom_outlined, theme.colorScheme.primary),
              _buildStatCard(theme, 'Essayages', stats.totalTryOns.toString(),
                  Icons.straighten_outlined, theme.colorScheme.secondary),
              _buildStatCard(theme, 'Score moyen',
                  stats.avgFitScoreAcrossCatalogue.toStringAsFixed(0),
                  Icons.insights_outlined, Colors.orange),
              _buildStatCard(theme, 'Satisfaction',
                  '${stats.overallSatisfactionRate.toStringAsFixed(0)}%',
                  Icons.thumb_up_outlined, Colors.green),
            ],
          ),

          const SizedBox(height: 28),

          if (dashboard.recommendations.isNotEmpty) ...[
            Text('Recommandations', style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            )),
            const SizedBox(height: 12),
            ...dashboard.recommendations.map((rec) => Container(
              margin:  const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lightbulb_outline, size: 18, color: theme.colorScheme.secondary),
                  const SizedBox(width: 10),
                  Expanded(child: Text(rec, style: theme.textTheme.bodySmall)),
                ],
              ),
            )),
            const SizedBox(height: 20),
          ],

          if (dashboard.topPerformers.isNotEmpty) ...[
            Text('Meilleurs articles', style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            )),
            const SizedBox(height: 12),
            ...dashboard.topPerformers.map((p) => _buildPerformanceTile(theme, p, true)),
            const SizedBox(height: 20),
          ],

          if (dashboard.needsAttention.isNotEmpty) ...[
            Text('À améliorer', style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            )),
            const SizedBox(height: 12),
            ...dashboard.needsAttention.map((p) => _buildPerformanceTile(theme, p, false)),
            const SizedBox(height: 20),
          ],

          if (dashboard.tensionHotspots.isNotEmpty) ...[
            Text('Zones de tension fréquentes', style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            )),
            const SizedBox(height: 12),
            ...dashboard.tensionHotspots.map((h) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(child: Text(h.zoneName, style: theme.textTheme.bodyMedium)),
                  Text('${h.percentageAffected.toStringAsFixed(0)}% (${h.affectedItems})',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.error,
                        fontWeight: FontWeight.w600,
                      )),
                ],
              ),
            )),
          ],

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildStatCard(ThemeData theme, String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const Spacer(),
          Text(value, style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
          )),
          Text(label, style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          )),
        ],
      ),
    );
  }

  Widget _buildPerformanceTile(ThemeData theme, ClothingPerformance p, bool isTop) {
    final color = isTop ? Colors.green : Colors.orange;
    return Container(
      margin:  const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              p.avgFitScore.toStringAsFixed(0),
              style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.name, style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                )),
                Text('${p.totalTryOns} essayages · ${p.satisfactionRate.toStringAsFixed(0)}% satisfaction',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}