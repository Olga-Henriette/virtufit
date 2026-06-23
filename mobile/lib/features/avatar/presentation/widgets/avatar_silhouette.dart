import 'package:flutter/material.dart';
import '../../data/models/avatar_model.dart';

class AvatarSilhouette extends StatelessWidget {
  final AvatarModel avatar;
  final String?     skinTone;

  const AvatarSilhouette({
    super.key,
    required this.avatar,
    this.skinTone,
  });

  Color _skinToneColor(ThemeData theme) {
    switch (skinTone) {
      case 'very_light': return const Color(0xFFF5DEB3);
      case 'light':       return const Color(0xFFE8C39E);
      case 'medium':      return const Color(0xFFC68642);
      case 'tan':         return const Color(0xFFA9714B);
      case 'dark':        return const Color(0xFF6B4226);
      case 'very_dark':   return const Color(0xFF3B2414);
      default:            return theme.colorScheme.primary;
    }
  }

  /// Largeur relative du buste selon le BMI (effet visuel seulement)
  double get _widthFactor {
    final bmi = avatar.bmi;
    if (bmi < 18.5) return 0.78;
    if (bmi < 25.0) return 0.88;
    if (bmi < 30.0) return 1.0;
    return 1.12;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _skinToneColor(theme);

    return SizedBox(
      height: 280,
      child: CustomPaint(
        painter: _SilhouettePainter(
          color:       color,
          widthFactor: _widthFactor,
        ),
        child: const SizedBox(width: double.infinity, height: 280),
      ),
    );
  }
}

class _SilhouettePainter extends CustomPainter {
  final Color  color;
  final double widthFactor;

  _SilhouettePainter({required this.color, required this.widthFactor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withValues(alpha: 0.85)
      ..style = PaintingStyle.fill;

    final cx = size.width / 2;
    final baseShoulderWidth = 50.0 * widthFactor;
    final baseHipWidth      = 44.0 * widthFactor;

    final path = Path();

    // Tête
    canvas.drawCircle(Offset(cx, 30), 22, paint);

    // Cou
    final neckRect = Rect.fromCenter(
      center: Offset(cx, 58), width: 16, height: 16,
    );
    canvas.drawRect(neckRect, paint);

    // Torse (trapèze épaules → taille)
    path.moveTo(cx - baseShoulderWidth, 70);
    path.lineTo(cx + baseShoulderWidth, 70);
    path.lineTo(cx + baseHipWidth * 0.7, 165);
    path.lineTo(cx - baseHipWidth * 0.7, 165);
    path.close();
    canvas.drawPath(path, paint);

    // Hanches
    final hipsPath = Path();
    hipsPath.moveTo(cx - baseHipWidth * 0.7, 165);
    hipsPath.lineTo(cx + baseHipWidth * 0.7, 165);
    hipsPath.lineTo(cx + baseHipWidth * 0.55, 200);
    hipsPath.lineTo(cx - baseHipWidth * 0.55, 200);
    hipsPath.close();
    canvas.drawPath(hipsPath, paint);

    // Jambes
    final legGap   = 6.0;
    final legWidth = baseHipWidth * 0.4;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cx - legWidth - legGap, 200, legWidth, 75),
        const Radius.circular(8),
      ),
      paint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cx + legGap, 200, legWidth, 75),
        const Radius.circular(8),
      ),
      paint,
    );

    // Bras
    final armWidth = 14.0;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cx - baseShoulderWidth - armWidth + 4, 75, armWidth, 85),
        const Radius.circular(7),
      ),
      paint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cx + baseShoulderWidth - 4, 75, armWidth, 85),
        const Radius.circular(7),
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _SilhouettePainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.widthFactor != widthFactor;
  }
}