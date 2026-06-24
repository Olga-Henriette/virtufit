import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';
import 'core/network/api_client.dart';
import 'core/storage/secure_storage.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'features/auth/data/repositories/auth_repository.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/avatar/data/repositories/measurements_repository.dart';
import 'features/avatar/presentation/bloc/measurements_bloc.dart';
import 'features/avatar/data/repositories/avatar_repository.dart';
import 'features/avatar/presentation/bloc/morphotype_bloc.dart';
import 'features/avatar/presentation/bloc/personalization_bloc.dart';
import 'features/avatar/presentation/bloc/avatar_viewer_bloc.dart';
import 'features/tryon/data/repositories/catalogue_repository.dart';
import 'features/tryon/presentation/bloc/catalogue_bloc.dart';
import 'features/tryon/data/repositories/tryon_repository.dart';
import 'features/tryon/presentation/bloc/tryon_bloc.dart';
import 'features/tryon/presentation/bloc/fit_analysis_bloc.dart';

final _getIt = GetIt.instance;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Capture les erreurs Flutter non gérées
  FlutterError.onError = (details) {
    debugPrint('FlutterError: ${details.exceptionAsString()}');
    debugPrint(details.stack.toString());
  };

  try {
    await _setupDI();
  } catch (e, st) {
    debugPrint('DI setup error: $e\n$st');
  }

  runApp(const VirtuFitApp());
}

Future<void> _setupDI() async {
  if (_getIt.isRegistered<SecureStorage>()) return;

  final storage = SecureStorage();
  _getIt.registerSingleton<SecureStorage>(storage);

  _getIt.registerSingleton<ApiClient>(
    ApiClient(storage: storage),
  );

  _getIt.registerSingleton<AuthRepository>(
    AuthRepository(
      apiClient: _getIt<ApiClient>(),
      storage:   storage,
    ),
  );

  _getIt.registerFactory<AuthBloc>(
    () => AuthBloc(authRepository: _getIt<AuthRepository>()),
  );

  _getIt.registerSingleton<MeasurementsRepository>(
    MeasurementsRepository(apiClient: _getIt<ApiClient>()),
  );

  _getIt.registerSingleton<AvatarRepository>(
    AvatarRepository(apiClient: _getIt<ApiClient>()),
  );

  _getIt.registerFactory<MeasurementsBloc>(
    () => MeasurementsBloc(repository: _getIt<MeasurementsRepository>()),
  );

  _getIt.registerFactory<MorphotypeBloc>(
    () => MorphotypeBloc(_getIt<AvatarRepository>()),
  );

  _getIt.registerFactory<PersonalizationBloc>(
    () => PersonalizationBloc(_getIt<AvatarRepository>()),
  );

  _getIt.registerFactory<AvatarViewerBloc>(
    () => AvatarViewerBloc(_getIt<AvatarRepository>()),
  );

  _getIt.registerSingleton<CatalogueRepository>(
    CatalogueRepository(apiClient: _getIt<ApiClient>()),
  );
  _getIt.registerFactory<CatalogueBloc>(
    () => CatalogueBloc(_getIt<CatalogueRepository>()),
  );
  
  _getIt.registerSingleton<TryOnRepository>(
    TryOnRepository(apiClient: _getIt<ApiClient>()),
  );
  _getIt.registerFactory<TryOnBloc>(
    () => TryOnBloc(_getIt<TryOnRepository>()),
  );

  _getIt.registerFactory<FitAnalysisBloc>(
    () => FitAnalysisBloc(_getIt<TryOnRepository>()),
  );
}

class VirtuFitApp extends StatefulWidget {
  const VirtuFitApp({super.key});

  @override
  State<VirtuFitApp> createState() => _VirtuFitAppState();
}

class _VirtuFitAppState extends State<VirtuFitApp> {
  late final AuthBloc  _authBloc;
  late final GoRouter  _router;

  @override
  void initState() {
    super.initState();
    _authBloc = _getIt<AuthBloc>();
    _router   = buildRouter(_authBloc);
  }

  @override
  void dispose() {
    _authBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _authBloc,
      child: MaterialApp.router(
        title:                      'VirtuFit',
        debugShowCheckedModeBanner: false,
        theme:                      AppTheme.light(),
        darkTheme:                  AppTheme.dark(),
        themeMode:                  ThemeMode.system,
        routerConfig:               _router,
      ),
    );
  }
}