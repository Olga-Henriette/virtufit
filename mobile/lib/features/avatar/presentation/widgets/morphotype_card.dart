import 'package:flutter/material.dart';
import '../../data/models/morphotype_model.dart';

class MorphotypeCard extends StatelessWidget {
  final MorphotypeOption option;
  final bool             isSelected;
  final VoidCallback     onTap;

  const MorphotypeCard({
    super.key,
    required this.option,
    required this.isSelected,
    required this.onTap,
  });

  IconData get _silhouetteIcon {
    switch (option.gender) {
      case MorphotypeGender.male:    return Icons.male_rounded;
      case MorphotypeGender.female:  return Icons.female_rounded;
      case MorphotypeGender.neutral: return Icons.accessibility_new_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding:  const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
            ? theme.colorScheme.primaryContainer
            : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
              ? theme.colorScheme.primary
              : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              width:  56, height: 56,
              decoration: BoxDecoration(
                color: isSelected
                  ? theme.colorScheme.primary.withValues(alpha: 0.15)
                  : theme.colorScheme.surface,
                shape: BoxShape.circle,
              ),
              child: Icon(
                _silhouetteIcon,
                size:  28,
                color: isSelected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    option.label,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: isSelected ? theme.colorScheme.primary : null,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    option.description,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle, color: theme.colorScheme.primary),
          ],
        ),
      ),
    );
  }
}