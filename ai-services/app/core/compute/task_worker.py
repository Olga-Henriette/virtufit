"""
Workers de traitement asynchrone — VirtuFit AI Services.

Chaque worker tourne dans un thread daemon et consomme
les tâches de la TaskQueue. Les résultats sont stockés
dans la queue pour récupération via l'API.
"""

from __future__ import annotations

import threading
import time
from functools import lru_cache
from typing import Optional

from app.core.compute.task_queue       import TaskQueue, get_task_queue
from app.core.compute.optimized_simulation import get_optimized_simulation_service
from app.core.morphology.avatar_service    import get_avatar_service
from app.schemas.tasks  import TaskRequest, TaskType
from app.utils.logger   import get_logger

logger = get_logger(__name__)

# Nombre de workers simultanés
DEFAULT_WORKER_COUNT = 2
WORKER_POLL_INTERVAL = 0.5   # secondes


class TaskWorker:
    """
    Worker de traitement des tâches asynchrones.
    Tourne dans un thread daemon et consomme la TaskQueue.
    """

    def __init__(self, worker_id: int, queue: TaskQueue) -> None:
        self._id      = worker_id
        self._queue   = queue
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._processed = 0

    @property
    def is_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    @property
    def processed_count(self) -> int:
        return self._processed

    def start(self) -> None:
        """Démarre le worker dans un thread daemon."""
        self._running = True
        self._thread  = threading.Thread(
            target=self._run_loop,
            daemon=True,
            name=f"virtufit-worker-{self._id}",
        )
        self._thread.start()
        logger.info("Worker %d démarré", self._id)

    def stop(self) -> None:
        """Arrête le worker proprement."""
        self._running = False
        logger.info("Worker %d arrêté — tâches traitées : %d",
                    self._id, self._processed)

    # Boucle principale

    def _run_loop(self) -> None:
        """Boucle infinie de consommation des tâches."""
        logger.info("Worker %d — boucle démarrée", self._id)

        while self._running:
            task = self._queue.get_next(timeout=WORKER_POLL_INTERVAL)
            if task is None:
                continue

            logger.info(
                "Worker %d — traitement tâche id=%s type=%s",
                self._id, task.task_id, task.task_type,
            )

            try:
                result = self._dispatch(task)
                self._queue.complete(task.task_id, result)
                self._processed += 1

            except Exception as exc:
                logger.error(
                    "Worker %d — erreur tâche id=%s : %s",
                    self._id, task.task_id, exc,
                )
                self._queue.fail(task.task_id, str(exc))

        logger.info("Worker %d — boucle terminée", self._id)

    # Dispatch des types de tâches

    def _dispatch(self, task: TaskRequest) -> dict:
        """
        Route la tâche vers le bon handler selon son type.

        Returns:
            Résultat sérialisable (dict).
        """
        handlers = {
            TaskType.SIMULATION:        self._handle_simulation,
            TaskType.AVATAR_GENERATION: self._handle_avatar_generation,
            TaskType.FIT_ANALYSIS:      self._handle_fit_analysis,
            TaskType.CLOTHING_DIGITIZE: self._handle_clothing_digitize,
        }

        handler = handlers.get(task.task_type)
        if not handler:
            raise ValueError(f"Type de tâche inconnu : {task.task_type}")

        return handler(task)

    # Handlers spécifiques

    def _handle_simulation(self, task: TaskRequest) -> dict:
        """Traite une tâche de simulation physique."""
        from app.schemas.simulation import SimulationRequest

        request = SimulationRequest(**task.payload)
        service = get_optimized_simulation_service()
        result  = service.run_simulation(request, use_cache=True)

        return {
            "session_id":   result.session_id,
            "status":       result.status,
            "frame_count":  result.frame_count,
            "simulation_ms": result.simulation_ms,
            "fit_score":    result.fit_analysis.fit_score,
            "overall_fit":  result.fit_analysis.overall_fit,
        }

    def _handle_avatar_generation(self, task: TaskRequest) -> dict:
        """Traite une tâche de génération d'avatar."""
        from app.schemas.avatar import AvatarGenerationRequest

        request = AvatarGenerationRequest(**task.payload)
        service = get_avatar_service()
        result  = service.generate_avatar(request)

        return {
            "avatar_id":        result.avatar_id,
            "user_id":          result.user_id,
            "bmi":              result.bmi,
            "generation_ms":    result.generation_time_ms,
            "mesh_reference":   result.mesh.mesh_reference,
        }

    def _handle_fit_analysis(self, task: TaskRequest) -> dict:
        """Traite une tâche d'analyse d'ajustement."""
        from app.schemas.simulation import SimulationRequest
        from app.schemas.avatar     import MeasurementsInput
        from app.core.textile.fit_analyzer import get_fit_analyzer

        sim_request   = SimulationRequest(**task.payload["simulation"])
        measurements  = MeasurementsInput(**task.payload["measurements"])

        sim_service = get_optimized_simulation_service()
        sim_result  = sim_service.run_simulation(sim_request, use_cache=True)

        analyzer = get_fit_analyzer()
        analysis = analyzer.analyze(
            sim_result=sim_result,
            user_id=task.user_id,
            clothing_id=task.payload.get("clothing_id", ""),
            measurements=measurements,
            fabric_type=task.payload.get("fabric_type", "cotton"),
            category=task.payload.get("category", "top"),
            current_size=task.payload.get("current_size", "M"),
            animation_type=sim_request.animation_type.value,
        )

        return {
            "overall_score":  analysis.overall_score,
            "fit_category":   analysis.fit_category,
            "comfort_score":  analysis.comfort_score,
            "mobility_score": analysis.mobility_score,
            "summary":        analysis.summary,
        }

    def _handle_clothing_digitize(self, task: TaskRequest) -> dict:
        """Traite une tâche de numérisation de vêtement."""
        # Simulation d'un traitement asynchrone
        time.sleep(0.1)
        return {
            "clothing_id": task.payload.get("clothing_id", ""),
            "status":      "digitized",
            "message":     "Numérisation asynchrone complétée.",
        }


