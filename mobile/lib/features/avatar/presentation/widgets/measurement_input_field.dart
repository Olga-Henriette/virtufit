import 'package:flutter/material.dart';

class MeasurementInputField extends StatelessWidget {
  final TextEditingController controller;
  final String  label;
  final String  unit;
  final double  min;
  final double  max;
  final IconData icon;
  final bool    required;

  const MeasurementInputField({
    super.key,
    required this.controller,
    required this.label,
    required this.unit,
    required this.min,
    required this.max,
    required this.icon,
    this.required = true,
  });

  String? _validate(String? value) {
    if (value == null || value.trim().isEmpty) {
      return required ? 'Requis' : null;
    }
    final parsed = double.tryParse(value.replaceAll(',', '.'));
    if (parsed == null) return 'Nombre invalide';
    if (parsed < min || parsed > max) {
      return 'Entre $min et $max $unit';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TextFormField(
      controller:   controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      validator:    _validate,
      style:        theme.textTheme.bodyLarge,
      decoration: InputDecoration(
        labelText:  label,
        suffixText: unit,
        prefixIcon: Icon(icon, size: 20, color: theme.colorScheme.primary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        filled:    true,
        fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}