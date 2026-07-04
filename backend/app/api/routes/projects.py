from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.db.database import get_db
from app.db.redis import redis_client
from app.models.user import User
from app.models.project import Project
from app.models.team import Team, TeamMember, TeamRole
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectOut
from app.core.security import get_current_user
from app.websockets.manager import ws_manager

router = APIRouter()


def _eager_query():
    """Always eager-load everything needed by _enrich_project."""
    return (
        select(Project)
        .options(
            selectinload(Project.owner),
            selectinload(Project.tasks),
            selectinload(Project.team).selectinload(Team.members).selectinload(TeamMember.user),
        )
    )


def _enrich_project(project: Project) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        status=project.status,
        owner_id=project.owner_id,
        is_public=project.is_public,
        due_date=project.due_date,
        created_at=project.created_at,
        updated_at=project.updated_at,
        owner=project.owner,
        task_count=len(project.tasks) if project.tasks else 0,
        member_count=len(project.team.members) if project.team else 0,
    )


async def _fetch_project(project_id: int, db: AsyncSession) -> Project:
    result = await db.execute(_eager_query().where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(**data.model_dump(), owner_id=current_user.id)
    db.add(project)
    await db.flush()

    team = Team(name=f"{data.name} Team", project_id=project.id)
    db.add(team)
    await db.flush()

    member = TeamMember(team_id=team.id, user_id=current_user.id, role=TeamRole.OWNER)
    db.add(member)
    await db.commit()

    project = await _fetch_project(project.id, db)
    await redis_client.delete_pattern(f"projects:user:{current_user.id}:*")
    return _enrich_project(project)


@router.get("/", response_model=List[ProjectOut])
async def list_projects(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"projects:user:{current_user.id}:{status or 'all'}"
    cached = await redis_client.get(cache_key)
    if cached:
        return cached

    member_project_ids = (
        select(Team.project_id)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == current_user.id)
        .scalar_subquery()
    )

    query = _eager_query().where(
        (Project.owner_id == current_user.id) |
        (Project.id.in_(member_project_ids))
    )
    if status:
        query = query.where(Project.status == status)

    result = await db.execute(query)
    projects = result.scalars().unique().all()

    enriched = [_enrich_project(p) for p in projects]
    await redis_client.set(cache_key, [p.model_dump(mode="json") for p in enriched], ttl=120)
    return enriched


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _fetch_project(project_id, db)
    return _enrich_project(project)


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _fetch_project(project_id, db)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project owner can update it")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.commit()

    project = await _fetch_project(project_id, db)
    await redis_client.delete_pattern(f"projects:user:{current_user.id}:*")
    await ws_manager.broadcast_to_project(project_id, {
        "event": "project_updated",
        "project_id": project_id,
        "data": {"name": project.name, "status": project.status.value},
    })
    return _enrich_project(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _fetch_project(project_id, db)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project owner can delete it")

    await db.delete(project)
    await db.commit()
    await redis_client.delete_pattern(f"projects:user:{current_user.id}:*")
