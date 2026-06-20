import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/auth_button.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _emailCtrl  = TextEditingController();
  final _passCtrl   = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthBloc>().add(AuthLoginRequested(
      email:    _emailCtrl.text.trim(),
      password: _passCtrl.text,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final theme  = Theme.of(context);
    final size   = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(
                content:         Text(state.errorMessage!),
                backgroundColor: theme.colorScheme.error,
                behavior:        SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ));
          }
          if (state.isAuthenticated) {
            context.go('/home');
          }
        },
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(height: size.height * 0.08),

                // Logo / Header
                _buildHeader(theme),

                const SizedBox(height: 48),

                // Formulaire
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      AuthTextField(
                        controller:     _emailCtrl,
                        label:          'Adresse email',
                        hint:           'vous@exemple.com',
                        keyboardType:   TextInputType.emailAddress,
                        prefixIcon:     Icons.email_outlined,
                        textInputAction: TextInputAction.next,
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'L\'email est requis.';
                          }
                          if (!RegExp(r'^[\w.]+@[\w]+\.[a-z]{2,}$')
                              .hasMatch(v.trim())) {
                            return 'Format d\'email invalide.';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 16),

                      AuthTextField(
                        controller:     _passCtrl,
                        label:          'Mot de passe',
                        isPassword:     true,
                        prefixIcon:     Icons.lock_outlined,
                        textInputAction: TextInputAction.done,
                        onEditingComplete: _submit,
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Le mot de passe est requis.';
                          }
                          if (v.length < 8) {
                            return 'Minimum 8 caractères.';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 12),

                      // Mot de passe oublié
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () {},
                          child: Text(
                            'Mot de passe oublié ?',
                            style: TextStyle(
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Bouton Se connecter
                      BlocBuilder<AuthBloc, AuthState>(
                        builder: (context, state) => AuthButton(
                          label:     'Se connecter',
                          isLoading: state.isLoading,
                          onPressed: _submit,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Divider
                _buildDivider(theme),

                const SizedBox(height: 24),

                // Lien inscription
                AuthButton(
                  label:      'Créer un compte',
                  isOutlined: true,
                  onPressed:  () => context.push('/register'),
                ),

                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Column(
      children: [
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
            color:        theme.colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(
            Icons.checkroom_rounded,
            size:  40,
            color: theme.colorScheme.primary,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'VirtuFit',
          style: theme.textTheme.headlineLarge?.copyWith(
            fontWeight: FontWeight.w800,
            color:      theme.colorScheme.primary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Essayez avant d\'acheter',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildDivider(ThemeData theme) {
    return Row(
      children: [
        Expanded(child: Divider(color: theme.colorScheme.outlineVariant)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'ou',
            style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
          ),
        ),
        Expanded(child: Divider(color: theme.colorScheme.outlineVariant)),
      ],
    );
  }
}