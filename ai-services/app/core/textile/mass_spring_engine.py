"""
Moteur de simulation textile Mass-Spring VirtuFit.

Implémentation d'un système masse-ressort (MSS) pour simuler
le comportement physique des vêtements sur un avatar 3D.

Références :
- Provot (1995) — Deformation Constraints in a Mass-Spring Model
- Baraff & Witkin (1998) — Large Steps in Cloth Simulation
- Choi & Ko (2002) — Stable but Responsive Cloth

Architecture :
    MassSpringEngine
    ├── _build_mesh()          → génère le maillage du vêtement
    ├── _apply_gravity()       → force gravitationnelle
    ├── _apply_spring_forces() → forces de ressorts struct./cisaillement
    ├── _apply_friction()      → friction avec l'avatar
    ├── _integrate()           → intégration Euler semi-implicite
    └── _detect_collisions()   → contraintes de collision AABB
"""

import time
from dataclasses import dataclass, field

import numpy as np

from app.schemas.simulation import (
    AnimationType,
    AvatarSimData,
    ClothingSimData,
    FitAnalysis,
    SimulationFrame,
    SimulationResponse,
    TensionZone,
)
from app.utils.logger import get_logger
from app.core.textile.collision_engine import (
    build_avatar_proxy,
    get_collision_engine,
)

logger = get_logger(__name__)

# Constantes physiques
GRAVITY       = np.array([0.0, -9.81, 0.0])   # m/s²
TIME_STEP     = 0.016                           # 60 FPS → 16 ms
SOLVER_ITERS  = 8                               # itérations du solveur
REST_LENGTH   = 0.05                            # longueur repos ressort (m)


@dataclass
class Particle:
    """Particule du système masse-ressort."""
    position:  np.ndarray
    velocity:  np.ndarray = field(default_factory=lambda: np.zeros(3))
    force:     np.ndarray = field(default_factory=lambda: np.zeros(3))
    mass:      float      = 0.01      # kg
    pinned:    bool       = False     # particule fixée (ex: épaules)


@dataclass
class Spring:
    """Ressort reliant deux particules."""
    p1_idx:      int
    p2_idx:      int
    rest_length: float
    stiffness:   float
    spring_type: str    # "structural" | "shear" | "bend"


