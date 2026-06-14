import time
import uuid
import pytest

from app.core.compute.task_queue  import TaskQueue
from app.schemas.tasks import (
    TaskPriority, TaskRequest, TaskStatus, TaskType,
)


# Fixture

@pytest.fixture
def queue() -> TaskQueue:
    q = TaskQueue()
    yield q


def _make_task(
    task_type: TaskType = TaskType.SIMULATION,
    priority:  TaskPriority = TaskPriority.NORMAL,
) -> TaskRequest:
    return TaskRequest(
        task_id=str(uuid.uuid4()),
        task_type=task_type,
        priority=priority,
        payload={"test": "data"},
        user_id="user-async-test",
    )


# Tests TaskQueue

class TestTaskQueue:

    def test_submit_returns_pending_result(
        self, queue: TaskQueue
    ) -> None:
        task   = _make_task()
        result = queue.submit(task)
        assert result.status  == TaskStatus.PENDING
        assert result.task_id == task.task_id

    def test_get_next_returns_submitted_task(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        next_task = queue.get_next(timeout=1.0)
        assert next_task is not None
        assert next_task.task_id == task.task_id

    def test_high_priority_served_first(
        self, queue: TaskQueue
    ) -> None:
        low    = _make_task(priority=TaskPriority.LOW)
        normal = _make_task(priority=TaskPriority.NORMAL)
        high   = _make_task(priority=TaskPriority.HIGH)

        queue.submit(low)
        queue.submit(normal)
        queue.submit(high)

        first = queue.get_next(timeout=1.0)
        assert first is not None
        assert first.task_id == high.task_id

    def test_get_next_timeout_returns_none(
        self, queue: TaskQueue
    ) -> None:
        result = queue.get_next(timeout=0.1)
        assert result is None

    def test_complete_updates_status(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        queue.get_next(timeout=1.0)
        queue.complete(task.task_id, {"result": "ok"})

        result = queue.get_result(task.task_id)
        assert result is not None
        assert result.status == TaskStatus.COMPLETED
        assert result.result == {"result": "ok"}

    def test_fail_updates_status(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        queue.get_next(timeout=1.0)
        queue.fail(task.task_id, "Erreur de test")

        result = queue.get_result(task.task_id)
        assert result is not None
        assert result.status == TaskStatus.FAILED
        assert result.error  == "Erreur de test"

    def test_cancel_pending_task(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        cancelled = queue.cancel(task.task_id)
        assert cancelled is True

        result = queue.get_result(task.task_id)
        assert result.status == TaskStatus.CANCELLED

    def test_cancel_processing_task_returns_false(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        queue.get_next(timeout=1.0)   # passe en PROCESSING
        cancelled = queue.cancel(task.task_id)
        assert cancelled is False

    def test_get_status_returns_correct_status(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)

        status = queue.get_status(task.task_id)
        assert status is not None
        assert status.status   == TaskStatus.PENDING
        assert status.task_id  == task.task_id

    def test_get_status_nonexistent_returns_none(
        self, queue: TaskQueue
    ) -> None:
        status = queue.get_status("nonexistent-id")
        assert status is None

    def test_stats_count_correctly(
        self, queue: TaskQueue
    ) -> None:
        t1 = _make_task()
        t2 = _make_task()
        queue.submit(t1)
        queue.submit(t2)

        stats = queue.stats
        assert stats.pending_tasks >= 2

    def test_complete_updates_duration(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        queue.get_next(timeout=1.0)
        time.sleep(0.05)
        queue.complete(task.task_id, {})

        result = queue.get_result(task.task_id)
        assert result.duration_ms is not None
        assert result.duration_ms >= 0

    def test_queue_full_raises_error(self) -> None:
        from app.core.compute.task_queue import MAX_QUEUE_SIZE
        small_q = TaskQueue()
        small_q._heap = [object()] * MAX_QUEUE_SIZE  # type: ignore

        with pytest.raises(RuntimeError, match="File pleine"):
            small_q.submit(_make_task())

    def test_multiple_tasks_fifo_same_priority(
        self, queue: TaskQueue
    ) -> None:
        tasks = [_make_task() for _ in range(3)]
        for t in tasks:
            queue.submit(t)

        retrieved = [queue.get_next(timeout=0.5) for _ in range(3)]
        ids = [t.task_id for t in retrieved if t]
        assert ids[0] == tasks[0].task_id   # FIFO pour même priorité


# Tests statut et progression

class TestTaskProgress:

    def test_pending_progress_is_zero(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        status = queue.get_status(task.task_id)
        assert status.progress == 0.0

    def test_processing_progress_is_half(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        queue.get_next(timeout=1.0)
        status = queue.get_status(task.task_id)
        assert status.progress == 0.5

    def test_completed_progress_is_one(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        queue.get_next(timeout=1.0)
        queue.complete(task.task_id, {})
        status = queue.get_status(task.task_id)
        assert status.progress == 1.0

    def test_finished_at_set_on_complete(
        self, queue: TaskQueue
    ) -> None:
        task = _make_task()
        queue.submit(task)
        queue.get_next(timeout=1.0)
        queue.complete(task.task_id, {})
        result = queue.get_result(task.task_id)
        assert result.finished_at is not None