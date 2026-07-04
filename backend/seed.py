#!/usr/bin/env python3
"""Seed a demo user. Usage: docker compose exec backend python seed.py"""
import asyncio
from app.db.database import AsyncSessionLocal, engine, Base, create_enum_types
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select


async def seed():
    async with engine.begin() as conn:
        await create_enum_types(conn)
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "demo@example.com"))
        if result.scalar_one_or_none():
            print("Demo user already exists.")
            return

        demo = User(
            email="demo@example.com",
            username="demo",
            full_name="Demo User",
            hashed_password=get_password_hash("demo123"),
            is_active=True,
            is_verified=True,
            role=UserRole.ADMIN,
        )
        db.add(demo)
        await db.commit()
        print("✅ Demo user created: demo@example.com / demo123")


if __name__ == "__main__":
    asyncio.run(seed())
