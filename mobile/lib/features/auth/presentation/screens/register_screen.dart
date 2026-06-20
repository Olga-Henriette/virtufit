import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/auth_button.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl  = TextEditingController();
  final _emailCtrl    = TextEditingController();
  final _passCtrl     = TextEditingController();
  final _confirmCtrl  = TextEditingController();
  String _selectedRole = 'client';

  final _roles = const [
    {'value': 'client',   'label': 'Client',   'icon': Icons.person_outline},
    {'value': 'vendeur',  'label': 'Vendeur',  'icon': Icons.store_outlined},
    {'value': 'styliste', 'label': 'Styliste', 'icon': Icons.design_services_outlined},
  ];

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthBloc>().add(AuthRegisterRequested(
      email:     _emailCtrl.text.trim(),
      password:  _passCtrl.text,
      firstName: _firstNameCtrl.text.trim(),
      lastName:  _lastNameCtrl.text.trim(),
      role:      _selectedRole,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation:       0,
        leading: IconButton(
          icon:      const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Créer un compte',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(
                content:         Text(state.errorMessage!),
                backgroundColor: theme.colorScheme.error,
                behavior:        SnackBarBehavior.floating,
              ));
          }
          if (state.isAuthenticated) {
            context.go('/home');
          }
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Prénom / Nom
                Row(
                  children: [
                    Expanded(
                      child: AuthTextField(
                        controller: _firstNameCtrl,
                        label:      'Prénom',
                        prefixIcon: Icons.badge_outlined,
                        validator:  (v) => v == null || v.trim().isEmpty
                          ? 'Requis' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AuthTextField(
                        controller: _lastNameCtrl,
                        label:      'Nom',
                        validator:  (v) => v == null || v.trim().isEmpty
                          ? 'Requis' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Email
                AuthTextField(
                  controller:   _emailCtrl,
                  label:        'Adresse email',
                  hint:         'vous@exemple.com',
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon:   Icons.email_outlined,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'L\'email est requis.';
                    if (!RegExp(r'^[\w.]+@[\w]+\.[a-z]{2,}$').hasMatch(v.trim())) {
                      return 'Format invalide.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Mot de passe
                AuthTextField(
                  controller: _passCtrl,
                  label:      'Mot de passe',
                  isPassword: true,
                  prefixIcon: Icons.lock_outlined,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Requis.';
                    if (v.length < 8) return 'Minimum 8 caractères.';
                    if (!RegExp(r'(?=.*[A-Z])').hasMatch(v)) {
                      return 'Au moins une majuscule.';
                    }
                    if (!RegExp(r'(?=.*[0-9])').hasMatch(v)) {
                      return 'Au moins un chiffre.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Confirmation
                AuthTextField(
                  controller:     _confirmCtrl,
                  label:          'Confirmer le mot de passe',
                  isPassword:     true,
                  prefixIcon:     Icons.lock_outlined,
                  textInputAction: TextInputAction.done,
                  validator: (v) {
                    if (v != _passCtrl.text) {
                      return 'Les mots de passe ne correspondent pas.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // Sélection du rôle
                Text(
                  'Je suis…',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                _buildRoleSelector(theme),
                const SizedBox(height: 32),

                // Bouton 
                BlocBuilder<AuthBloc, AuthState>(
                  builder: (context, state) => AuthButton(
                    label:     'Créer mon compte',
                    isLoading: state.isLoading,
                    onPressed: _submit,
                  ),
                ),
                const SizedBox(height: 16),

                // Lien connexion
                Center(
                  child: TextButton(
                    onPressed: () => context.pop(),
                    child: RichText(
                      text: TextSpan(
                        text: 'Déjà un compte ? ',
                        style: TextStyle(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        children: [
                          TextSpan(
                            text:  'Se connecter',
                            style: TextStyle(
                              color:      theme.colorScheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleSelector(ThemeData theme) {
    return Row(
      children: _roles.map((role) {
        final isSelected = _selectedRole == role['value'];
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: GestureDetector(
              onTap: () => setState(() => _selectedRole = role['value'] as String),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected
                    ? theme.colorScheme.primaryContainer
                    : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected
                      ? theme.colorScheme.primary
                      : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      role['icon'] as IconData,
                      color: isSelected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      role['label'] as String,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: isSelected
                          ? theme.colorScheme.primary
                          : theme.colorScheme.onSurfaceVariant,
                        fontWeight: isSelected
                          ? FontWeight.w600
                          : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}