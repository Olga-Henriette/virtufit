import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../data/models/measurement_model.dart';
import '../bloc/measurements_bloc.dart';
import '../bloc/measurements_event.dart';
import '../bloc/measurements_state.dart';
import '../widgets/measurement_input_field.dart';

class MeasurementsScreen extends StatefulWidget {
  const MeasurementsScreen({super.key});

  @override
  State<MeasurementsScreen> createState() => _MeasurementsScreenState();
}

class _MeasurementsScreenState extends State<MeasurementsScreen> {
  final _formKey = GlobalKey<FormState>();

  final _heightCtrl    = TextEditingController();
  final _weightCtrl    = TextEditingController();
  final _chestCtrl     = TextEditingController();
  final _waistCtrl     = TextEditingController();
  final _hipsCtrl      = TextEditingController();
  final _shoulderCtrl  = TextEditingController();
  final _inseamCtrl    = TextEditingController();
  final _neckCtrl      = TextEditingController();
  final _armCtrl       = TextEditingController();
  final _thighCtrl     = TextEditingController();

  Gender _selectedGender = Gender.neutral;
  bool   _initialized    = false;

  @override
  void initState() {
    super.initState();
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId != null) {
      context.read<MeasurementsBloc>().add(
        MeasurementsLoadActiveRequested(userId),
      );
    }
  }

  @override
  void dispose() {
    for (final c in [
      _heightCtrl, _weightCtrl, _chestCtrl, _waistCtrl, _hipsCtrl,
      _shoulderCtrl, _inseamCtrl, _neckCtrl, _armCtrl, _thighCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _fillFromExisting(MeasurementModel m) {
    if (_initialized) return;
    _initialized = true;
    _heightCtrl.text   = m.heightCm.toString();
    _weightCtrl.text   = m.weightKg.toString();
    _chestCtrl.text    = m.chestCm.toString();
    _waistCtrl.text    = m.waistCm.toString();
    _hipsCtrl.text     = m.hipsCm.toString();
    _shoulderCtrl.text = m.shoulderWidthCm.toString();
    if (m.inseamCm    != null) _inseamCtrl.text = m.inseamCm.toString();
    if (m.neckCm      != null) _neckCtrl.text   = m.neckCm.toString();
    if (m.armLengthCm != null) _armCtrl.text    = m.armLengthCm.toString();
    if (m.thighCm     != null) _thighCtrl.text  = m.thighCm.toString();
    _selectedGender = m.gender;
  }

  double _parse(String text) =>
      double.parse(text.trim().replaceAll(',', '.'));

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId == null) return;

    final measurements = MeasurementModel(
      userId:          userId,
      heightCm:        _parse(_heightCtrl.text),
      weightKg:        _parse(_weightCtrl.text),
      chestCm:         _parse(_chestCtrl.text),
      waistCm:         _parse(_waistCtrl.text),
      hipsCm:          _parse(_hipsCtrl.text),
      shoulderWidthCm: _parse(_shoulderCtrl.text),
      inseamCm:        _inseamCtrl.text.isNotEmpty ? _parse(_inseamCtrl.text) : null,
      neckCm:          _neckCtrl.text.isNotEmpty   ? _parse(_neckCtrl.text)   : null,
      armLengthCm:     _armCtrl.text.isNotEmpty    ? _parse(_armCtrl.text)    : null,
      thighCm:         _thighCtrl.text.isNotEmpty  ? _parse(_thighCtrl.text)  : null,
      gender:          _selectedGender,
    );

    context.read<MeasurementsBloc>().add(
      MeasurementsSubmitRequested(userId: userId, measurements: measurements),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes mensurations'),
        leading: IconButton(
          icon:      const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<MeasurementsBloc, MeasurementsState>(
        listener: (context, state) {
          if (state.status == MeasurementsStatus.error &&
              state.errorMessage != null) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(
                content:         Text(state.errorMessage!),
                backgroundColor: theme.colorScheme.error,
                behavior:        SnackBarBehavior.floating,
              ));
          }
          if (state.status == MeasurementsStatus.success) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(
                content: const Text('Mensurations enregistrées ✓'),
                backgroundColor: Colors.green,
                behavior: SnackBarBehavior.floating,
              ));
            context.push('/avatar/morphotype');
          }
          if (state.active != null) {
            _fillFromExisting(state.active!);
          }
        },
        builder: (context, state) {
          if (state.status == MeasurementsStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          final isSubmitting = state.status == MeasurementsStatus.submitting;

          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (state.active != null) _buildExistingBanner(theme),

                Text(
                  'Mensurations principales',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Requises pour générer votre avatar 3D',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),

                _buildGenderSelector(theme),
                const SizedBox(height: 20),

                Row(
                  children: [
                    Expanded(
                      child: MeasurementInputField(
                        controller: _heightCtrl,
                        label:      'Taille',
                        unit:       'cm',
                        min:        50, max: 250,
                        icon:       Icons.height,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: MeasurementInputField(
                        controller: _weightCtrl,
                        label:      'Poids',
                        unit:       'kg',
                        min:        20, max: 250,
                        icon:       Icons.monitor_weight_outlined,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                MeasurementInputField(
                  controller: _chestCtrl,
                  label:      'Tour de poitrine',
                  unit:       'cm',
                  min:        50, max: 200,
                  icon:       Icons.accessibility_new,
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Expanded(
                      child: MeasurementInputField(
                        controller: _waistCtrl,
                        label:      'Tour de taille',
                        unit:       'cm',
                        min:        40, max: 180,
                        icon:       Icons.straighten,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: MeasurementInputField(
                        controller: _hipsCtrl,
                        label:      'Tour de hanches',
                        unit:       'cm',
                        min:        50, max: 200,
                        icon:       Icons.straighten,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                MeasurementInputField(
                  controller: _shoulderCtrl,
                  label:      'Largeur d\'épaules',
                  unit:       'cm',
                  min:        20, max: 80,
                  icon:       Icons.architecture,
                ),

                const SizedBox(height: 28),

                ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: Text(
                    'Mensurations optionnelles',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: const Text('Affinent davantage votre avatar'),
                  children: [
                    const SizedBox(height: 8),
                    MeasurementInputField(
                      controller: _inseamCtrl,
                      label:      'Entrejambe',
                      unit:       'cm',
                      min:        30, max: 120,
                      icon:       Icons.height,
                      required:   false,
                    ),
                    const SizedBox(height: 16),
                    MeasurementInputField(
                      controller: _neckCtrl,
                      label:      'Tour de cou',
                      unit:       'cm',
                      min:        20, max: 60,
                      icon:       Icons.circle_outlined,
                      required:   false,
                    ),
                    const SizedBox(height: 16),
                    MeasurementInputField(
                      controller: _armCtrl,
                      label:      'Longueur de bras',
                      unit:       'cm',
                      min:        30, max: 100,
                      icon:       Icons.front_hand_outlined,
                      required:   false,
                    ),
                    const SizedBox(height: 16),
                    MeasurementInputField(
                      controller: _thighCtrl,
                      label:      'Tour de cuisse',
                      unit:       'cm',
                      min:        20, max: 100,
                      icon:       Icons.straighten,
                      required:   false,
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                SizedBox(
                  height: 52,
                  child: FilledButton(
                    onPressed: isSubmitting ? null : _submit,
                    style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: isSubmitting
                      ? const SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white,
                          ),
                        )
                      : const Text('Continuer vers l\'avatar'),
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

  Widget _buildExistingBanner(ThemeData theme) {
    return Container(
      margin:  const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:        theme.colorScheme.primaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: theme.colorScheme.primary, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Vous avez déjà des mensurations enregistrées. '
              'Les modifier créera une nouvelle version.',
              style: theme.textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGenderSelector(ThemeData theme) {
    final options = [
      (Gender.male,    'Homme',  Icons.male),
      (Gender.female,  'Femme',  Icons.female),
      (Gender.neutral, 'Neutre', Icons.person_outline),
    ];

    return Row(
      children: options.map((opt) {
        final isSelected = _selectedGender == opt.$1;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: GestureDetector(
              onTap: () => setState(() => _selectedGender = opt.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding:  const EdgeInsets.symmetric(vertical: 14),
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
                  children: [
                    Icon(
                      opt.$3,
                      color: isSelected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      opt.$2,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        color: isSelected
                          ? theme.colorScheme.primary
                          : theme.colorScheme.onSurfaceVariant,
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