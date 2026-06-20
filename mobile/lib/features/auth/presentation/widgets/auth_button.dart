import 'package:flutter/material.dart';

class AuthButton extends StatelessWidget {
  final String    label;
  final VoidCallback? onPressed;
  final bool      isLoading;
  final bool      isOutlined;

  const AuthButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading  = false,
    this.isOutlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final child = isLoading
      ? SizedBox(
          height: 20, width: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: isOutlined
              ? theme.colorScheme.primary
              : theme.colorScheme.onPrimary,
          ),
        )
      : Text(
          label,
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w600,
            color: isOutlined
              ? theme.colorScheme.primary
              : theme.colorScheme.onPrimary,
          ),
        );

    if (isOutlined) {
      return SizedBox(
        width: double.infinity,
        height: 52,
        child: OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            side: BorderSide(color: theme.colorScheme.primary),
          ),
          child: child,
        ),
      );
    }

    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: child,
      ),
    );
  }
}