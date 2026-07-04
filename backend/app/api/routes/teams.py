from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.team import Team, TeamMember, TeamRole
from app.schemas.schemas import TeamMemberAdd, TeamMemberOut, TeamOut
from app.core.security import get_current_user

router = APIRouter()


@router.get("/project/{project_id}", response_model=TeamOut)
async def get_project_team(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .where(Team.project_id == project_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("/project/{project_id}/members", response_model=TeamMemberOut, status_code=201)
async def add_member(
    project_id: int,
    data: TeamMemberAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = await db.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project owner can add members")

    result = await db.execute(select(Team).where(Team.project_id == project_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team.id,
            TeamMember.user_id == data.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a team member")

    target_user = await db.get(User, data.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    member = TeamMember(team_id=team.id, user_id=data.user_id, role=data.role)
    db.add(member)
    await db.commit()

    result = await db.execute(
        select(TeamMember)
        .options(selectinload(TeamMember.user))
        .where(TeamMember.id == member.id)
    )
    return result.scalar_one()


@router.delete("/project/{project_id}/members/{user_id}", status_code=204)
async def remove_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = await db.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj.owner_id != current_user.id and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(Team).where(Team.project_id == project_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team.id,
            TeamMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == TeamRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")

    await db.delete(member)
    await db.commit()


@router.put("/project/{project_id}/members/{user_id}/role", response_model=TeamMemberOut)
async def update_member_role(
    project_id: int,
    user_id: int,
    role: TeamRole,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = await db.get(Project, project_id)
    if not proj or proj.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(Team).where(Team.project_id == project_id))
    team = result.scalar_one_or_none()

    result = await db.execute(
        select(TeamMember)
        .options(selectinload(TeamMember.user))
        .where(TeamMember.team_id == team.id, TeamMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.role = role
    await db.commit()
    await db.refresh(member)
    return member
