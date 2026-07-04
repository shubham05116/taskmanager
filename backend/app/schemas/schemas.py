from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole
from app.models.project import ProjectStatus
from app.models.task import TaskStatus, TaskPriority
from app.models.team import TeamRole


# ── User ─────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserOut(UserBase):
    id: int
    role: UserRole
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id: int
    username: str
    full_name: str
    avatar_url: Optional[str] = None
    email: str

    model_config = {"from_attributes": True}


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"
    is_public: bool = False
    due_date: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[ProjectStatus] = None
    is_public: Optional[bool] = None
    due_date: Optional[datetime] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: str
    status: ProjectStatus
    owner_id: int
    is_public: bool
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner: UserPublic
    task_count: int = 0
    member_count: int = 0

    model_config = {"from_attributes": True}


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    project_id: int
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[int] = None
    tags: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[int] = None
    tags: Optional[str] = None
    position: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    project_id: int
    assignee_id: Optional[int] = None
    creator_id: int
    due_date: Optional[datetime] = None
    estimated_hours: Optional[int] = None
    tags: Optional[str] = None
    position: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignee: Optional[UserPublic] = None
    creator: UserPublic

    model_config = {"from_attributes": True}


# ── Team ──────────────────────────────────────────────────────────────────────

class TeamMemberAdd(BaseModel):
    user_id: int
    role: TeamRole = TeamRole.MEMBER


class TeamMemberOut(BaseModel):
    id: int
    user_id: int
    team_id: int
    role: TeamRole
    joined_at: datetime
    user: UserPublic

    model_config = {"from_attributes": True}


class TeamOut(BaseModel):
    id: int
    name: str
    project_id: int
    members: List[TeamMemberOut] = []

    model_config = {"from_attributes": True}


# ── Comment ───────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str
    task_id: int


class CommentOut(BaseModel):
    id: int
    content: str
    task_id: int
    author_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: UserPublic

    model_config = {"from_attributes": True}


# ── Notification ──────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    related_id: Optional[int] = None
    related_type: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
