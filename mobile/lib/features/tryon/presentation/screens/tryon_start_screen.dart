import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../avatar/data/repositories/avatar_repository.dart';
import '../../../avatar/data/models/avatar_model.dart';
import '../../data/models/clothing_model.dart';
import '../../data/models/tryon_model.dart';
import '../bloc/tryon_bloc.dart';
import '../bloc/tryon_event.dart';
import '../bloc/tryon_state.dart';
import 'package:get_it/get_it.dart';

class TryOnStartScreen extends StatefulWidget {
  final String        clothingId;
  final ClothingModel clothing;

  const TryOnStartScreen({
    super.key,
    required this.clothingId,
    required this.clothing,
  });

  @override
  State<TryOnStartScreen> createState() => _TryOnStartScreenState();
}

class _TryOnStartScreenState extends State<TryOnStartScreen> {
  AvatarModel? _avatar;
  bool         _loadingAvatar = true;
  String?      _avatarError;

  @override
  void initState() {
    super.initState();
    _loadAvatar();
  }

  Future<void> _loadAvatar() async {
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId == null) return;

    try {
      final avatar = await GetIt.instance<AvatarRepository>().getActive(userId);
      setState(() {
        _avatar        = avatar;
        _loadingAvatar = false;
        _avatarError   = avatar == null ? 'Aucun avatar actif trouvé.' : null;
      });
    } catch (_) {
      setState(() {
        _loadingAvatar = false;
        _avatarError    = 'Impossible de charger votre avatar.';
      });
    }
  }

  void _launchTryOn() {
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId == null || _avatar == null) return;

    context.read<TryOnBloc>().add(TryOnStartRequested(
      userId:     userId,
      avatarId:   _avatar!.avatarId,
      clothingId: widget.clothingId,
    ));
  }

  Color get _swatchColor {
    final rgb = widget.clothing.colorInfo.dominantRgb;
    if (rgb.length < 3) return Colors.grey;
    return Color.fromARGB(255, rgb[0], rgb[1], rgb[2]);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Essayage virtuel'),
        leading: IconButton(
          icon:      const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<TryOnBloc, TryOnState>(
        listener: (context, state) {
          if (state.status == TryOnStatus.error && state.errorMessage != null) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(
                content:         Text(state.errorMessage!),
                backgroundColor: theme.colorScheme.error,
                behavior:        SnackBarBehavior.floating,
              ));
          }
          if (state.status == TryOnStatus.success && state.session != null) {
            context.go('/tryon/fit-analysis', extra: {
              'sessionId': state.session!.sessionId,
            });
          }
        },
        builder: (context, state) {
          final isStarting = state.status == TryOnStatus.starting;

          if (_loadingAvatar) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_avatarError != null) {
            return _buildNoAvatar(theme);
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                _buildSummaryCard(theme),
                const SizedBox(height: 24),

                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Type de pose',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                ...TryOnAnimationType.values.map((type) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _buildAnimationOption(theme, type, state.selectedAnimation),
                )),

                const SizedBox(height: 24),

                if (isStarting) _buildProgress(theme),

                SizedBox(
                  height: 52,
                  width:  double.infinity,
                  child: FilledButton.icon(
                    icon:  isStarting
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.play_arrow_rounded),
                    label: Text(isStarting
                      ? 'Simulation en cours…'
                      : 'Lancer l\'essayage'),
                    onPressed: isStarting ? null : _launchTryOn,
                    style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummaryCard(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              color: _swatchColor.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.checkroom_outlined, color: Colors.white),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.clothing.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    )),
                const SizedBox(height: 4),
                Text(
                  '${widget.clothing.fabricType} · taille ${widget.clothing.estimatedSize}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.person, size: 14, color: theme.colorScheme.primary),
                    const SizedBox(width: 4),
                    Text(
                      'Avatar : ${_avatar!.heightCm.toStringAsFixed(0)} cm, '
                      '${_avatar!.weightKg.toStringAsFixed(0)} kg',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimationOption(
    ThemeData theme,
    TryOnAnimationType type,
    TryOnAnimationType selected,
  ) {
    final isSelected = type == selected;
    final icon = switch (type) {
      TryOnAnimationType.standing => Icons.accessibility_new,
      TryOnAnimationType.walking  => Icons.directions_walk,
      TryOnAnimationType.rotating => Icons.threed_rotation,
    };

    return GestureDetector(
      onTap: () => context.read<TryOnBloc>().add(TryOnAnimationSelected(type)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding:  const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
            ? theme.colorScheme.primaryContainer
            : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? theme.colorScheme.primary : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected
              ? theme.colorScheme.primary
              : theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(type.label, style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  )),
                  Text(type.description, style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  )),
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

  Widget _buildProgress(ThemeData theme) {
    return Container(
      margin:  const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const SizedBox(
            width: 18, height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Simulation physique en cours — calcul de la tension du tissu '
              'et de l\'ajustement…',
              style: theme.textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoAvatar(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.person_off_outlined,
                size: 64, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text(_avatarError ?? 'Aucun avatar trouvé.',
                style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              'Créez votre avatar avant de lancer un essayage.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/avatar/measurements'),
              child: const Text('Créer mon avatar'),
            ),
          ],
        ),
      ),
    );
  }
}