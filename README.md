# TaskManager SaaS

A full-stack collaborative task management platform built with **React.js**, **FastAPI**, **PostgreSQL**, and **Redis** — with real-time collaboration via WebSockets.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Query, Zustand, React Router |
| Backend | FastAPI (Python 3.11), SQLAlchemy (async) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Real-time | WebSockets (FastAPI native) |
| Auth | JWT (access + refresh tokens) |
| Gateway | Nginx (reverse proxy) |
| Container | Docker + Docker Compose |

---

## Features

- **JWT Authentication** — Register, login, refresh tokens, role-based access control
- **Projects** — Create, manage, archive projects with color coding and team assignment
- **Kanban Board** — Drag-and-drop task management across Todo / In Progress / In Review / Done columns
- **Tasks** — Full CRUD with priority, due dates, tags, estimated hours, assignees
- **Real-time Collaboration** — WebSocket broadcasts for task updates, user presence (online indicators), typing notifications
- **Team Management** — Invite members, assign roles (Owner / Admin / Member / Viewer), remove members
- **Comments** — Per-task comment threads with real-time sync
- **Notifications** — In-app notification bell with real-time push, mark read/all-read
- **Redis Caching** — Project and task list caching with smart invalidation on writes
- **Background Tasks** — Async notification delivery via FastAPI background tasks

---

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone / unzip the project

```bash
unzip taskmanager.zip
cd taskmanager
```

### 2. (Optional) Customize environment

```bash
cp .env.example .env
# Edit .env to change secrets, passwords, etc.
```

### 3. Start everything

```bash
docker compose up --build
```

The first build takes ~3–5 minutes (downloads images, installs deps, compiles React).

### 4. Open the app

```
http://localhost
```

Register a new account or use the **"Fill demo account"** button on the login page.

> **Demo account:** The button pre-fills `demo@example.com` / `demo123`. You need to register this account first via the Register page, or use your own credentials.

---

## Project Structure

```
taskmanager/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── main.py           # App entry point, lifespan, CORS
│   │   ├── api/routes/       # REST endpoints
│   │   │   ├── auth.py       # Register, login, refresh, /me
│   │   │   ├── projects.py   # Project CRUD + Redis caching
│   │   │   ├── tasks.py      # Task CRUD + WebSocket broadcast
│   │   │   ├── teams.py      # Team members management
│   │   │   ├── users.py      # User search and profile
│   │   │   └── notifications.py
│   │   ├── core/
│   │   │   ├── config.py     # Settings (env vars)
│   │   │   └── security.py   # JWT, bcrypt, auth dependencies
│   │   ├── db/
│   │   │   ├── database.py   # Async SQLAlchemy engine + session
│   │   │   └── redis.py      # Redis client wrapper
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── websockets/
│   │       └── manager.py    # WS connection manager + router
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # React application
│   ├── src/
│   │   ├── App.js            # Router + Toast container
│   │   ├── services/
│   │   │   ├── api.js        # Axios + all API calls
│   │   │   └── websocket.js  # WS service (connect/subscribe)
│   │   ├── store/
│   │   │   ├── authStore.js  # Zustand auth state
│   │   │   └── toastStore.js # Global toast notifications
│   │   └── components/
│   │       ├── auth/         # Login, Register pages
│   │       ├── dashboard/    # Layout, Profile
│   │       ├── projects/     # Projects list, detail, create modal
│   │       ├── tasks/        # Kanban board, task card, modals
│   │       ├── team/         # Team panel
│   │       └── common/       # Notification bell
│   ├── public/index.html
│   ├── package.json
│   └── Dockerfile
│
├── nginx/
│   ├── nginx.conf            # Reverse proxy: /api → backend, /ws → WS, / → frontend
│   └── Dockerfile
│
├── docker-compose.yml        # Full stack orchestration
├── .env.example
└── README.md
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login → access + refresh tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/projects` | List / create projects |
| GET/PUT/DELETE | `/api/projects/{id}` | Get / update / delete project |
| GET/POST | `/api/tasks/project/{id}` | List tasks / create task |
| GET/PUT/DELETE | `/api/tasks/{id}` | Get / update / delete task |
| POST | `/api/tasks/{id}/comments` | Add comment |
| GET | `/api/teams/project/{id}` | Get team for project |
| POST | `/api/teams/project/{id}/members` | Add team member |
| DELETE | `/api/teams/project/{id}/members/{uid}` | Remove member |
| GET | `/api/notifications` | Get notifications |
| PUT | `/api/notifications/{id}/read` | Mark notification read |
| WS | `/ws/{project_id}?token=...` | Project real-time channel |
| WS | `/ws/user/{user_id}?token=...` | User notification channel |

Full interactive docs: `http://localhost/api/docs`

---

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `task_created` | Server → Clients | New task added to project |
| `task_updated` | Server → Clients | Task fields changed |
| `task_deleted` | Server → Clients | Task removed |
| `comment_added` | Server → Clients | New comment on a task |
| `user_joined` | Server → Clients | User connected to project |
| `user_left` | Server → Clients | User disconnected |
| `notification` | Server → User | Personal notification pushed |
| `user_typing` | Server → Clients | Typing indicator broadcast |

---

## Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Set env vars or create .env
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000/api npm start
```

---

## Production Notes

- Change `SECRET_KEY` in `.env` to a strong random string (32+ chars)
- Change all default passwords
- Add HTTPS via certbot/Let's Encrypt in front of nginx
- Scale backend with `deploy: replicas: N` in docker-compose
- Use managed PostgreSQL and Redis for production workloads
