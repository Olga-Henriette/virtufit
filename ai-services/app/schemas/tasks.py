from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class TaskStatus(str, Enum):
    """États possibles d'une tâche asynchrone."""
    PENDING    = "pending"
    PROCESSING = "processing"
    COMPLETED  = "completed"
    FAILED     = "failed"
    CANCELLED  = "cancelled"


class TaskPriority(str, Enum):
    """Niveaux de priorité des tâches."""
    LOW    = "low"
    NORMAL = "normal"
    HIGH   = "high"


class TaskType(str, Enum):
    """Types de tâches supportés."""
    SIMULATION          = "simulation"
    AVATAR_GENERATION   = "avatar_generation"
    CLOTHING_DIGITIZE   = "clothing_digitization"
    FIT_ANALYSIS        = "fit_analysis"


class TaskRequest(BaseModel):
    """Requête de création d'une tâche asynchrone."""
    task_id:    str          = Field(..., description="UUID de la tâche")
    task_type:  TaskType     = Field(..., description="Type de tâche")
    priority:   TaskPriority = Field(TaskPriority.NORMAL)
    payload:    dict         = Field(..., description="Paramètres de la tâche")
    user_id:    str          = Field(..., description="UUID de l'utilisateur")
    session_id: Optional[str] = Field(None)


class TaskResult(BaseModel):
    """Résultat d'une tâche asynchrone."""
    task_id:     str        = Field(...)
    status:      TaskStatus = Field(...)
    result:      Optional[Any]  = Field(None)
    error:       Optional[str]  = Field(None)
    created_at:  str        = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    started_at:  Optional[str] = Field(None)
    finished_at: Optional[str] = Field(None)
    duration_ms: Optional[float] = Field(None)


class TaskStatusResponse(BaseModel):
    """Réponse de statut d'une tâche."""
    task_id:      str        = Field(...)
    status:       TaskStatus = Field(...)
    task_type:    TaskType   = Field(...)
    priority:     TaskPriority = Field(...)
    user_id:      str        = Field(...)
    progress:     float      = Field(0.0, ge=0.0, le=1.0)
    created_at:   str        = Field(...)
    started_at:   Optional[str]   = Field(None)
    finished_at:  Optional[str]   = Field(None)
    duration_ms:  Optional[float] = Field(None)
    error:        Optional[str]   = Field(None)
    queue_position: Optional[int] = Field(None)


class QueueStats(BaseModel):
    """Statistiques de la file de messages."""
    pending_tasks:    int   = Field(...)
    processing_tasks: int   = Field(...)
    completed_tasks:  int   = Field(...)
    failed_tasks:     int   = Field(...)
    total_workers:    int   = Field(...)
    active_workers:   int   = Field(...)
    avg_duration_ms:  float = Field(...)