class WorkerPool:
    """
    Pool de workers asynchrones.
    Gère le cycle de vie de tous les workers.
    """

    def __init__(
        self,
        worker_count: int = DEFAULT_WORKER_COUNT,
        queue:        Optional[TaskQueue] = None,
    ) -> None:
        self._queue   = queue or get_task_queue()
        self._workers: list[TaskWorker] = []
        self._count   = worker_count
        self._started = False

    def start(self) -> None:
        """Démarre tous les workers du pool."""
        if self._started:
            logger.warning("WorkerPool déjà démarré.")
            return

        for i in range(self._count):
            worker = TaskWorker(worker_id=i + 1, queue=self._queue)
            worker.start()
            self._workers.append(worker)

        self._started = True
        logger.info(
            "WorkerPool démarré — %d workers actifs", self._count
        )

    def stop(self) -> None:
        """Arrête tous les workers proprement."""
        for worker in self._workers:
            worker.stop()
        self._workers.clear()
        self._started = False
        logger.info("WorkerPool arrêté.")

    @property
    def active_count(self) -> int:
        """Nombre de workers actifs."""
        return sum(1 for w in self._workers if w.is_alive)

    @property
    def total_processed(self) -> int:
        """Total des tâches traitées par tous les workers."""
        return sum(w.processed_count for w in self._workers)

    @property
    def stats(self) -> dict:
        return {
            "total_workers":  len(self._workers),
            "active_workers": self.active_count,
            "total_processed": self.total_processed,
            "worker_details": [
                {
                    "id":        i + 1,
                    "alive":     w.is_alive,
                    "processed": w.processed_count,
                }
                for i, w in enumerate(self._workers)
            ],
        }


# Singleton du pool

_worker_pool: Optional[WorkerPool] = None
_pool_lock   = threading.Lock()


def get_worker_pool() -> WorkerPool:
    """Retourne le singleton WorkerPool (lazy init)."""
    global _worker_pool
    with _pool_lock:
        if _worker_pool is None:
            _worker_pool = WorkerPool(worker_count=DEFAULT_WORKER_COUNT)
        return _worker_pool