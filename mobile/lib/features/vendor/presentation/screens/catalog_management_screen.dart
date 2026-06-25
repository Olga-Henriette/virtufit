import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/catalog_management_bloc.dart';
import '../bloc/catalog_management_event.dart';
import '../bloc/catalog_management_state.dart';
import '../../../tryon/data/models/clothing_model.dart';

class CatalogManagementScreen extends StatefulWidget {
  const CatalogManagementScreen({super.key});

  @override
  State<CatalogManagementScreen> createState() => _CatalogManagementScreenState();
}

class _CatalogManagementScreenState extends State<CatalogManagementScreen> {
  String? _vendorId;

  @override
  void initState() {
    super.initState();
    _vendorId = context.read<AuthBloc>().state.user?.id;
    if (_vendorId != null) {
      context.read<CatalogManagementBloc>().add(
        CatalogManagementLoadRequested(_vendorId!),
      );
    }
  }

  Future<void> _confirmDeactivate(ClothingModel clothing) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title:   const Text('Désactiver ce vêtement ?'),
        content: Text(
          '"${clothing.name}" ne sera plus visible dans le catalogue public.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            child: const Text('Désactiver'),
          ),
        ],
      ),
    );

    if (confirmed == true && _vendorId != null && mounted) {
      context.read<CatalogManagementBloc>().add(
        CatalogManagementDeactivateRequested(
          clothingId: clothing.clothingId,
          vendorId:   _vendorId!,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon catalogue'),
        actions: [
          IconButton(
            icon:      const Icon(Icons.add),
            onPressed: () => context.push('/vendor/upload'),
          ),
        ],
      ),
      body: BlocConsumer<CatalogManagementBloc, CatalogManagementState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(content: Text(state.errorMessage!)));
          }
        },
        builder: (context, state) {
          switch (state.status) {
            case CatalogManagementStatus.loading:
              return const Center(child: CircularProgressIndicator());

            case CatalogManagementStatus.empty:
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.inventory_2_outlined,
                          size: 64, color: theme.colorScheme.onSurfaceVariant),
                      const SizedBox(height: 16),
                      Text('Catalogue vide', style: theme.textTheme.titleMedium),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        icon:  const Icon(Icons.add),
                        label: const Text('Ajouter un vêtement'),
                        onPressed: () => context.push('/vendor/upload'),
                      ),
                    ],
                  ),
                ),
              );

            case CatalogManagementStatus.error:
              return Center(child: Text(state.errorMessage ?? 'Erreur'));

            case CatalogManagementStatus.loaded:
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: state.items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) {
                  final clothing = state.items[i];
                  final rgb = clothing.colorInfo.dominantRgb;
                  final color = rgb.length >= 3
                    ? Color.fromARGB(255, rgb[0], rgb[1], rgb[2])
                    : Colors.grey;

                  return Card(
                    child: ListTile(
                      leading: Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.checkroom, color: Colors.white, size: 20),
                      ),
                      title: Text(clothing.name),
                      subtitle: Text(
                        '${clothing.category} · ${clothing.fabricType} · '
                        'taille ${clothing.estimatedSize}',
                      ),
                      trailing: IconButton(
                        icon:      const Icon(Icons.delete_outline, color: Colors.redAccent),
                        onPressed: () => _confirmDeactivate(clothing),
                      ),
                    ),
                  );
                },
              );
          }
        },
      ),
    );
  }
}