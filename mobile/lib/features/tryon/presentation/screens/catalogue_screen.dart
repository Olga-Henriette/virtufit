import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/catalogue_bloc.dart';
import '../bloc/catalogue_event.dart';
import '../bloc/catalogue_state.dart';
import '../widgets/clothing_card.dart';
import '../../data/models/clothing_model.dart';

const String _demoVendorId = '523e4567-e89b-12d3-a456-426614174004';

class CatalogueScreen extends StatefulWidget {
  const CatalogueScreen({super.key});

  @override
  State<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends State<CatalogueScreen> {
  @override
  void initState() {
    super.initState();
    context.read<CatalogueBloc>().add(
      const CatalogueLoadRequested(vendorId: _demoVendorId),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Catalogue')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: _buildCategoryFilter(theme),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: BlocBuilder<CatalogueBloc, CatalogueState>(
              builder: (context, state) {
                switch (state.status) {
                  case CatalogueStatus.initial:
                  case CatalogueStatus.loading:
                    return const Center(child: CircularProgressIndicator());

                  case CatalogueStatus.error:
                    return _buildError(theme, state.errorMessage);

                  case CatalogueStatus.empty:
                    return _buildEmpty(theme);

                  case CatalogueStatus.loaded:
                    return _buildGrid(state.items);
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryFilter(ThemeData theme) {
    final categories = [null, ...ClothingCategory.values];

    return SizedBox(
      height: 38,
      child: BlocBuilder<CatalogueBloc, CatalogueState>(
        builder: (context, state) {
          return ListView.separated(
            scrollDirection:  Axis.horizontal,
            itemCount:        categories.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, i) {
              final cat        = categories[i];
              final label      = cat?.label ?? 'Tous';
              final apiValue   = cat?.apiValue;
              final isSelected = state.activeCategory == apiValue;

              return ChoiceChip(
                label:    Text(label),
                selected: isSelected,
                onSelected: (_) => context
                    .read<CatalogueBloc>()
                    .add(CatalogueCategoryFilterChanged(apiValue)),
                selectedColor: theme.colorScheme.primaryContainer,
                labelStyle: TextStyle(
                  color: isSelected
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurfaceVariant,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildGrid(List<ClothingModel> items) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount:  2,
        crossAxisSpacing: 12,
        mainAxisSpacing:  12,
        childAspectRatio: 0.72,
      ),
      itemCount: items.length,
      itemBuilder: (context, i) {
        final clothing = items[i];
        return ClothingCard(
          clothing: clothing,
          onTap: () => context.push(
            '/tryon/start',
            extra: {'clothingId': clothing.clothingId, 'clothing': clothing},
          ),
        );
      },
    );
  }

  Widget _buildEmpty(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.checkroom_outlined,
                size: 64, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('Aucun vêtement disponible', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Ce vendeur n\'a pas encore ajouté de vêtements '
              'dans cette catégorie.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(ThemeData theme, String? message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(message ?? 'Une erreur est survenue.', textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.read<CatalogueBloc>().add(
                const CatalogueLoadRequested(vendorId: _demoVendorId),
              ),
              child: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}