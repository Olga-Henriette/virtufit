import 'package:flutter/material.dart';
import '../../data/models/fit_report_model.dart';

class TensionZoneTile extends StatelessWidget {
  final ZoneAnalysisModel zone;

  const TensionZoneTile({super.key, required this.zone});

  Color _levelColor(String level) {
    switch (level) {
      case 'none':     return Colors.green;
      case 'low':      return Colors.lightGreen;
      case 'medium':   return Colors.orange;
      case 'high':     return Colors.deepOrange;
      case 'critical': return Colors.redAccent;
      default:         return Colors.grey;
    }
  }

  String _zoneLabel(String zone) {
    const labels = {
      'chest':     'Poitrine',
      'waist':     'Taille',
      'hips':      'Hanches',
      'shoulders': 'Épaules',
      'back':      'Dos',
      'arms':      'Bras',
      'neck':      'Cou',
      'body':      'Corps',
    };
    return labels[zone] ?? zone;
  }

  String _levelLabel(String level) {
    const labels = {
      'none': 'Aucune', 'low': 'Faible', 'medium': 'Moyenne',
      'high': 'Élevée', 'critical': 'Critique',
    };
    return labels[level] ?? level;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _levelColor(zone.tensionLevel);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 10, height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(_zoneLabel(zone.zone),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        )),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _levelLabel(zone.tensionLevel),
                        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                if (zone.recommendation != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    zone.recommendation!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Text(
            '${zone.fitDeltaCm >= 0 ? '+' : ''}${zone.fitDeltaCm.toStringAsFixed(1)} cm',
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color:      theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}