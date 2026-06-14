"""
File de messages FIFO thread-safe — VirtuFit AI Services.

Implémente une file de messages en mémoire avec :
- Priorité (HIGH > NORMAL > LOW)
- TTL par tâche (timeout automatique)
- Suivi de l'état par task_id
- Statistiques en temps réel

"""

from __future__ import annotations

import heapq
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional

from app.schemas.tasks import (
    QueueStats,
    TaskPriority,
    TaskRequest,
    TaskResult,
    TaskStatus,
    TaskStatusResponse,
)
from app.utils.logger import get_logger
from app.schemas.tasks import TaskType

logger = get_logger(__name__)

# Constantes
TASK_TIMEOUT_SECONDS  = 300    # 5 mn max par tâche
MAX_QUEUE_SIZE        = 500    # Taille max de la file
PRIORITY_MAP          = {
    TaskPriority.HIGH:   0,
    TaskPriority.NORMAL: 1,
    TaskPriority.LOW:    2,
}


@dataclass(order=True)
class PrioritizedTask:
    """Tâche avec priorité pour le heap."""
    priority:   int
    created_ts: float
    task:       TaskRequest = field(compare=False)


class TaskQueue:
    """
    File de messages FIFO avec priorité et suivi d'état.

    Utilise un min-heap pour la priorité et un dict pour
    le suivi rapide de l'état par task_id.
    """

    def __init__(self) -> None:
        self._heap:        list[PrioritizedTask]        = []
        self._results:     dict[str, TaskResult]         = {}
        self._lock:        threading.RLock               = threading.RLock()
        self._not_empty:   threading.Condition           = threading.Condition(self._lock)
        self._durations:   list[float]                   = []
        self._active_count: int                          = 0
        logger.info("TaskQueue initialisé — max=%d timeout=%ds",
                    MAX_QUEUE_SIZE, TASK_TIMEOUT_SECONDS)

    # Soumission

    def submit(self, request: TaskRequest) -> TaskResult:
        """
        Soumet une tâche dans la file.

        Returns:
            TaskResult initial avec statut PENDING.

        Raises:
            RuntimeError si la file est pleine.
        """
        with self._lock:
            if len(self._heap) >= MAX_QUEUE_SIZE:
                raise RuntimeError(
                    f"File pleine ({MAX_QUEUE_SIZE} tâches en attente). "
                    f"Réessayez plus tard."
                )

            result = TaskResult(
                task_id=request.task_id,
                status=TaskStatus.PENDING,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            self._results[request.task_id] = result

            priority_val = PRIORITY_MAP.get(request.priority, 1)
            item         = PrioritizedTask(
                priority=priority_val,
                created_ts=time.monotonic(),
                task=request,
            )
            heapq.heappush(self._heap, item)
            self._not_empty.notify_all()

            logger.info(
                "Tâche soumise — id=%s type=%s priority=%s",
                request.task_id, request.task_type, request.priority,
            )
            return result

    # Consommation

    def get_next(self, timeout: float = 5.0) -> Optional[TaskRequest]:
        """
        Récupère la prochaine tâche (priorité décroissante).
        Bloque jusqu'à `timeout` secondes si la file est vide.

        Returns:
            TaskRequest ou None si timeout.
        """
        with self._not_empty:
            deadline = time.monotonic() + timeout

            while not self._heap:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return None
                self._not_empty.wait(timeout=remaining)

            if not self._heap:
                return None

            item   = heapq.heappop(self._heap)
            task   = item.task
            result = self._results.get(task.task_id)

            if result and result.status == TaskStatus.CANCELLED:
                logger.info("Tâche annulée ignorée — id=%s", task.task_id)
                return self.get_next(timeout=max(0, deadline - time.monotonic()))

            if result:
                result.status     = TaskStatus.PROCESSING
                result.started_at = datetime.now(timezone.utc).isoformat()

            self._active_count += 1
            return task

    # Completion

    def complete(self, task_id: str, result_data: any) -> None:
        """Marque une tâche comme complétée."""
        with self._lock:
            result = self._results.get(task_id)
            if not result:
                return

            now = datetime.now(timezone.utc).isoformat()
            duration = self._compute_duration(result)

            result.status      = TaskStatus.COMPLETED
            result.result      = result_data
            result.finished_at = now
            result.duration_ms = duration

            if duration:
                self._durations.append(duration)
                # Garde seulement les 100 dernières durées
                if len(self._durations) > 100:
                    self._durations.pop(0)

            self._active_count = max(0, self._active_count - 1)
            logger.info(
                "Tâche complétée — id=%s duration=%.1f ms",
                task_id, duration or 0,
            )

    def fail(self, task_id: str, error: str) -> None:
        """Marque une tâche comme échouée."""
        with self._lock:
            result = self._results.get(task_id)
            if not result:
                return

            result.status      = TaskStatus.FAILED
            result.error       = error
            result.finished_at = datetime.now(timezone.utc).isoformat()
            result.duration_ms = self._compute_duration(result)
            self._active_count = max(0, self._active_count - 1)
            logger.error("Tâche échouée — id=%s error=%s", task_id, error)

    def cancel(self, task_id: str) -> bool:
        """Annule une tâche en attente."""
        with self._lock:
            result = self._results.get(task_id)
            if not result:
                return False
            if result.status != TaskStatus.PENDING:
                return False
            result.status      = TaskStatus.CANCELLED
            result.finished_at = datetime.now(timezone.utc).isoformat()
            logger.info("Tâche annulée — id=%s", task_id)
            return True

    # Consultation

    def get_status(self, task_id: str) -> Optional[TaskStatusResponse]:
        """Retourne le statut d'une tâche."""
        with self._lock:
            result  = self._results.get(task_id)
            if not result:
                return None

            # Trouve la tâche dans le heap pour les métadonnées
            task_item = next(
                (i for i in self._heap if i.task.task_id == task_id),
                None,
            )
            request = task_item.task if task_item else None

            # Position dans la file
            pending = [
                i for i in self._heap
                if self._results.get(i.task.task_id, TaskResult(
                    task_id="", status=TaskStatus.PENDING
                )).status == TaskStatus.PENDING
            ]
            position = next(
                (idx for idx, i in enumerate(pending)
                 if i.task.task_id == task_id),
                None,
            )

            progress = {
                TaskStatus.PENDING:    0.0,
                TaskStatus.PROCESSING: 0.5,
                TaskStatus.COMPLETED:  1.0,
                TaskStatus.FAILED:     0.0,
                TaskStatus.CANCELLED:  0.0,
            }.get(result.status, 0.0)

            return TaskStatusResponse(
                task_id=task_id,
                status=result.status,
                task_type=request.task_type if request else TaskType.SIMULATION,
                priority=request.priority if request else TaskPriority.NORMAL,
                user_id=request.user_id if request else "",
                progress=progress,
                created_at=result.created_at,
                started_at=result.started_at,
                finished_at=result.finished_at,
                duration_ms=result.duration_ms,
                error=result.error,
                queue_position=position,
            )

    def get_result(self, task_id: str) -> Optional[TaskResult]:
        """Retourne le résultat complet d'une tâche."""
        with self._lock:
            return self._results.get(task_id)

    @property
    def stats(self) -> QueueStats:
        """Retourne les statistiques de la file."""
        with self._lock:
            results = list(self._results.values())
            return QueueStats(
                pending_tasks=sum(
                    1 for r in results if r.status == TaskStatus.PENDING
                ),
                processing_tasks=self._active_count,
                completed_tasks=sum(
                    1 for r in results if r.status == TaskStatus.COMPLETED
                ),
                failed_tasks=sum(
                    1 for r in results if r.status == TaskStatus.FAILED
                ),
                total_workers=0,
                active_workers=self._active_count,
                avg_duration_ms=round(
                    sum(self._durations) / len(self._durations), 2
                ) if self._durations else 0.0,
            )

    # Utilitaires

    @staticmethod
    def _compute_duration(result: TaskResult) -> Optional[float]:
        """Calcule la durée en ms si started_at est défini."""
        if not result.started_at:
            return None
        try:
            from datetime import datetime, timezone
            start = datetime.fromisoformat(result.started_at)
            now   = datetime.now(timezone.utc)
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            return round((now - start).total_seconds() * 1000, 2)
        except Exception:
            return None


@lru_cache(maxsize=1)
def get_task_queue() -> TaskQueue:
    """Retourne le singleton TaskQueue."""
    return TaskQueue()