import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/personalization_bloc.dart';
import '../bloc/personalization_event.dart';
import '../bloc/personalization_state.dart';

class PersonalizationScreen extends StatefulWidget {
  const PersonalizationScreen({super.key});

  @override
  State<PersonalizationScreen> createState() => _PersonalizationScreenState();
}

class _PersonalizationScreenState extends State<PersonalizationScreen> {
  final _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source:       source,
        imageQuality: 85,
        maxWidth:     1280,
      );
      if (picked == null || !mounted) return;

      context.read<PersonalizationBloc>().add(
        PersonalizationPhotoSelected(File(picked.path)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Impossible d\'accéder à la photo : $e')),
      );
    }
  }

  void _showSourcePicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: Theme.of(sheetCtx).colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title:   const Text('Prendre une photo'),
              onTap: () {
                Navigator.pop(sheetCtx);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title:   const Text('Choisir depuis la galerie'),
              onTap: () {
                Navigator.pop(sheetCtx);
                _pickImage(ImageSource.gallery);
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _submit() {
    final userId = context.read<AuthBloc>().state.user?.id;
    if (userId == null) return;
    context.read<PersonalizationBloc>().add(
      PersonalizationUploadRequested(userId),
    );
  }

  void _skip() {
    context.read<PersonalizationBloc>().add(const PersonalizationSkipped());
    context.go('/avatar/viewer');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Personnalisez votre avatar'),
        leading: IconButton(
          icon:      const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          TextButton(
            onPressed: _skip,
            child:     const Text('Ignorer'),
          ),
        ],
      ),
      body: BlocConsumer<PersonalizationBloc, PersonalizationState>(
        listener: (context, state) {
          if (state.status == PersonalizationStatus.error &&
              state.errorMessage != null) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(
                content:         Text(state.errorMessage!),
                backgroundColor: theme.colorScheme.error,
                behavior:        SnackBarBehavior.floating,
              ));
          }
          if (state.status == PersonalizationStatus.success) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(const SnackBar(
                content: Text('Avatar personnalisé ✓'),
                backgroundColor: Colors.green,
                behavior: SnackBarBehavior.floating,
              ));
            context.go('/avatar/viewer');
          }
        },
        builder: (context, state) {
          final isUploading = state.status == PersonalizationStatus.uploading;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  'Ajoutez une photo de votre visage pour affiner '
                  'le teint de peau et la couleur des cheveux de votre avatar.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 32),

                GestureDetector(
                  onTap: isUploading ? null : _showSourcePicker,
                  child: Container(
                    width:  220, height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: theme.colorScheme.surfaceContainerHighest,
                      border: Border.all(
                        color: theme.colorScheme.primary.withValues(alpha: 0.3),
                        width: 2,
                      ),
                      image: state.selectedPhoto != null
                        ? DecorationImage(
                            image: FileImage(state.selectedPhoto!),
                            fit:   BoxFit.cover,
                          )
                        : null,
                    ),
                    child: state.selectedPhoto == null
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.add_a_photo_outlined,
                              size:  48,
                              color: theme.colorScheme.primary,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Ajouter une photo',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        )
                      : null,
                  ),
                ),

                if (state.selectedPhoto != null) ...[
                  const SizedBox(height: 16),
                  TextButton.icon(
                    onPressed: isUploading ? null : _showSourcePicker,
                    icon:      const Icon(Icons.refresh, size: 18),
                    label:     const Text('Changer la photo'),
                  ),
                ],

                const SizedBox(height: 12),

                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.privacy_tip_outlined,
                          size: 18, color: theme.colorScheme.secondary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Votre photo est utilisée uniquement pour analyser '
                          'le teint et la couleur de cheveux. Étape facultative.',
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                SizedBox(
                  height: 52,
                  width:  double.infinity,
                  child: FilledButton(
                    onPressed: (state.selectedPhoto == null || isUploading)
                      ? null
                      : _submit,
                    style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: isUploading
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
                            Text('Analyse en cours…'),
                          ],
                        )
                      : const Text('Analyser et continuer'),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: isUploading ? null : _skip,
                  child: const Text('Passer cette étape'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}