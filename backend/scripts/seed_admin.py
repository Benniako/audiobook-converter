"""
Seed script to create the admin user.
Run: python -m scripts.seed_admin

This creates an admin@example.com user with password 1234
and sets plan to "pro".
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import get_settings
from app.database import engine, Base, async_session
from app.models.user import User, UserPlan
from app.services.auth_service import hash_password
from sqlalchemy import select
import asyncio


async def seed():
    settings = get_settings()
    admin_email = settings.admin_email

    async with async_session() as session:
        # Check if admin exists
        result = await session.execute(select(User).where(User.email == admin_email))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✅ Admin already exists: {admin_email}")
            return

        # Create admin
        admin = User(
            email=admin_email,
            password_hash=hash_password("1234"),
            plan=UserPlan.pro,
        )
        session.add(admin)
        await session.flush()
        print(f"✅ Admin created: {admin_email} / password: 1234")
        print(f"   Plan: Pro")
        print(f"   Sign in at: {settings.app_url}/login")


if __name__ == "__main__":
    asyncio.run(seed())
