from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.db.database import engine, Base, create_enum_types
from app.api.routes import auth, users, projects, tasks, teams, notifications
from app.websockets.manager import websocket_router
from app.db.redis import redis_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up TaskManager API...")
    async with engine.begin() as conn:
        await create_enum_types(conn)
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    await redis_client.connect()
    logger.info("Database ready. Redis connected.")
    yield
    await redis_client.disconnect()
    logger.info("Shutting down.")


app = FastAPI(
    title="TaskManager SaaS API",
    description="Collaborative Task Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_all_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/auth",          tags=["Authentication"])
app.include_router(users.router,         prefix="/api/users",         tags=["Users"])
app.include_router(projects.router,      prefix="/api/projects",      tags=["Projects"])
app.include_router(tasks.router,         prefix="/api/tasks",         tags=["Tasks"])
app.include_router(teams.router,         prefix="/api/teams",         tags=["Teams"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(websocket_router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "TaskManager API"}