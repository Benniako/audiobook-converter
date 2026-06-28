from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, async_session
from app.config import get_settings
from app.models.user import User

security = HTTPBearer(auto_error=False)
settings = get_settings()

DEMO_USER_ID = "demo-0000-0000-0000-000000000001"


async def get_or_create_demo_user(db: AsyncSession) -> User:
    """Find or create a demo user for testing without auth."""
    result = await db.execute(select(User).where(User.id == DEMO_USER_ID))
    user = result.scalar_one_or_none()
    if not user:
        from app.services.auth_service import hash_password
        user = User(
            id=DEMO_USER_ID,
            email="demo@audiobook.app",
            password_hash=hash_password("demo"),
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    # If no token provided, return demo user for testing
    if credentials is None:
        return await get_or_create_demo_user(db)

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            return await get_or_create_demo_user(db)

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            return await get_or_create_demo_user(db)
        return user
    except JWTError:
        return await get_or_create_demo_user(db)


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email != settings.admin_email and current_user.id != DEMO_USER_ID:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
