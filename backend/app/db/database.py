from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def create_enum_types(conn):
    enums = [
        ("userrole",      ["admin", "member", "viewer"]),
        ("projectstatus", ["active", "archived", "completed"]),
        ("taskstatus",    ["todo", "in_progress", "in_review", "done", "cancelled"]),
        ("taskpriority",  ["low", "medium", "high", "urgent"]),
        ("teamrole",      ["owner", "admin", "member", "viewer"]),
    ]
    for name, values in enums:
        vals = ", ".join(f"'{v}'" for v in values)
        await conn.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN
                    CREATE TYPE {name} AS ENUM ({vals});
                END IF;
            END
            $$;
        """))


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()