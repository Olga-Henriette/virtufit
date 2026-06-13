"""
Profiler de performance — VirtuFit AI Services.

Mesure et enregistre les métriques de performance des opérations
critiques : simulation, génération d'avatar, analyse textile.

Métriques collectées :
- Latence (ms) : min, max, moyenne, p50, p95, p99
- Débit (req/s)
- Utilisation mémoire
- Taux de cache
"""

from __future__ import annotations

import statistics
import threading
import time
from collections import defaultdict, deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Generator

from app.utils.logger import get_logger

logger = get_logger(__name__)

# Nombre max de mesures conservées par opération
MAX_SAMPLES = 1000


@dataclass
class OperationMetrics:
    """Métriques d'une opération spécifique."""
    name:       str
    samples:    deque = field(default_factory=lambda: deque(maxlen=MAX_SAMPLES))
    call_count: int   = 0
    error_count: int  = 0

    @property
    def p50_ms(self) -> float:
        return self._percentile(50)

    @property
    def p95_ms(self) -> float:
        return self._percentile(95)

    @property
    def p99_ms(self) -> float:
        return self._percentile(99)

    @property
    def avg_ms(self) -> float:
        if not self.samples:
            return 0.0
        return round(statistics.mean(self.samples), 2)

    @property
    def min_ms(self) -> float:
        return round(min(self.samples), 2) if self.samples else 0.0

    @property
    def max_ms(self) -> float:
        return round(max(self.samples), 2) if self.samples else 0.0

    @property
    def error_rate(self) -> float:
        if self.call_count == 0:
            return 0.0
        return round(self.error_count / self.call_count, 4)

    def record(self, duration_ms: float) -> None:
        self.samples.append(duration_ms)
        self.call_count += 1

    def record_error(self) -> None:
        self.error_count += 1
        self.call_count  += 1

    def to_dict(self) -> dict:
        return {
            "name":        self.name,
            "call_count":  self.call_count,
            "error_count": self.error_count,
            "error_rate":  self.error_rate,
            "avg_ms":      self.avg_ms,
            "min_ms":      self.min_ms,
            "max_ms":      self.max_ms,
            "p50_ms":      self.p50_ms,
            "p95_ms":      self.p95_ms,
            "p99_ms":      self.p99_ms,
            "sample_count": len(self.samples),
        }

    def _percentile(self, p: int) -> float:
        if not self.samples:
            return 0.0
        sorted_s = sorted(self.samples)
        idx      = int(len(sorted_s) * p / 100)
        idx      = min(idx, len(sorted_s) - 1)
        return round(sorted_s[idx], 2)


class PerformanceProfiler:
    """
    Profiler de performance thread-safe.

    Enregistre les métriques de latence pour chaque opération
    et expose un rapport de synthèse.
    """

    def __init__(self) -> None:
        self._metrics: dict[str, OperationMetrics] = defaultdict(
            lambda: OperationMetrics(name="unknown")
        )
        self._lock  = threading.Lock()
        self._start = time.monotonic()
        logger.info("PerformanceProfiler initialisé.")

    # Context manager

    @contextmanager
    def measure(
        self,
        operation: str,
        log_slow_ms: float = 500.0,
    ) -> Generator[None, None, None]:
        """
        Context manager pour mesurer la durée d'une opération.

        Args:
            operation    : Nom de l'opération mesurée.
            log_slow_ms  : Seuil en ms pour logguer les opérations lentes.

        Usage:
            with profiler.measure("simulation"):
                result = engine.simulate(...)
        """
        t0 = time.perf_counter()
        try:
            yield
            duration_ms = (time.perf_counter() - t0) * 1000
            self._record(operation, duration_ms)

            if duration_ms > log_slow_ms:
                logger.warning(
                    " Opération lente : %s — %.1f ms (seuil: %.0f ms)",
                    operation, duration_ms, log_slow_ms,
                )

        except Exception:
            with self._lock:
                metrics = self._get_or_create(operation)
                metrics.record_error()
            raise

    # API publique

    def record(self, operation: str, duration_ms: float) -> None:
        """Enregistre manuellement une durée."""
        self._record(operation, duration_ms)

    def get_metrics(self, operation: str) -> dict:
        """Retourne les métriques d'une opération spécifique."""
        with self._lock:
            m = self._metrics.get(operation)
            return m.to_dict() if m else {}

    def get_all_metrics(self) -> dict:
        """Retourne toutes les métriques sous forme de rapport."""
        with self._lock:
            uptime_s = time.monotonic() - self._start
            return {
                "uptime_seconds": round(uptime_s, 1),
                "operations":     {
                    name: m.to_dict()
                    for name, m in self._metrics.items()
                },
            }

    def reset(self) -> None:
        """Réinitialise toutes les métriques."""
        with self._lock:
            self._metrics.clear()
            self._start = time.monotonic()
        logger.info("Métriques de performance réinitialisées.")

    # Interne

    def _record(self, operation: str, duration_ms: float) -> None:
        with self._lock:
            metrics = self._get_or_create(operation)
            metrics.record(duration_ms)

    def _get_or_create(self, operation: str) -> OperationMetrics:
        if operation not in self._metrics:
            self._metrics[operation] = OperationMetrics(name=operation)
        return self._metrics[operation]


@lru_cache(maxsize=1)
def get_profiler() -> PerformanceProfiler:
    """Retourne le singleton PerformanceProfiler."""
    return PerformanceProfiler()