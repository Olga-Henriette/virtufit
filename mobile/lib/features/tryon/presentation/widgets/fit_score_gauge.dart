import 'package:flutter/material.dart';
import 'dart:math' as math;

class FitScoreGauge extends StatelessWidget {
  final double score;       // 0–100
  final String category;

  const FitScoreGauge({
    super.key,
    required this.score,
    required this.category,
  });

  Color _colorFor(double score) {
    if (score >= 85) return Colors.green;
    if (score >= 70) return Colors.lightGreen;
    if (score >= 50) return Colors.orange;
    return Colors.redAccent;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _colorFor(score);

    return SizedBox(
      width: 160, height: 160,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size(160, 160),
            painter: _GaugePainter(progress: score / 100, color: color),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                score.toStringAsFixed(0),
                style: theme.textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color:      color,
                ),
              ),
              Text(
                '/ 100',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _categoryLabel(category),
                  style: TextStyle(
                    color:      color,
                    fontWeight: FontWeight.w700,
                    fontSize:   12,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _categoryLabel(String cat) {
    switch (cat) {
      case 'perfect':    return 'Parfait';
      case 'good':       return 'Bon';
      case 'acceptable': return 'Acceptable';
      case 'tight':      return 'Serré';
      case 'loose':      return 'Ample';
      default:           return cat;
    }
  }
}

class _GaugePainter extends CustomPainter {
  final double progress;
  final Color  color;

  _GaugePainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center     = Offset(size.width / 2, size.height / 2);
    final radius     = size.width / 2 - 10;
    const startAngle = -math.pi * 1.25;
    const sweepTotal = math.pi * 1.5;

    final bgPaint = Paint()
      ..color       = color.withValues(alpha: 0.12)
      ..style       = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap   = StrokeCap.round;

    final fgPaint = Paint()
      ..color       = color
      ..style       = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap   = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle, sweepTotal, false, bgPaint,
    );
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle, sweepTotal * progress, false, fgPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}