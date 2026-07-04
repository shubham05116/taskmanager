from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.db.database import get_db, AsyncSessionLocal
from app.db.redis import redis_client
from app.models.user import User
from app.models.task import Task
from app.models.team import Comment, Notification
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskOut, CommentCreate, CommentOut
from app.core.security import get_current_user
from app.websockets.manager import ws_manager

router = APIRouter()


def _task_query():
    return (
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.creator))
    )


async def _fetch_task(task_id: int, db: AsyncSession) -> Task:
    result = await db.execute(_task_query().where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _task_out(task: Task) -> TaskOut:
    return TaskOut.model_validate(task)


@router.post("/", response_model=TaskOut, status_code=201)
async def create_task(
    data: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = Task(**data.model_dump(), creator_id=current_user.id)
    db.add(task)
    await db.commit()

    task = await _fetch_task(task.id, db)
    await redis_client.delete_pattern(f"tasks:project:{data.project_id}:*")

    if data.assignee_id and data.assignee_id != current_user.id:
        background_tasks.add_task(
            _notify_assignee,
            data.assignee_id, task.id, task.title, current_user.full_name
        )

    await ws_manager.broadcast_to_project(data.project_id, {
        "event": "task_created",
        "project_id": data.project_id,
        "data": _task_out(task).model_dump(mode="json"),
    })
    return task


@router.get("/project/{project_id}", response_model=List[TaskOut])
async def list_project_tasks(
    project_id: int,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"tasks:project:{project_id}:{status}:{priority}:{assignee_id}"
    cached = await redis_client.get(cache_key)
    if cached:
        return cached

    query = (
        _task_query()
        .where(Task.project_id == project_id, Task.is_archived == False)
        .order_by(Task.position, Task.created_at)
    )
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if assignee_id:
        query = query.where(Task.assignee_id == assignee_id)

    result = await db.execute(query)
    tasks = result.scalars().all()

    task_list = [_task_out(t).model_dump(mode="json") for t in tasks]
    await redis_client.set(cache_key, task_list, ttl=60)
    return tasks


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _fetch_task(task_id, db)


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _fetch_task(task_id, db)
    old_assignee = task.assignee_id
    project_id = task.project_id

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    await db.commit()

    task = await _fetch_task(task_id, db)
    await redis_client.delete_pattern(f"tasks:project:{project_id}:*")

    if data.assignee_id and data.assignee_id != old_assignee and data.assignee_id != current_user.id:
        background_tasks.add_task(
            _notify_assignee,
            data.assignee_id, task.id, task.title, current_user.full_name
        )

    await ws_manager.broadcast_to_project(project_id, {
        "event": "task_updated",
        "project_id": project_id,
        "task_id": task_id,
        "data": _task_out(task).model_dump(mode="json"),
        "changed_by": current_user.username,
    })
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _fetch_task(task_id, db)
    project_id = task.project_id
    await db.delete(task)
    await db.commit()
    await redis_client.delete_pattern(f"tasks:project:{project_id}:*")
    await ws_manager.broadcast_to_project(project_id, {
        "event": "task_deleted",
        "project_id": project_id,
        "task_id": task_id,
    })


@router.post("/{task_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(
    task_id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _fetch_task(task_id, db)
    comment = Comment(content=data.content, task_id=task_id, author_id=current_user.id)
    db.add(comment)
    await db.commit()

    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.id == comment.id)
    )
    comment = result.scalar_one()

    await ws_manager.broadcast_to_project(task.project_id, {
        "event": "comment_added",
        "task_id": task_id,
        "data": CommentOut.model_validate(comment).model_dump(mode="json"),
    })
    return comment


@router.get("/{task_id}/comments", response_model=List[CommentOut])
async def get_comments(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.task_id == task_id)
        .order_by(Comment.created_at)
    )
    return result.scalars().all()


async def _notify_assignee(
    assignee_id: int, task_id: int, task_title: str, assigner_name: str
):
    """Run in background — uses its own DB session."""
    async with AsyncSessionLocal() as db:
        notification = Notification(
            user_id=assignee_id,
            title="New Task Assigned",
            message=f"{assigner_name} assigned you to: {task_title}",
            type="task_assigned",
            related_id=task_id,
            related_type="task",
        )
        db.add(notification)
        await db.commit()

    await ws_manager.send_to_user(assignee_id, {
        "event": "notification",
        "data": {
            "title": "New Task Assigned",
            "message": f"{assigner_name} assigned you to: {task_title}",
        },
    })