class MassSpringEngine:
    """
    Moteur de simulation textile par système masse-ressort.

    Le maillage du vêtement est représenté par une grille de particules
    liées par trois types de ressorts :
    - Structurels (horizontal/vertical) : résistance à l'étirement
    - Cisaillement (diagonaux) : résistance à la torsion
    - Flexion (saut d'une maille) : résistance au pliage
    """

    # Dimensions de la grille de simulation
    GRID_ROWS = 16
    GRID_COLS = 12

    def __init__(self) -> None:
        logger.info("MassSpringEngine initialisé.")

    # Point d'entrée public

    def simulate(
        self,
        avatar:   AvatarSimData,
        clothing: ClothingSimData,
        animation: AnimationType,
        session_id: str,
    ) -> SimulationResponse:
        """
        Lance une simulation complète d'essayage avec collision.
        """
        start_ms = time.perf_counter()
        logger.info(
            "Simulation — session=%s fabric=%s animation=%s",
            session_id,
            clothing.fabric.fabric_type,
            animation,
        )

        # Construction du maillage
        particles, springs = self._build_mesh(avatar, clothing)

        # Construction du proxy avatar
        avatar_proxy    = build_avatar_proxy(avatar)
        collision_engine = get_collision_engine()
        total_collisions = 0

        # Nombre de frames selon l'animation
        frame_counts = {
            AnimationType.STANDING: 10,
            AnimationType.ROTATING: 20,
            AnimationType.WALKING:  30,
        }
        n_frames = frame_counts.get(animation, 10)

        # Simulation frame par frame avec sous-échantillonnage pour éviter l'explosion numérique
        frames: list[SimulationFrame] = []
        sub_steps = 4  # Divise le pas de temps par 4 pour stabiliser le solveur
        dt_sub = TIME_STEP / sub_steps

        for frame_idx in range(n_frames):
            # Boucle interne de sous-échantillonnage (sub-stepping)
            for _ in range(sub_steps):
                # Pas physique avec le pas réduit
                self._step(particles, springs, clothing, dt_sub)

            # Résolution des collisions tissu ↔ avatar
            resolved = collision_engine.resolve_cloth_avatar(
                particles=particles,
                avatar_proxy=avatar_proxy,
                friction=clothing.fabric.friction_coeff,
                iterations=SOLVER_ITERS // 2,
            )
            total_collisions += resolved

            # Auto-collisions (passe allégée)
            if frame_idx % 3 == 0:
                collision_engine.detect_self_collision(particles)

            frames.append(self._capture_frame(particles, frame_idx))

        logger.debug(
            "Collisions résolues — total=%d frames=%d",
            total_collisions, n_frames,
        )

        # Analyse d'ajustement
        fit_analysis = self._analyze_fit(particles, avatar, clothing)

        elapsed_ms = (time.perf_counter() - start_ms) * 1000
        logger.info(
            "Simulation terminée — %.1f ms | frames=%d | fit=%.1f | collisions=%d",
            elapsed_ms, n_frames, fit_analysis.fit_score, total_collisions,
        )

        return SimulationResponse(
            session_id=session_id,
            status="completed",
            frames=frames,
            fit_analysis=fit_analysis,
            simulation_ms=round(elapsed_ms, 2),
            frame_count=n_frames,
        )

    # Construction du maillage

    def _build_mesh(
        self,
        avatar:   AvatarSimData,
        clothing: ClothingSimData,
    ) -> tuple[list[Particle], list[Spring]]:
        """
        Génère un maillage grille adapté aux mensurations de l'avatar.

        La grille est mise à l'échelle selon la taille de l'avatar
        pour représenter le vêtement correctement.
        """
        # Facteur d'échelle basé sur la taille
        scale = avatar.height_cm / 170.0

        rows, cols = self.GRID_ROWS, self.GRID_COLS
        particles: list[Particle] = []

        for r in range(rows):
            for c in range(cols):
                x = (c - cols / 2) * REST_LENGTH * scale
                y = (rows - r - 1) * REST_LENGTH * scale
                z = 0.0

                # Épingle les particules du bord supérieur
                # (simule l'accroche du vêtement sur les épaules)
                pinned = (r == 0)

                particles.append(Particle(
                    position=np.array([x, y, z]),
                    mass=clothing.fabric.weight_per_sqm * (REST_LENGTH ** 2) / 1000,
                    pinned=pinned,
                ))

        springs = self._build_springs(
            particles, rows, cols,
            clothing.fabric.stiffness,
            clothing.fabric.elasticity_coeff,
        )

        return particles, springs

    @staticmethod
    def _build_springs(
        particles:   list[Particle],
        rows:        int,
        cols:        int,
        stiffness:   float,
        elasticity:  float,
    ) -> list[Spring]:
        """Génère les ressorts structurels, de cisaillement et de flexion."""
        springs: list[Spring] = []
        k_struct = stiffness * 800.0      # rigidité structurelle
        k_shear  = elasticity * 400.0     # rigidité cisaillement
        k_bend   = stiffness * 200.0      # rigidité flexion

        def idx(r: int, c: int) -> int:
            return r * cols + c

        for r in range(rows):
            for c in range(cols):
                # Structurels horizontaux
                if c + 1 < cols:
                    springs.append(Spring(
                        p1_idx=idx(r, c), p2_idx=idx(r, c + 1),
                        rest_length=REST_LENGTH,
                        stiffness=k_struct,
                        spring_type="structural",
                    ))
                # Structurels verticaux
                if r + 1 < rows:
                    springs.append(Spring(
                        p1_idx=idx(r, c), p2_idx=idx(r + 1, c),
                        rest_length=REST_LENGTH,
                        stiffness=k_struct,
                        spring_type="structural",
                    ))
                # Cisaillement
                if r + 1 < rows and c + 1 < cols:
                    springs.append(Spring(
                        p1_idx=idx(r, c), p2_idx=idx(r + 1, c + 1),
                        rest_length=REST_LENGTH * 1.414,
                        stiffness=k_shear,
                        spring_type="shear",
                    ))
                    springs.append(Spring(
                        p1_idx=idx(r + 1, c), p2_idx=idx(r, c + 1),
                        rest_length=REST_LENGTH * 1.414,
                        stiffness=k_shear,
                        spring_type="shear",
                    ))
                # Flexion horizontale
                if c + 2 < cols:
                    springs.append(Spring(
                        p1_idx=idx(r, c), p2_idx=idx(r, c + 2),
                        rest_length=REST_LENGTH * 2,
                        stiffness=k_bend,
                        spring_type="bend",
                    ))
                # Flexion verticale
                if r + 2 < rows:
                    springs.append(Spring(
                        p1_idx=idx(r, c), p2_idx=idx(r + 2, c),
                        rest_length=REST_LENGTH * 2,
                        stiffness=k_bend,
                        spring_type="bend",
                    ))

        return springs

    # Pas de simulation

    def _step(
        self,
        particles: list[Particle],
        springs:   list[Spring],
        clothing:  ClothingSimData,
        dt:        float,
    ) -> None:
        """Effectue un pas de simulation Euler semi-implicite."""
        # Reset des forces
        for p in particles:
            p.force = np.zeros(3)

        # Gravité
        self._apply_gravity(particles)

        # Forces de ressorts
        self._apply_spring_forces(particles, springs)

        # Friction textile
        self._apply_friction(particles, clothing.fabric.friction_coeff)

        # Intégration
        self._integrate(particles, dt, clothing.fabric.damping)

        # Contraintes de collision
        self._detect_collisions(particles)

    def _apply_gravity(self, particles: list[Particle]) -> None:
        """Applique la force gravitationnelle à chaque particule libre."""
        for p in particles:
            if not p.pinned:
                p.force += GRAVITY * p.mass

    def _apply_spring_forces(
        self,
        particles: list[Particle],
        springs:   list[Spring],
    ) -> None:
        """Calcule et applique les forces de Hooke pour chaque ressort."""
        for spring in springs:
            p1 = particles[spring.p1_idx]
            p2 = particles[spring.p2_idx]

            delta     = p2.position - p1.position
            length    = float(np.linalg.norm(delta))

            # Sécurité accrue : si la longueur est nulle ou devient anormale (NaN/Inf)
            if length < 1e-6 or np.isnan(length) or np.isinf(length):
                continue

            # Force de Hooke : F = k * (length - rest_length) * direction
            direction  = delta / length
            extension  = length - spring.rest_length

            # Limiter l'extension max pour éviter que le ressort n'agisse comme une fronde
            extension  = np.clip(extension, -spring.rest_length * 0.5, spring.rest_length * 0.5)

            force_mag  = spring.stiffness * extension
            force      = force_mag * direction

            if not p1.pinned:
                p1.force += force
            if not p2.pinned:
                p2.force -= force

    @staticmethod
    def _apply_friction(
        particles:    list[Particle],
        friction_coeff: float,
    ) -> None:
        """Applique une force de friction opposée à la vitesse."""
        for p in particles:
            if not p.pinned:
                speed = float(np.linalg.norm(p.velocity))
                if speed > 1e-6:
                    p.force -= friction_coeff * p.velocity

    @staticmethod
    def _integrate(
        particles: list[Particle],
        dt:        float,
        damping:   float,
    ) -> None:
        """Intégration Euler semi-implicite avec amortissementet limitation de vitesse."""
        MAX_VELOCITY = 15.0  # Vitesse max de sécurité en m/s pour éviter l'overflow
        for p in particles:
            if p.pinned:
                continue
            # Mise à jour de la vitesse
            p.velocity += (p.force / p.mass) * dt
            p.velocity *= (1.0 - damping)       # amortissement global
            
            # Garde-fou anti-explosion : limitation de la vitesse
            speed = float(np.linalg.norm(p.velocity))
            if speed > MAX_VELOCITY:
                p.velocity = (p.velocity / speed) * MAX_VELOCITY

            # Mise à jour de la position
            p.position += p.velocity * dt

    @staticmethod
    def _detect_collisions(particles: list[Particle]) -> None:
        """
        Contrainte de collision AABB simplifiée.
        Empêche les particules de passer sous le sol (y < 0).
        """
        for p in particles:
            if p.position[1] < 0.0:
                p.position[1] = 0.0
                p.velocity[1] = max(0.0, p.velocity[1])

    # Capture de frame

    @staticmethod
    def _capture_frame(
        particles:    list[Particle],
        frame_number: int,
    ) -> SimulationFrame:
        """Enregistre l'état courant des particules en une frame."""
        # Déplacements par rapport à la position initiale
        deltas = []
        for p in particles:
            deltas.extend(p.velocity.tolist())

        # Énergie cinétique totale
        energy = sum(
            0.5 * p.mass * float(np.dot(p.velocity, p.velocity))
            for p in particles
            if not p.pinned
        )

        return SimulationFrame(
            frame_number=frame_number,
            vertex_deltas=deltas,
            energy=round(energy, 6),
        )

    # Analyse d'ajustement

    def _analyze_fit(
        self,
        particles: list[Particle],
        avatar:    AvatarSimData,
        clothing:  ClothingSimData,
    ) -> FitAnalysis:
        """
        Analyse le résultat de la simulation pour produire
        un rapport d'ajustement détaillé.
        """
        tensions = self._compute_tension_zones(particles, avatar)
        score    = self._compute_fit_score(tensions)
        overall  = self._classify_fit(score)
        recs     = self._generate_recommendations(tensions, overall, clothing)
        size_sug = self._suggest_size(score, clothing.category)

        return FitAnalysis(
            overall_fit=overall,
            fit_score=round(score, 2),
            tension_zones=tensions,
            recommendations=recs,
            size_suggestion=size_sug,
        )

    @staticmethod
    def _compute_tension_zones(
        particles: list[Particle],
        avatar:    AvatarSimData,
    ) -> list[TensionZone]:
        """
        Calcule les tensions dans les zones anatomiques clés.

        Stratégie : divise la grille en zones verticales et
        mesure l'énergie moyenne de chaque zone.
        """
        rows, cols = MassSpringEngine.GRID_ROWS, MassSpringEngine.GRID_COLS
        n          = len(particles)
        zone_size  = n // 4

        zone_defs = [
            ("shoulders", 0,          zone_size),
            ("chest",     zone_size,  zone_size * 2),
            ("waist",     zone_size * 2, zone_size * 3),
            ("hips",      zone_size * 3, n),
        ]

        tensions: list[TensionZone] = []

        for zone_name, start, end in zone_defs:
            zone_particles = particles[start:end]
            if not zone_particles:
                continue

            speeds = [
                float(np.linalg.norm(p.velocity))
                for p in zone_particles
                if not p.pinned
            ]
            avg_speed = float(np.mean(speeds)) if speeds else 0.0

            # Normalise sur [0, 1]
            tension_val = min(1.0, avg_speed / 0.5)

            if tension_val < 0.3:
                level = "low"
                rec   = None
            elif tension_val < 0.65:
                level = "medium"
                rec   = f"Légère tension détectée sur {zone_name}."
            else:
                level = "high"
                rec   = f"Forte tension sur {zone_name} — taille supérieure recommandée."

            tensions.append(TensionZone(
                zone_name=zone_name,
                tension_level=level,
                tension_value=round(tension_val, 3),
                recommendation=rec,
            ))

        return tensions

    @staticmethod
    def _compute_fit_score(tensions: list[TensionZone]) -> float:
        """Calcule un score global d'ajustement (0 → 100)."""
        if not tensions:
            return 75.0

        weights = {"low": 1.0, "medium": 0.6, "high": 0.2}
        weighted_sum = sum(weights.get(t.tension_level, 0.5) for t in tensions)
        return round((weighted_sum / len(tensions)) * 100, 2)

    @staticmethod
    def _classify_fit(score: float) -> str:
        """Classifie l'ajustement global."""
        if score >= 75:
            return "good"
        if score >= 45:
            return "tight"
        return "loose"

    @staticmethod
    def _generate_recommendations(
        tensions: list[TensionZone],
        overall:  str,
        clothing: ClothingSimData,
    ) -> list[str]:
        """Génère des recommandations textuelles."""
        recs: list[str] = []

        if overall == "good":
            recs.append("L'ajustement est excellent pour votre morphologie.")
        elif overall == "tight":
            recs.append("Le vêtement est légèrement serré.")
            recs.append("Envisagez une taille supérieure pour plus de confort.")
        else:
            recs.append("Le vêtement est ample sur votre silhouette.")
            recs.append("Une taille inférieure pourrait mieux convenir.")

        high_zones = [t.zone_name for t in tensions if t.tension_level == "high"]
        if high_zones:
            recs.append(
                f"Zones de tension élevée : {', '.join(high_zones)}."
            )

        if clothing.fabric.stiffness > 0.6:
            recs.append(
                "Ce tissu rigide nécessite un rodage — il se détendra à l'usage."
            )

        return recs

    @staticmethod
    def _suggest_size(score: float, category: str) -> str | None:
        """Suggère une taille si l'ajustement n'est pas optimal."""
        if score >= 75:
            return None
        if score >= 45:
            return "L"
        return "XL" if category in ("top", "outerwear") else "XL"