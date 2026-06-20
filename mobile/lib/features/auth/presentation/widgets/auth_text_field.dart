import 'package:flutter/material.dart';

class AuthTextField extends StatefulWidget {
  final TextEditingController controller;
  final String                label;
  final String?               hint;
  final bool                  isPassword;
  final TextInputType         keyboardType;
  final String? Function(String?)? validator;
  final IconData?             prefixIcon;
  final TextInputAction       textInputAction;
  final VoidCallback?         onEditingComplete;

  const AuthTextField({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    this.isPassword          = false,
    this.keyboardType        = TextInputType.text,
    this.validator,
    this.prefixIcon,
    this.textInputAction     = TextInputAction.next,
    this.onEditingComplete,
  });

  @override
  State<AuthTextField> createState() => _AuthTextFieldState();
}

class _AuthTextFieldState extends State<AuthTextField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TextFormField(
      controller:         widget.controller,
      obscureText:        widget.isPassword && _obscure,
      keyboardType:       widget.keyboardType,
      textInputAction:    widget.textInputAction,
      onEditingComplete:  widget.onEditingComplete,
      validator:          widget.validator,
      style: theme.textTheme.bodyLarge,
      decoration: InputDecoration(
        labelText:   widget.label,
        hintText:    widget.hint,
        prefixIcon:  widget.prefixIcon != null
          ? Icon(widget.prefixIcon, color: theme.colorScheme.primary)
          : null,
        suffixIcon: widget.isPassword
          ? IconButton(
              icon: Icon(
                _obscure ? Icons.visibility_outlined
                         : Icons.visibility_off_outlined,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              onPressed: () => setState(() => _obscure = !_obscure),
            )
          : null,
        border:        OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.5),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   BorderSide(
            color: theme.colorScheme.primary,
            width: 2,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   BorderSide(color: theme.colorScheme.error),
        ),
        filled:      true,
        fillColor:   theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16, vertical: 16,
        ),
      ),
    );
  }
}