import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.compute.task_queue  import TaskQueue, get_task_queue
from app.core.compute.task_worker import WorkerPool, get_worker_pool
from app.schemas.tasks import (
    QueueStats,
    TaskPriority,
    TaskRequest,
    TaskResult,
    TaskStatus,
    TaskStatusResponse,
    TaskType,
)
from app.schemas.simulation import SimulationRequest

router = APIRouter(prefix="/tasks", tags=["Async Task Queue"])


# Soumission d'une simulation asynchrone

@router.post(
    "/simulation",
    response_model=TaskResult,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Soumettre une simulation en arrière-plan",
    description=(
        "Soumet une simulation dans la file de messages. "
        "Retourne immédiatement avec un task_id pour suivre l'état. "
        "Résultat récupérable via GET /tasks/{task_id}."
    ),
)
async def submit_simulation(
    request:  SimulationRequest,
    priority: TaskPriority = TaskPriority.NORMAL,
    queue:    TaskQueue    = Depends(get_task_queue),
) -> TaskResult:
    """Soumet une simulation asynchrone."""
    task_request = TaskRequest(
        task_id=str(uuid.uuid4()),
        task_type=TaskType.SIMULATION,
        priority=priority,
        payload=request.model_dump(),
        user_id=request.user_id,
        session_id=request.session_id,
    )

    try:
        return queue.submit(task_request)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


# Soumission d'une génération d'avatar

@router.post(
    "/avatar-generation",
    response_model=TaskResult,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Soumettre une génération d'avatar en arrière-plan",
)
async def submit_avatar_generation(
    payload:  dict,
    user_id:  str,
    priority: TaskPriority = TaskPriority.NORMAL,
    queue:    TaskQueue    = Depends(get_task_queue),
) -> TaskResult:
    """Soumet une génération d'avatar asynchrone."""
    task_request = TaskRequest(
        task_id=str(uuid.uuid4()),
        task_type=TaskType.AVATAR_GENERATION,
        priority=priority,
        payload=payload,
        user_id=user_id,
    )
    return queue.submit(task_request)


# Consultation du statut

@router.get(
    "/{task_id}/status",
    response_model=TaskStatusResponse,
    summary="Consulter le statut d'une tâche",
)
async def get_task_status(
    task_id: str,
    queue:   TaskQueue = Depends(get_task_queue),
) -> TaskStatusResponse:
    """Retourne le statut actuel d'une tâche."""
    task_status = queue.get_status(task_id)
    if not task_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tâche {task_id} introuvable.",
        )
    return task_status


# Récupération du résultat

@router.get(
    "/{task_id}/result",
    response_model=TaskResult,
    summary="Récupérer le résultat d'une tâche complétée",
)
async def get_task_result(
    task_id: str,
    queue:   TaskQueue = Depends(get_task_queue),
) -> TaskResult:
    """Retourne le résultat complet d'une tâche."""
    result = queue.get_result(task_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tâche {task_id} introuvable.",
        )
    if result.status == TaskStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail="Tâche en attente de traitement.",
        )
    if result.status == TaskStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail="Tâche en cours de traitement.",
        )
    return result


# Annulation

@router.delete(
    "/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Annuler une tâche en attente",
)
async def cancel_task(
    task_id: str,
    queue:   TaskQueue = Depends(get_task_queue),
) -> dict:
    """Annule une tâche si elle est encore en attente."""
    cancelled = queue.cancel(task_id)
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tâche introuvable ou déjà en cours/terminée.",
        )
    return {"task_id": task_id, "status": "cancelled"}


# Statistiques de la file

@router.get(
    "/queue/stats",
    response_model=QueueStats,
    summary="Statistiques de la file de messages",
)
async def get_queue_stats(
    queue: TaskQueue  = Depends(get_task_queue),
    pool:  WorkerPool = Depends(get_worker_pool),
) -> QueueStats:
    """Retourne les statistiques de la file et des workers."""
    stats = queue.stats
    pool_stats = pool.stats

    return QueueStats(
        pending_tasks=stats.pending_tasks,
        processing_tasks=stats.processing_tasks,
        completed_tasks=stats.completed_tasks,
        failed_tasks=stats.failed_tasks,
        total_workers=pool_stats["total_workers"],
        active_workers=pool_stats["active_workers"],
        avg_duration_ms=stats.avg_duration_ms,
    )