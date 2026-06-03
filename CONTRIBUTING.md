# Guide de contribution — VirtuFit

## Conventions de nommage

### Git — Commits (Conventional Commits)
type(scope): description courte en minuscules
feat(auth): add JWT refresh token rotation
fix(avatar): correct measurements validation error
docs(api): update swagger descriptions
test(catalogue): add clothing service unit tests
refactor(backend): extract database config to module
chore(devops): update docker base images

**Types autorisés** :

| Type       | Usage                                       |
|------------|---------------------------------------------|
| `feat`     | Nouvelle fonctionnalité                     |
| `fix`      | Correction de bug                           |
| `docs`     | Documentation uniquement                    |
| `test`     | Ajout ou modification de tests              |
| `refactor` | Restructuration sans ajout de fonctionnalité|
| `chore`    | Maintenance, dépendances, config            |
| `perf`     | Amélioration de performance                 |

**Scopes autorisés** :
`auth`, `avatar`, `catalogue`, `try-on`, `backend`,
`ai-services`, `mobile`, `devops`, `docs`

---

### TypeScript — NestJS

```typescript
// Fichiers : kebab-case
user-profile.service.ts
create-avatar.dto.ts

// Classes : PascalCase
export class UserProfileService {}
export class CreateAvatarDto {}

// Méthodes et variables : camelCase
async findUserById(userId: string): Promise<User> {}

// Constantes : SCREAMING_SNAKE_CASE
const MAX_AVATAR_SIZE = 5_000_000;

// Interfaces : PascalCase avec préfixe I
interface UserRepository {}
```

---

### Python — FastAPI

```python
# Fichiers : snake_case
morphology_engine.py
textile_analysis.py

# Classes : PascalCase
class MorphologyEngine:
class TextileAnalysisService:

# Fonctions et variables : snake_case
async def generate_avatar(user_id: str) -> AvatarResponse:
    max_iterations = 100

# Constantes : SCREAMING_SNAKE_CASE
MAX_IMAGE_SIZE = 5_000_000
DEFAULT_DEVICE = "cpu"
```

---

### Flutter — Dart

```dart
// Fichiers : snake_case
avatar_builder_screen.dart
try_on_bloc.dart

// Classes : PascalCase
class AvatarBuilderScreen extends StatelessWidget {}
class TryOnBloc extends Bloc<TryOnEvent, TryOnState> {}

// Variables et méthodes : camelCase
final String userId;
Future<void> loadAvatar() async {}

// Constantes : camelCase avec const
const double kAvatarHeight = 180.0;
```

---

## Processus de développement

Même si VirtuFit est développé individuellement,
les conventions de commits et les revues de code
sont conservées afin de respecter les pratiques
professionnelles de l'industrie logicielle.