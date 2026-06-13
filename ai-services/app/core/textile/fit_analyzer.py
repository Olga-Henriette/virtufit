"""
Moteur d'analyse d'ajustement VirtuFit.

Transforme les résultats bruts de simulation Mass-Spring en
rapport d'ajustement détaillé avec recommandations personnalisées.

Architecture :
    FitAnalyzer
    ├── analyze()                → point d'entrée principal
    ├── _analyze_zones()         → analyse par zone anatomique
    ├── _compute_fit_delta()     → différence vêtement/corps en cm
    ├── _compute_scores()        → scores global, confort, mobilité
    ├── _classify_fit()          → catégorie d'ajustement
    ├── _compare_sizes()         → suggestion de taille
    ├── _build_recommendations() → conseils personnalisés
    └── _build_style_tips()      → conseils de style
"""

from functools import lru_cache

from app.schemas.avatar       import MeasurementsInput
from app.schemas.fit_analysis import (
    AnatomicZone,
    DetailedFitAnalysis,
    FitCategory,
    SizeComparison,
    TensionLevel,
    ZoneAnalysis,
)
from app.schemas.simulation   import SimulationResponse, TensionZone
from app.utils.logger         import get_logger

logger = get_logger(__name__)

# Tailles standards
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]

# Seuils de tension par niveau
TENSION_THRESHOLDS = {
    TensionLevel.NONE:     (0.00, 0.10),
    TensionLevel.LOW:      (0.10, 0.30),
    TensionLevel.MEDIUM:   (0.30, 0.55),
    TensionLevel.HIGH:     (0.55, 0.80),
    TensionLevel.CRITICAL: (0.80, 1.00),
}

# Impact sur la mobilité par zone
MOBILITY_WEIGHTS: dict[AnatomicZone, float] = {
    AnatomicZone.SHOULDERS: 0.25,
    AnatomicZone.CHEST:     0.15,
    AnatomicZone.WAIST:     0.20,
    AnatomicZone.HIPS:      0.20,
    AnatomicZone.BACK:      0.10,
    AnatomicZone.ARMS:      0.05,
    AnatomicZone.NECK:      0.05,
}


