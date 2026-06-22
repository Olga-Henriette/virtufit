import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/morphotype_bloc.dart';
import '../bloc/morphotype_event.dart';
import '../bloc/morphotype_state.dart';
import '../../data/models/morphotype_model.dart';
import '../widgets/morphotype_card.dart';

class MorphotypeScreen extends StatefulWidget {
  final double heightCm;
  final double weightKg;

  const MorphotypeScreen({
    super.key,
    required this.heightCm,
    required this.weightKg,
  });

  @override
  State<MorphotypeScreen> createState() => _MorphotypeScreenState();
}

class _MorphotypeScreenState extends State<MorphotypeScreen> {
  MorphotypeGender? _filterGender;

  List<MorphotypeOption> get _filtered {
    if (_filterGender == null) return morphotypeCatalogue;
    return morphotypeCatalogue
        .where((m) => m.gender == _filterGender)
        .toList();
  }

  void _submit() {
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId == null) return;

    context.read<MorphotypeBloc>().add(MorphotypeGenerateRequested(
      userId:         userId,
      targetHeightCm: widget.heightCm,
      targetWeightKg: widget.weightKg,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Choisissez votre morphotype'),
        leading: IconButton(
          icon:      const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<MorphotypeBloc, MorphotypeState>(
        listener: (context, state) {
          if (state.status == MorphotypeStatus.error &&
              state.errorMessage != null) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(
                content:         Text(state.errorMessage!),
                backgroundColor: theme.colorScheme.error,
                behavior:        SnackBarBehavior.floating,
              ));
          }
          if (state.status == MorphotypeStatus.success) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(const SnackBar(
                content: Text('Avatar généré avec succès ✓'),
                backgroundColor: Colors.green,
                behavior: SnackBarBehavior.floating,
              ));
            context.go('/home');
          }
        },
        builder: (context, state) {
          final isGenerating = state.status == MorphotypeStatus.generating;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Text(
                  'Sélectionnez la silhouette qui correspond le mieux à '
                  'votre morphologie. Elle sera adaptée à vos mensurations '
                  '(${widget.heightCm.toStringAsFixed(0)} cm, '
                  '${widget.weightKg.toStringAsFixed(0)} kg).',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildGenderFilter(theme),
              ),
              const SizedBox(height: 12),

              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  itemCount: _filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final option = _filtered[index];
                    return MorphotypeCard(
                      option:     option,
                      isSelected: state.selectedCode == option.code,
                      onTap: () => context
                          .read<MorphotypeBloc>()
                          .add(MorphotypeSelected(option.code)),
                    );
                  },
                ),
              ),

              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: SizedBox(
                    height: 52,
                    child: FilledButton(
                      onPressed: (state.selectedCode == null || isGenerating)
                        ? null
                        : _submit,
                      style: FilledButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: isGenerating
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20, height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white,
                                ),
                              ),
                              SizedBox(width: 12),
                              Text('Génération en cours…'),
                            ],
                          )
                        : const Text('Générer mon avatar'),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildGenderFilter(ThemeData theme) {
    final options = [
      (null,                     'Tous'),
      (MorphotypeGender.male,    'Homme'),
      (MorphotypeGender.female,  'Femme'),
      (MorphotypeGender.neutral, 'Neutre'),
    ];

    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection:  Axis.horizontal,
        itemCount:        options.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final opt        = options[i];
          final isSelected = _filterGender == opt.$1;
          return ChoiceChip(
            label:    Text(opt.$2),
            selected: isSelected,
            onSelected: (_) => setState(() => _filterGender = opt.$1),
            selectedColor: theme.colorScheme.primaryContainer,
            labelStyle: TextStyle(
              color: isSelected
                ? theme.colorScheme.primary
                : theme.colorScheme.onSurfaceVariant,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          );
        },
      ),
    );
  }
}