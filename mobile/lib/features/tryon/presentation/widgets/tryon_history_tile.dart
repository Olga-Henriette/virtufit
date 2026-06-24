import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/models/tryon_model.dart';

class TryOnHistoryTile extends StatelessWidget {
  final TryOnSessionModel session;
  final VoidCallback      onTap;

  const TryOnHistoryTile({
    super.key,
    required this.session,
    required this.onTap,
  });

  Color _scoreColor(double score) {
    if (score >= 85) return Colors.green;
    if (score >= 70) return Colors.lightGreen;
    if (score >= 50) return Colors.orange;
    return Colors.redAccent;
  }

  IconData _animationIcon(String type) {
    switch (type) {
      case 'walking':  return Icons.directions_walk;
      case 'rotating': return Icons.threed_rotation;
      default:         return Icons.accessibility_new;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'completed':  return 'Terminé';
      case 'processing': return 'En cours';
      case 'failed':      return 'Échoué';
      default:            return 'Initié';
    }
  }

  Color _statusColor(ThemeData theme, String status) {
    switch (status) {
      case 'completed': return Colors.green;
      case 'failed':     return theme.colorScheme.error;
      default:           return theme.colorScheme.onSurfaceVariant;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme       = Theme.of(context);
    final isCompleted = session.status == 'completed';
    final score       = session.fitAnalysis.fitScore;
    final scoreColor  = _scoreColor(score);

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap:        isCompleted ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Score circulaire compact
              if (isCompleted)
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: scoreColor.withValues(alpha: 0.12),
                    border: Border.all(color: scoreColor, width: 2),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    score.toStringAsFixed(0),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color:      scoreColor,
                    ),
                  ),
                )
              else
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: theme.colorScheme.surfaceContainerHighest,
                  ),
                  alignment: Alignment.center,
                  child: Icon(
                    session.status == 'failed'
                      ? Icons.error_outline
                      : Icons.hourglass_top,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),

              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(_animationIcon(session.animationType),
                            size: 16, color: theme.colorScheme.primary),
                        const SizedBox(width: 6),
                        Text(
                          isCompleted
                            ? session.fitAnalysis.overallFit
                            : _statusLabel(session.status),
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: isCompleted
                              ? null
                              : _statusColor(theme, session.status),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat('dd MMM yyyy · HH:mm', 'fr_FR')
                          .format(session.createdAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (isCompleted && session.fitAnalysis.sizeSuggestion != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Taille suggérée : ${session.fitAnalysis.sizeSuggestion}',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              if (isCompleted)
                Icon(Icons.chevron_right, color: theme.colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}