import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../tryon/data/models/clothing_model.dart';
import '../bloc/clothing_upload_bloc.dart';
import '../bloc/clothing_upload_event.dart';
import '../bloc/clothing_upload_state.dart';

class ClothingUploadScreen extends StatefulWidget {
  const ClothingUploadScreen({super.key});

  @override
  State<ClothingUploadScreen> createState() => _ClothingUploadScreenState();
}

class _ClothingUploadScreenState extends State<ClothingUploadScreen> {
  final _picker      = ImagePicker();
  final _nameCtrl     = TextEditingController();
  ClothingCategory    _category = ClothingCategory.top;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _addPhoto() async {
    final picked = await _picker.pickImage(
      source: ImageSource.camera, imageQuality: 85, maxWidth: 1280,
    );
    if (picked == null || !mounted) return;
    context.read<ClothingUploadBloc>().add(
      ClothingUploadPhotoAdded(File(picked.path)),
    );
  }

  Future<void> _addFromGallery() async {
    final picked = await _picker.pickImage(
      source: ImageSource.gallery, imageQuality: 85, maxWidth: 1280,
    );
    if (picked == null || !mounted) return;
    context.read<ClothingUploadBloc>().add(
      ClothingUploadPhotoAdded(File(picked.path)),
    );
  }

  void _submit() {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Donnez un nom au vêtement.')),
      );
      return;
    }
    final vendorId = context.read<AuthBloc>().state.user?.id;
    if (vendorId == null) return;

    context.read<ClothingUploadBloc>().add(ClothingUploadSubmitted(
      vendorId: vendorId,
      name:     _nameCtrl.text.trim(),
      category: _category.apiValue,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Ajouter un vêtement')),
      body: BlocConsumer<ClothingUploadBloc, ClothingUploadState>(
        listener: (context, state) {
          if (state.status == ClothingUploadStatus.error &&
              state.errorMessage != null) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(
                content:         Text(state.errorMessage!),
                backgroundColor: theme.colorScheme.error,
              ));
          }
          if (state.status == ClothingUploadStatus.success) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(const SnackBar(
                content: Text('Vêtement numérisé avec succès ✓'),
                backgroundColor: Colors.green,
              ));
            context.pop();
          }
        },
        builder: (context, state) {
          final isUploading = state.status == ClothingUploadStatus.uploading;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _nameCtrl,
                  decoration: InputDecoration(
                    labelText: 'Nom du vêtement',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),

                Text('Catégorie', style: theme.textTheme.titleSmall),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: ClothingCategory.values.map((c) {
                    final isSelected = c == _category;
                    return ChoiceChip(
                      label:    Text(c.label),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _category = c),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 24),
                Text(
                  'Photos (2-5, plusieurs angles recommandés)',
                  style: theme.textTheme.titleSmall,
                ),
                const SizedBox(height: 12),

                GridView.builder(
                  shrinkWrap: true,
                  physics:    const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8,
                  ),
                  itemCount: state.photos.length + (state.photos.length < 5 ? 1 : 0),
                  itemBuilder: (context, i) {
                    if (i == state.photos.length) {
                      return GestureDetector(
                        onTap: () => _showAddPhotoSheet(),
                        child: Container(
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.add_a_photo_outlined,
                              color: theme.colorScheme.primary),
                        ),
                      );
                    }
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.file(
                            state.photos[i], fit: BoxFit.cover,
                            width: double.infinity, height: double.infinity,
                          ),
                        ),
                        Positioned(
                          top: 2, right: 2,
                          child: GestureDetector(
                            onTap: () => context.read<ClothingUploadBloc>().add(
                              ClothingUploadPhotoRemoved(i),
                            ),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                color: Colors.black54, shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close, size: 16, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 32),
                SizedBox(
                  height: 52,
                  child: FilledButton(
                    onPressed: isUploading ? null : _submit,
                    style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: isUploading
                      ? const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(width: 20, height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                            SizedBox(width: 12),
                            Text('Analyse en cours…'),
                          ],
                        )
                      : const Text('Numériser le vêtement'),
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

  void _showAddPhotoSheet() {
    showModalBottomSheet(
      context: context,
      builder: (sheetCtx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title:   const Text('Prendre une photo'),
              onTap:   () { Navigator.pop(sheetCtx); _addPhoto(); },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title:   const Text('Choisir depuis la galerie'),
              onTap:   () { Navigator.pop(sheetCtx); _addFromGallery(); },
            ),
          ],
        ),
      ),
    );
  }
}