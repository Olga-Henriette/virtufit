import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/bloc/auth_event.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final _tabs = const [
    _TabItem(icon: Icons.home_outlined,     activeIcon: Icons.home,          label: 'Accueil'),
    _TabItem(icon: Icons.person_outlined,   activeIcon: Icons.person,        label: 'Avatar'),
    _TabItem(icon: Icons.checkroom_outlined,activeIcon: Icons.checkroom,     label: 'Essayage'),
    _TabItem(icon: Icons.store_outlined,    activeIcon: Icons.store,         label: 'Vendeur'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'VirtuFit',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
            color:      theme.colorScheme.primary,
          ),
        ),
        actions: [
          IconButton(
            icon:      const Icon(Icons.logout_outlined),
            tooltip:   'Se déconnecter',
            onPressed: () => _confirmLogout(context),
          ),
        ],
      ),
      body: _buildBody(context),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: _tabs.map((t) => NavigationDestination(
          icon:          Icon(t.icon),
          selectedIcon:  Icon(t.activeIcon),
          label:         t.label,
        )).toList(),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    final theme = Theme.of(context);
    final user  = context.select((AuthBloc b) => b.state.user);

    switch (_currentIndex) {
      case 0:
        return _HomeTab(user: user);
      case 1:
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.person, size: 64,
                  color: theme.colorScheme.primary.withValues(alpha: 0.5)),
              const SizedBox(height: 16),
              Text('Mon Avatar', style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                'Consultez ou créez votre avatar 3D',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => context.push('/avatar/viewer'),
                child: const Text('Voir mon avatar'),
              ),
            ],
          ),
        );
      case 2:
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.checkroom, size: 64,
                  color: theme.colorScheme.secondary.withValues(alpha: 0.5)),
              const SizedBox(height: 16),
              Text('Essayage Virtuel', style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                'Parcourez le catalogue et essayez des vêtements',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => context.push('/tryon/catalogue'),
                child: const Text('Voir le catalogue'),
              ),
            ],
          ),
        );
      case 3:
        return _PlaceholderTab(
          icon:    Icons.store,
          title:   'Dashboard Vendeur',
          subtitle: 'Gérez votre catalogue',
          color:   Colors.orange,
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title:   const Text('Se déconnecter'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child:     const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child:     const Text('Déconnecter'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      context.read<AuthBloc>().add(const AuthLogoutRequested());
    }
  }
}

// Onglet Accueil

class _HomeTab extends StatelessWidget {
  final dynamic user;
  const _HomeTab({this.user});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Salutation
          Container(
            width:   double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  theme.colorScheme.primaryContainer,
                  theme.colorScheme.secondaryContainer,
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bonjour${user != null ? ", ${user.firstName}" : ""} 👋',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Prêt à essayer de nouveaux vêtements ?',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 28),

          // Actions rapides
          Text(
            'Actions rapides',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),

          GridView.count(
            crossAxisCount:  2,
            shrinkWrap:      true,
            physics:         const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing:  12,
            childAspectRatio: 1.4,
            children: [
              _QuickActionCard(
                icon:    Icons.person_add_outlined,
                label:   'Créer mon avatar',
                color:   theme.colorScheme.primaryContainer,
                onTap:   () => context.push('/avatar/measurements'),
              ),
              _QuickActionCard(
                icon:    Icons.search_outlined,
                label:   'Parcourir le catalogue',
                color:   theme.colorScheme.secondaryContainer,
                onTap:   () => context.push('/tryon/catalogue'),
              ),
              _QuickActionCard(
                icon:    Icons.history_outlined,
                label:   'Mes essayages',
                color:   theme.colorScheme.tertiaryContainer,
                onTap:   () => context.push('/tryon/history'),
              ),
              _QuickActionCard(
                icon:    Icons.analytics_outlined,
                label:   'Mes statistiques',
                color:   theme.colorScheme.errorContainer,
                onTap:   () {},
              ),
            ],
          ),

          const SizedBox(height: 28),

          // Statut du système
          Text(
            'Statut du système',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),

          _StatusCard(
            label:  'Backend API',
            status: 'Connecté',
            icon:   Icons.cloud_done_outlined,
            color:  Colors.green,
          ),
          const SizedBox(height: 8),
          _StatusCard(
            label:  'AI Services',
            status: 'Opérationnel',
            icon:   Icons.memory_outlined,
            color:  Colors.green,
          ),
        ],
      ),
    );
  }
}

// Widgets partagés

class _QuickActionCard extends StatelessWidget {
  final IconData   icon;
  final String     label;
  final Color      color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap:        onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding:    const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color:        color,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style:     const TextStyle(
                fontSize:   12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final String label;
  final String status;
  final IconData icon;
  final Color  color;

  const _StatusCard({
    required this.label,
    required this.status,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 12),
            Text(label, style: theme.textTheme.bodyMedium),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color:        color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                status,
                style: TextStyle(
                  color:      color,
                  fontSize:   12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaceholderTab extends StatelessWidget {
  final IconData icon;
  final String   title;
  final String   subtitle;
  final Color    color;

  const _PlaceholderTab({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 64, color: color.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          Text(title, style: theme.textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'En cours de développement…',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _TabItem {
  final IconData icon;
  final IconData activeIcon;
  final String   label;
  const _TabItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}