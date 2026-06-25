import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.user import User
from app.models.book import Book
from app.models.custom_tts import CustomTTSProvider, ProviderType
from app.models.conversion_job import ConversionJob
from app.schemas.tts import CustomTTSCreate, CustomTTSUpdate, CustomTTSOut
from app.tts.registry import register_provider, unregister_provider
from app.tts.custom_provider import CustomProvider

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/custom-tts", response_model=list[CustomTTSOut])
async def list_custom_tts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(CustomTTSProvider).order_by(CustomTTSProvider.created_at.desc()))
    return list(result.scalars().all())


@router.post("/custom-tts", response_model=CustomTTSOut, status_code=201)
async def create_custom_tts(
    data: CustomTTSCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    provider = CustomTTSProvider(
        name=data.name,
        provider_type=data.provider_type,
        config=data.config,
    )
    db.add(provider)
    await db.flush()
    await db.refresh(provider)

    # Register in the live TTS registry
    _register_custom_provider(provider)

    return provider


@router.put("/custom-tts/{provider_id}", response_model=CustomTTSOut)
async def update_custom_tts(
    provider_id: UUID,
    data: CustomTTSUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(CustomTTSProvider).where(CustomTTSProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    if data.name is not None:
        provider.name = data.name
    if data.config is not None:
        provider.config = data.config
    if data.is_active is not None:
        provider.is_active = data.is_active

    await db.flush()
    await db.refresh(provider)

    # Re-register in live registry
    unregister_provider(str(provider.id))
    if provider.is_active:
        _register_custom_provider(provider)

    return provider


@router.delete("/custom-tts/{provider_id}", status_code=204)
async def delete_custom_tts(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(CustomTTSProvider).where(CustomTTSProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    unregister_provider(str(provider.id))
    await db.delete(provider)


@router.post("/custom-tts/{provider_id}/test")
async def test_custom_tts(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(CustomTTSProvider).where(CustomTTSProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    try:
        custom = _build_custom_provider(provider)
        audio = await custom.synthesize("Hello, this is a test of my custom TTS engine.")
        return {"success": True, "audio_size_bytes": len(audio)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _build_custom_provider(model: CustomTTSProvider) -> CustomProvider:
    config = json.loads(model.config) if isinstance(model.config, str) else model.config
    return CustomProvider(
        provider_id=str(model.id),
        name=model.name,
        provider_type=model.provider_type.value,
        config=config,
    )


def _register_custom_provider(model: CustomTTSProvider):
    provider = _build_custom_provider(model)
    register_provider(str(model.id), provider)


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_books = (await db.execute(select(func.count(Book.id)))).scalar()
    pending_jobs = (await db.execute(
        select(func.count(ConversionJob.id)).where(ConversionJob.status != "done")
    )).scalar()

    return {
        "total_users": total_users,
        "total_books": total_books,
        "pending_jobs": pending_jobs,
    }
