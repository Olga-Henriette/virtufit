import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/bloc/auth_state.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/avatar/presentation/bloc/measurements_bloc.dart';
import '../../features/avatar/presentation/bloc/morphotype_bloc.dart';
import '../../features/avatar/presentation/screens/measurements_screen.dart';
import '../../features/avatar/presentation/screens/morphotype_screen.dart';
import '../../shared/screens/splash_screen.dart';
import '../../shared/screens/home_screen.dart';
import '../../features/avatar/presentation/bloc/personalization_bloc.dart';
import '../../features/avatar/presentation/screens/personalization_screen.dart';
import '../../features/avatar/presentation/bloc/avatar_viewer_bloc.dart';
import '../../features/avatar/presentation/screens/avatar_viewer_screen.dart';

GoRouter buildRouter(AuthBloc authBloc) {
  return GoRouter(
    initialLocation:   '/splash',
    refreshListenable: _AuthBlocListenable(authBloc),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isAuth    = authState.status == AuthStatus.authenticated;
      final isUnauth  = authState.status == AuthStatus.unauthenticated;
      final location  = state.matchedLocation;

      if (authState.status == AuthStatus.unknown) {
        return '/splash';
      }
      if (location == '/splash') {
        return isAuth ? '/home' : '/login';
      }
      if (isAuth && (location == '/login' || location == '/register')) {
        return '/home';
      }
      if (isUnauth && location != '/login' && location != '/register') {
        return '/login';
      }
      return null;
    },
    routes: [
      GoRoute(
        path:    '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path:    '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path:    '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path:    '/home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path:    '/avatar/measurements',
        builder: (context, state) => BlocProvider(
          create: (_) => GetIt.instance<MeasurementsBloc>(),
          child:  const MeasurementsScreen(),
        ),
      ),
      GoRoute(
        path:    '/avatar/morphotype',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return BlocProvider(
            create: (_) => GetIt.instance<MorphotypeBloc>(),
            child: MorphotypeScreen(
              heightCm: extra['heightCm'] as double,
              weightKg: extra['weightKg'] as double,
            ),
          );
        },
      ),
      GoRoute(
        path:    '/avatar/personalization',
        builder: (context, state) => BlocProvider(
          create: (_) => GetIt.instance<PersonalizationBloc>(),
          child:  const PersonalizationScreen(),
        ),
      ),
      GoRoute(
        path:    '/avatar/viewer',
        builder: (context, state) => BlocProvider(
          create: (_) => GetIt.instance<AvatarViewerBloc>(),
          child:  const AvatarViewerScreen(),
        ),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page introuvable : ${state.error}'),
      ),
    ),
  );
}

class _AuthBlocListenable extends ChangeNotifier {
  _AuthBlocListenable(AuthBloc bloc) {
    bloc.stream.listen((_) => notifyListeners());
  }
}