class FitAnalyzer:
    """
    Analyse détaillée de l'ajustement d'un vêtement sur un avatar.
    """

    def __init__(self) -> None:
        logger.info("FitAnalyzer initialisé.")

    # Point d'entrée principal

    def analyze(
        self,
        sim_result:   SimulationResponse,
        user_id:      str,
        clothing_id:  str,
        measurements: MeasurementsInput,
        fabric_type:  str,
        category:     str,
        current_size: str,
        animation_type: str,
    ) -> DetailedFitAnalysis:
        """
        Produit un rapport d'ajustement complet.

        Args:
            sim_result:     Résultat de simulation Mass-Spring.
            user_id:        UUID de l'utilisateur.
            clothing_id:    UUID du vêtement.
            measurements:   Mensurations de l'utilisateur.
            fabric_type:    Type de tissu.
            category:       Catégorie du vêtement.
            current_size:   Taille essayée.
            animation_type: Animation utilisée.

        Returns:
            DetailedFitAnalysis avec tous les scores et recommandations.
        """
        logger.info(
            "Analyse ajustement — session=%s fabric=%s size=%s",
            sim_result.session_id, fabric_type, current_size,
        )

        # Analyse par zone anatomique
        zone_analyses = self._analyze_zones(
            sim_result.fit_analysis.tension_zones,
            measurements,
        )

        # Calcul des scores
        overall, comfort, mobility = self._compute_scores(zone_analyses)

        # Classification
        fit_category = self._classify_fit(overall)

        # Comparaison de tailles
        size_comparison = self._compare_sizes(
            current_size=current_size,
            overall_score=overall,
            zone_analyses=zone_analyses,
            category=category,
        )

        # Recommandations
        recommendations = self._build_recommendations(
            fit_category=fit_category,
            zone_analyses=zone_analyses,
            size_comparison=size_comparison,
            fabric_type=fabric_type,
        )

        # Conseils de style
        style_tips = self._build_style_tips(
            fit_category=fit_category,
            category=category,
            fabric_type=fabric_type,
            measurements=measurements,
        )

        # Résumé
        summary = self._build_summary(fit_category, size_comparison)

        return DetailedFitAnalysis(
            session_id=sim_result.session_id,
            user_id=user_id,
            clothing_id=clothing_id,
            overall_score=round(overall, 2),
            fit_category=fit_category,
            comfort_score=round(comfort, 2),
            mobility_score=round(mobility, 2),
            zone_analyses=zone_analyses,
            size_comparison=size_comparison,
            summary=summary,
            recommendations=recommendations,
            style_tips=style_tips,
            simulation_ms=sim_result.simulation_ms,
            fabric_type=fabric_type,
            animation_type=animation_type,
        )

    # Analyse par zone

    def _analyze_zones(
        self,
        tension_zones: list[TensionZone],
        measurements:  MeasurementsInput,
    ) -> list[ZoneAnalysis]:
        """
        Convertit les zones de tension brutes en analyses détaillées.
        """
        # Mapping nom → AnatomicZone
        zone_mapping = {
            "shoulders": AnatomicZone.SHOULDERS,
            "chest":     AnatomicZone.CHEST,
            "waist":     AnatomicZone.WAIST,
            "hips":      AnatomicZone.HIPS,
            "back":      AnatomicZone.BACK,
            "arms":      AnatomicZone.ARMS,
            "neck":      AnatomicZone.NECK,
        }

        analyses: list[ZoneAnalysis] = []

        for zone in tension_zones:
            anatomic = zone_mapping.get(zone.zone_name, AnatomicZone.CHEST)
            level    = self._classify_tension(zone.tension_value)
            delta    = self._compute_fit_delta(anatomic, zone.tension_value, measurements)
            rec      = self._zone_recommendation(anatomic, level, delta)

            analyses.append(ZoneAnalysis(
                zone=anatomic,
                tension_value=zone.tension_value,
                tension_level=level,
                fit_delta_cm=round(delta, 1),
                is_constraining=(level in (TensionLevel.HIGH, TensionLevel.CRITICAL)),
                recommendation=rec,
            ))

        return analyses

    # Calcul des scores

    def _compute_scores(
        self,
        zones: list[ZoneAnalysis],
    ) -> tuple[float, float, float]:
        """
        Calcule les trois scores : global, confort, mobilité.

        Returns:
            (overall, comfort, mobility) tous sur [0, 100].
        """
        if not zones:
            return 75.0, 75.0, 75.0

        level_weights = {
            TensionLevel.NONE:     1.00,
            TensionLevel.LOW:      0.90,
            TensionLevel.MEDIUM:   0.65,
            TensionLevel.HIGH:     0.30,
            TensionLevel.CRITICAL: 0.05,
        }

        # Score global : moyenne pondérée des niveaux
        total_weight   = sum(level_weights.get(z.tension_level, 0.5) for z in zones)
        overall        = (total_weight / len(zones)) * 100

        # Score confort : pénalise les zones contraignantes
        constraining   = sum(1 for z in zones if z.is_constraining)
        comfort        = overall * (1 - constraining * 0.12)

        # Score mobilité : pondéré par l'importance anatomique
        mobility_sum   = 0.0
        weight_sum     = 0.0
        for z in zones:
            w           = MOBILITY_WEIGHTS.get(z.zone, 0.1)
            mob_val     = level_weights.get(z.tension_level, 0.5)
            mobility_sum += mob_val * w
            weight_sum   += w

        mobility = (mobility_sum / max(weight_sum, 0.01)) * 100

        return (
            max(0.0, min(100.0, overall)),
            max(0.0, min(100.0, comfort)),
            max(0.0, min(100.0, mobility)),
        )

    # Classification

    @staticmethod
    def _classify_fit(score: float) -> FitCategory:
        if score >= 90:
            return FitCategory.PERFECT
        if score >= 75:
            return FitCategory.GOOD
        if score >= 55:
            return FitCategory.ACCEPTABLE
        if score >= 35:
            return FitCategory.TIGHT
        return FitCategory.LOOSE

    @staticmethod
    def _classify_tension(value: float) -> TensionLevel:
        for level, (lo, hi) in TENSION_THRESHOLDS.items():
            if lo <= value < hi:
                return level
        return TensionLevel.CRITICAL

    # Delta de taille

    @staticmethod
    def _compute_fit_delta(
        zone:         AnatomicZone,
        tension_val:  float,
        measurements: MeasurementsInput,
    ) -> float:
        """
        Estime la différence en cm entre le vêtement et le corps.
        Positif → vêtement trop large. Négatif → vêtement trop serré.
        """
        # Référence corporelle par zone
        body_ref: dict[AnatomicZone, float] = {
            AnatomicZone.CHEST:     measurements.chest_cm,
            AnatomicZone.WAIST:     measurements.waist_cm,
            AnatomicZone.HIPS:      measurements.hips_cm,
            AnatomicZone.SHOULDERS: measurements.shoulder_width_cm * 2,
            AnatomicZone.NECK:      measurements.neck_cm or 37.0,
            AnatomicZone.ARMS:      measurements.arm_length_cm or 62.0,
            AnatomicZone.BACK:      measurements.shoulder_width_cm * 2,
        }

        ref  = body_ref.get(zone, 90.0)
        # Tension élevée → vêtement trop serré (delta négatif)
        # Tension faible → vêtement trop grand (delta positif)
        delta = (0.5 - tension_val) * ref * 0.15
        return delta

    # Comparaison de tailles

    def _compare_sizes(
        self,
        current_size:  str,
        overall_score: float,
        zone_analyses: list[ZoneAnalysis],
        category:      str,
    ) -> SizeComparison:
        """Suggère une taille alternative si nécessaire."""
        try:
            current_idx = SIZE_ORDER.index(current_size.upper())
        except ValueError:
            current_idx = SIZE_ORDER.index("M")

        # Détermine si on doit monter ou descendre
        high_zones = [z for z in zone_analyses if z.tension_level == TensionLevel.HIGH]
        low_zones  = [z for z in zone_analyses if z.tension_level == TensionLevel.NONE]

        suggested: str | None = None
        confidence = 0.70

        if overall_score < 55 and high_zones:
            # Trop serré → taille supérieure
            if current_idx < len(SIZE_ORDER) - 1:
                suggested = SIZE_ORDER[current_idx + 1]
                confidence = 0.85
        elif overall_score >= 90 and len(low_zones) > len(zone_analyses) // 2:
            # Très ample → taille inférieure
            if current_idx > 0:
                suggested = SIZE_ORDER[current_idx - 1]
                confidence = 0.75

        size_down = SIZE_ORDER[current_idx - 1] if current_idx > 0 else None
        size_up   = SIZE_ORDER[current_idx + 1] if current_idx < len(SIZE_ORDER) - 1 else None

        return SizeComparison(
            current_size=current_size,
            suggested_size=suggested,
            size_down=size_down,
            size_up=size_up,
            confidence=confidence,
        )

    # Recommandations

    @staticmethod
    def _build_recommendations(
        fit_category:    FitCategory,
        zone_analyses:   list[ZoneAnalysis],
        size_comparison: SizeComparison,
        fabric_type:     str,
    ) -> list[str]:
        """Génère des recommandations contextuelles."""
        recs: list[str] = []

        # Recommandation principale
        messages = {
            FitCategory.PERFECT:    "Cet article correspond parfaitement à votre morphologie.",
            FitCategory.GOOD:       "L'ajustement est très satisfaisant pour votre silhouette.",
            FitCategory.ACCEPTABLE: "L'ajustement est correct avec quelques légères tensions.",
            FitCategory.TIGHT:      "Ce vêtement est serré sur votre morphologie.",
            FitCategory.LOOSE:      "Ce vêtement est ample sur votre silhouette.",
        }
        recs.append(messages[fit_category])

        # Suggestion de taille
        if size_comparison.suggested_size:
            recs.append(
                f"Nous recommandons la taille {size_comparison.suggested_size} "
                f"pour un meilleur confort "
                f"(confiance : {int(size_comparison.confidence * 100)}%)."
            )

        # Zones critiques
        critical = [z for z in zone_analyses if z.tension_level == TensionLevel.CRITICAL]
        if critical:
            zones_str = ", ".join(z.zone.value for z in critical)
            recs.append(
                f"Zones critiques détectées : {zones_str}. "
                f"Ces zones peuvent limiter vos mouvements."
            )

        # Conseils tissu
        fabric_tips = {
            "denim":     "Le denim se détend naturellement après quelques ports.",
            "wool":      "La laine peut légèrement se distendre à l'usage.",
            "silk":      "La soie épouse parfaitement la silhouette avec le temps.",
            "polyester": "Ce tissu synthétique conserve sa forme durablement.",
            "cotton":    "Le coton offre un excellent compromis confort/durabilité.",
            "linen":     "Le lin se froisse et se détend à l'usage — prévoir une taille.",
        }
        if fabric_type in fabric_tips:
            recs.append(fabric_tips[fabric_type])

        return recs

    @staticmethod
    def _zone_recommendation(
        zone:  AnatomicZone,
        level: TensionLevel,
        delta: float,
    ) -> str | None:
        """Génère une recommandation spécifique à une zone."""
        if level in (TensionLevel.NONE, TensionLevel.LOW):
            return None

        zone_tips = {
            AnatomicZone.SHOULDERS: "Les épaules sont contraintes — envisagez un modèle raglan.",
            AnatomicZone.CHEST:     "La poitrine est serrée — préférez une coupe droite.",
            AnatomicZone.WAIST:     "La taille est marquée — optez pour une coupe fluide.",
            AnatomicZone.HIPS:      "Les hanches sont à l'étroit — préférez une coupe A.",
            AnatomicZone.BACK:      "Le dos est contraint — vérifiez l'amplitude de mouvement.",
            AnatomicZone.ARMS:      "Les manches sont serrées — préférez une coupe ample.",
            AnatomicZone.NECK:      "L'encolure est serrée — envisagez un col V ou évasé.",
        }

        if level == TensionLevel.CRITICAL:
            return f"{zone_tips.get(zone, 'Zone très contrainte.')} (critique)"
        return zone_tips.get(zone)

    # Conseils de style

    @staticmethod
    def _build_style_tips(
        fit_category: FitCategory,
        category:     str,
        fabric_type:  str,
        measurements: MeasurementsInput,
    ) -> list[str]:
        """Génère des conseils de style contextuels."""
        tips: list[str] = []

        # Conseils selon la catégorie du vêtement
        category_tips = {
            "top":       "Associez ce haut avec un bas de coupe droite pour équilibrer la silhouette.",
            "bottom":    "Ce bas se porte idéalement avec une chemise rentrée pour mettre la taille en valeur.",
            "dress":     "Cette robe peut être ceinturée pour souligner la taille.",
            "outerwear": "Portez ce vêtement ouvert sur un pull fin pour plus de liberté de mouvement.",
        }
        if category in category_tips:
            tips.append(category_tips[category])

        # Conseils selon l'ajustement
        if fit_category in (FitCategory.PERFECT, FitCategory.GOOD):
            tips.append("L'ajustement optimal permet de le porter tel quel ou avec des accessoires.")
        elif fit_category == FitCategory.TIGHT:
            tips.append(
                "Portez des sous-vêtements lisses sans relief pour minimiser les lignes visibles."
            )
        elif fit_category == FitCategory.LOOSE:
            tips.append("Une ceinture ou un nœud peut restructurer la silhouette.")

        # Conseil tissu/entretien
        care_tips = {
            "silk":   "Lavage délicat à la main ou pressing recommandé.",
            "wool":   "Lavage à 30°C ou à sec, séchage à plat.",
            "linen":  "Repassage légèrement humide pour un rendu net.",
            "denim":  "Lavage à 40°C, séchage à l'air libre pour préserver la couleur.",
            "cotton": "Lavage à 40°C, peut rétrécir au premier lavage.",
        }
        if fabric_type in care_tips:
            tips.append(care_tips[fabric_type])

        return tips

    @staticmethod
    def _build_summary(
        fit_category:    FitCategory,
        size_comparison: SizeComparison,
    ) -> str:
        """Construit un résumé d'une phrase."""
        summaries = {
            FitCategory.PERFECT:    "Ajustement parfait — ce vêtement est fait pour vous.",
            FitCategory.GOOD:       "Très bon ajustement — peu de retouches nécessaires.",
            FitCategory.ACCEPTABLE: "Ajustement correct — quelques zones méritent attention.",
            FitCategory.TIGHT:      "Vêtement serré — une taille supérieure est recommandée.",
            FitCategory.LOOSE:      "Vêtement ample — une taille inférieure pourrait mieux convenir.",
        }
        base = summaries[fit_category]
        if size_comparison.suggested_size:
            base += f" (suggestion : taille {size_comparison.suggested_size})"
        return base


@lru_cache(maxsize=1)
def get_fit_analyzer() -> FitAnalyzer:
    """Retourne l'instance singleton du FitAnalyzer."""
    return FitAnalyzer()