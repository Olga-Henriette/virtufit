import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/fit_analysis_bloc.dart';
import '../bloc/fit_analysis_event.dart';
import '../bloc/fit_analysis_state.dart';
import '../widgets/fit_score_gauge.dart';
import '../widgets/tension_zone_tile.dart';
import '../../data/models/fit_report_model.dart';

class FitAnalysisScreen extends StatefulWidget {
  final String sessionId;
  const FitAnalysisScreen({super.key, required this.sessionId});

  @override
  State<FitAnalysisScreen> createState() => _FitAnalysisScreenState();
}

class _FitAnalysisScreenState extends State<FitAnalysisScreen> {
  @override
  void initState() {
    super.initState();
    context.read<FitAnalysisBloc>().add(
      FitAnalysisLoadRequested(widget.sessionId),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Résultat de l\'essayage'),
        leading: IconButton(
          icon:      const Icon(Icons.close),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: BlocBuilder<FitAnalysisBloc, FitAnalysisState>(
        builder: (context, state) {
          if (state.status == FitAnalysisStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.status == FitAnalysisStatus.error && state.report == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
                    const SizedBox(height: 16),
                    Text(state.errorMessage ?? 'Erreur inconnue', textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.read<FitAnalysisBloc>().add(
                        FitAnalysisLoadRequested(widget.sessionId),
                      ),
                      child: const Text('Réessayer'),
                    ),
                  ],
                ),
              ),
            );
          }

          final report = state.report!;
          return _buildReport(theme, report, state);
        },
      ),
    );
  }

  Widget _buildReport(ThemeData theme, FitReportModel report, FitAnalysisState state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Center(
            child: FitScoreGauge(
              score:    report.overallScore,
              category: report.fitCategory,
            ),
          ),
          const SizedBox(height: 20),

          Text(
            report.summary,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),

          Row(
            children: [
              Expanded(child: _buildMetricCard(theme, 'Confort', report.comfortScore, Icons.spa_outlined)),
              const SizedBox(width: 12),
              Expanded(child: _buildMetricCard(theme, 'Mobilité', report.mobilityScore, Icons.directions_run)),
            ],
          ),
          const SizedBox(height: 28),

          Align(
            alignment: Alignment.centerLeft,
            child: Text('Zones de tension', style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            )),
          ),
          const SizedBox(height: 12),
          ...report.zoneAnalyses.map((zone) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: TensionZoneTile(zone: zone),
          )),

          const SizedBox(height: 24),

          _buildSizeComparison(theme, report),

          const SizedBox(height: 24),

          if (report.recommendations.isNotEmpty) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Text('Recommandations', style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              )),
            ),
            const SizedBox(height: 12),
            ...report.recommendations.map((rec) => _buildTipRow(theme, Icons.lightbulb_outline, rec)),
            const SizedBox(height: 20),
          ],

          if (report.styleTips.isNotEmpty) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Text('Conseils de style', style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              )),
            ),
            const SizedBox(height: 12),
            ...report.styleTips.map((tip) => _buildTipRow(theme, Icons.auto_awesome_outlined, tip)),
          ],

          const SizedBox(height: 32),

          SizedBox(
            height: 52, width: double.infinity,
            child: FilledButton.icon(
              icon:  const Icon(Icons.home_outlined),
              label: const Text('Retour à l\'accueil'),
              onPressed: () => context.go('/home'),
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildMetricCard(ThemeData theme, String label, double value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Icon(icon, color: theme.colorScheme.primary),
          const SizedBox(height: 8),
          Text(value.toStringAsFixed(0), style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          )),
          Text(label, style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          )),
        ],
      ),
    );
  }

  Widget _buildSizeComparison(ThemeData theme, FitReportModel report) {
    final sc = report.sizeComparison;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.straighten, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Text('Comparaison de taille', style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              )),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSizeChip(theme, sc.sizeDown, 'Plus petit', false),
              _buildSizeChip(theme, sc.currentSize, 'Actuelle', true),
              _buildSizeChip(theme, sc.sizeUp, 'Plus grand', false),
            ],
          ),
          if (sc.suggestedSize != null && sc.suggestedSize != sc.currentSize) ...[
            const SizedBox(height: 12),
            Text(
              'Taille suggérée : ${sc.suggestedSize} '
              '(confiance ${(sc.confidence * 100).toStringAsFixed(0)}%)',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSizeChip(ThemeData theme, String? size, String label, bool isCurrent) {
    return Column(
      children: [
        Container(
          width: 48, height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isCurrent ? theme.colorScheme.primary : theme.colorScheme.surface,
            border: Border.all(color: theme.colorScheme.primary, width: isCurrent ? 0 : 1.5),
          ),
          alignment: Alignment.center,
          child: Text(
            size ?? '—',
            style: theme.textTheme.titleMedium?.copyWith(
              color: isCurrent ? theme.colorScheme.onPrimary : theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        )),
      ],
    );
  }

  Widget _buildTipRow(ThemeData theme, IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: theme.colorScheme.secondary),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: theme.textTheme.bodyMedium)),
        ],
      ),
    );
  }
}