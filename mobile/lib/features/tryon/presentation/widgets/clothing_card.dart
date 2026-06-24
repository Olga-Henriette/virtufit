import 'package:flutter/material.dart';
import '../../data/models/clothing_model.dart';

class ClothingCard extends StatelessWidget {
  final ClothingModel clothing;
  final VoidCallback  onTap;

  const ClothingCard({
    super.key,
    required this.clothing,
    required this.onTap,
  });

  Color get _swatchColor {
    final rgb = clothing.colorInfo.dominantRgb;
    if (rgb.length < 3) return Colors.grey;
    return Color.fromARGB(255, rgb[0], rgb[1], rgb[2]);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Aperçu couleur 
            AspectRatio(
              aspectRatio: 1.0,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end:   Alignment.bottomRight,
                    colors: [
                      _swatchColor.withValues(alpha: 0.85),
                      _swatchColor.withValues(alpha: 0.5),
                    ],
                  ),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Icon(
                        _categoryIcon(clothing.category),
                        size:  48,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                    if (!clothing.isDigitized)
                      Positioned(
                        top: 8, right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'En traitement',
                            style: TextStyle(color: Colors.white, fontSize: 10),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    clothing.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.secondaryContainer,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          clothing.estimatedSize,
                          style: theme.textTheme.labelSmall,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          clothing.fabricType,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _categoryIcon(String category) {
    switch (category) {
      case 'top':        return Icons.dry_cleaning_outlined;
      case 'bottom':      return Icons.checkroom_outlined;
      case 'dress':       return Icons.woman_outlined;
      case 'outerwear':   return Icons.ac_unit_outlined;
      case 'underwear':   return Icons.inventory_2_outlined;
      default:            return Icons.checkroom_outlined;
    }
  }
}