"""
Cache LRU pour les résultats de simulation — VirtuFit.

Évite de recalculer des simulations identiques en mettant
en cache les résultats selon une clé de hachage des paramètres.

Stratégie :
- Clé  : SHA-256 des paramètres de simulation (fabric + avatar shape)
- TTL  : 30 minutes (configurable)
- Taille max : 128 entrées (configurable)
- Thread-safe : verrou RLock par entrée
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

from app.schemas.simulation import SimulationResponse
from app.utils.logger       import get_logger

logger = get_logger(__name__)

# Configuration du cache
CACHE_TTL_SECONDS = 30 * 60    # 30 mn
CACHE_MAX_ENTRIES = 128


@dataclass
class CacheEntry:
    """Entrée du cache avec métadonnées."""
    result:     SimulationResponse
    created_at: float             = field(default_factory=time.monotonic)
    hits:       int               = 0

    @property
    def is_expired(self) -> bool:
        return (time.monotonic() - self.created_at) > CACHE_TTL_SECONDS

    @property
    def age_seconds(self) -> float:
        return time.monotonic() - self.created_at


class SimulationCache:
    """
    Cache LRU thread-safe pour les résultats de simulation.

    Les résultats sont indexés par une clé dérivée des paramètres
    de simulation (fabric, avatar shape, animation). Deux simulations
    avec les mêmes paramètres retournent le résultat en cache.
    """

    def __init__(
        self,
        max_entries: int = CACHE_MAX_ENTRIES,
        ttl_seconds: float = CACHE_TTL_SECONDS,
    ) -> None:
        self._store:       dict[str, CacheEntry] = {}
        self._lock:        threading.RLock        = threading.RLock()
        self._max_entries: int                    = max_entries
        self._ttl:         float                  = ttl_seconds
        self._hits:        int                    = 0
        self._misses:      int                    = 0
        logger.info(
            "SimulationCache initialisé — max=%d TTL=%ds",
            max_entries, int(ttl_seconds),
        )

    # Interface principale

    def get(self, cache_key: str) -> Optional[SimulationResponse]:
        """
        Récupère un résultat depuis le cache.

        Returns:
            SimulationResponse si trouvé et non expiré, None sinon.
        """
        with self._lock:
            entry = self._store.get(cache_key)

            if entry is None:
                self._misses += 1
                return None

            if entry.is_expired:
                del self._store[cache_key]
                self._misses += 1
                logger.debug("Cache MISS (expiré) — key=%s", cache_key[:12])
                return None

            entry.hits  += 1
            self._hits  += 1
            logger.debug(
                "Cache HIT — key=%s age=%.1fs hits=%d",
                cache_key[:12], entry.age_seconds, entry.hits,
            )
            return entry.result

    def set(self, cache_key: str, result: SimulationResponse) -> None:
        """
        Stocke un résultat dans le cache.
        Évince les entrées expirées ou les plus anciennes si plein.
        """
        with self._lock:
            # Nettoyage préventif des entrées expirées
            self._evict_expired()

            # Si encore plein → évince la plus ancienne
            if len(self._store) >= self._max_entries:
                self._evict_oldest()

            self._store[cache_key] = CacheEntry(result=result)
            logger.debug("Cache SET — key=%s", cache_key[:12])

    def invalidate(self, cache_key: str) -> bool:
        """Invalide une entrée spécifique."""
        with self._lock:
            if cache_key in self._store:
                del self._store[cache_key]
                return True
            return False

    def clear(self) -> int:
        """Vide entièrement le cache. Retourne le nombre d'entrées supprimées."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
            self._hits = self._misses = 0
            logger.info("Cache vidé — %d entrées supprimées", count)
            return count

    # Statistiques

    @property
    def stats(self) -> dict:
        """Retourne les statistiques du cache."""
        with self._lock:
            total    = self._hits + self._misses
            hit_rate = self._hits / total if total > 0 else 0.0
            return {
                "entries":   len(self._store),
                "max":       self._max_entries,
                "hits":      self._hits,
                "misses":    self._misses,
                "hit_rate":  round(hit_rate, 3),
                "ttl_s":     self._ttl,
            }

    # Éviction

    def _evict_expired(self) -> None:
        """Supprime toutes les entrées expirées (appelé sous lock)."""
        expired = [k for k, v in self._store.items() if v.is_expired]
        for key in expired:
            del self._store[key]
        if expired:
            logger.debug("Éviction : %d entrées expirées supprimées", len(expired))

    def _evict_oldest(self) -> None:
        """Supprime l'entrée la plus ancienne (LRU simplifié)."""
        if not self._store:
            return
        oldest_key = min(self._store, key=lambda k: self._store[k].created_at)
        del self._store[oldest_key]
        logger.debug("Éviction LRU — key=%s", oldest_key[:12])


# Utilitaire de clé de cache

def build_cache_key(params: dict) -> str:
    """
    Construit une clé de cache déterministe depuis les paramètres.

    Utilise SHA-256 sur la sérialisation JSON triée des paramètres
    pour garantir la reproductibilité.

    Args:
        params : Dictionnaire des paramètres de simulation.

    Returns:
        Clé hexadécimale de 64 caractères.
    """
    serialized = json.dumps(params, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


def build_simulation_key(
    fabric_type:      str,
    elasticity_coeff: float,
    friction_coeff:   float,
    stiffness:        float,
    smpl_betas:       list[float],
    height_cm:        float,
    weight_kg:        float,
    animation_type:   str,
) -> str:
    """
    Construit la clé de cache pour une simulation spécifique.

    Les paramètres sont arrondis pour éviter des variations
    de virgule flottante qui invalideraient le cache.
    """
    params = {
        "fabric_type":      fabric_type,
        "elasticity_coeff": round(elasticity_coeff, 3),
        "friction_coeff":   round(friction_coeff,   3),
        "stiffness":        round(stiffness,         3),
        # Arrondit les bêtas SMPL à 2 décimales
        "smpl_betas":       [round(b, 2) for b in smpl_betas],
        "height_cm":        round(height_cm, 1),
        "weight_kg":        round(weight_kg,  1),
        "animation_type":   animation_type,
    }
    return build_cache_key(params)


@lru_cache(maxsize=1)
def get_simulation_cache() -> SimulationCache:
    """Retourne le singleton SimulationCache."""
    return SimulationCache()