import os
import uuid
import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.voice_profile import VoiceProfile, VoiceSample, VoiceProfileStatus
from app.schemas.voice import VoiceProfileCreate, VoiceProfileOut, VoiceProfileDetailOut, VoiceSampleOut
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voices", tags=["voices"])
settings = get_settings()

ALLOWED_AUDIO_EXTENSIONS = (".wav", ".mp3", ".m4a", ".ogg", ".flac")
MAX_SAMPLE_SIZE = 50 * 1024 * 1024  # 50MB


def get_voice_dir(user_id: str, profile_id: str) -> str:
    """Get directory for voice profile samples and embeddings."""
    base = os.path.join(settings.upload_dir, "voices", str(user_id), str(profile_id))
    os.makedirs(base, exist_ok=True)
    return base


def extract_embedding_background(profile_id: str, user_id: str):
    """Background task: extract speaker embedding from uploaded samples."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session as SyncSession
    from app.tts.registry import get_provider
    from app.models.voice_profile import VoiceProfile, VoiceSample

    engine = create_engine(settings.database_url_sync)
    session = SyncSession(engine)
    try:
        provider = get_provider("vox_clone")
        if not provider:
            profile = session.execute(
                select(VoiceProfile).where(VoiceProfile.id == profile_id)
            ).scalar_one_or_none()
            if profile:
                profile.status = VoiceProfileStatus.error
                profile.error_message = "VoxClone provider not loaded"
                session.commit()
            return

        samples = session.execute(
            select(VoiceSample).where(VoiceSample.profile_id == profile_id)
        ).scalars().all()

        if not samples:
            return

        audio_paths = [s.file_path for s in samples]
        embedding_path = provider.extract_embedding(audio_paths, profile_id, user_id)

        profile = session.execute(
            select(VoiceProfile).where(VoiceProfile.id == profile_id)
        ).scalar_one()
        profile.embedding_path = embedding_path
        profile.status = VoiceProfileStatus.ready
        profile.error_message = None
        session.commit()
        logger.info("Voice profile %s is ready", profile_id)
    except Exception as e:
        session.rollback()
        profile = session.execute(
            select(VoiceProfile).where(VoiceProfile.id == profile_id)
        ).scalar_one_or_none()
        if profile:
            profile.status = VoiceProfileStatus.error
            profile.error_message = str(e)[:500]
            session.commit()
        logger.error("Embedding extraction failed for %s: %s", profile_id, e)
    finally:
        session.close()


@router.post("/profiles", response_model=VoiceProfileOut, status_code=201)
async def create_profile(
    data: VoiceProfileCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    profile = VoiceProfile(user_id=user.id, name=data.name, description=data.description)
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return profile


@router.get("/profiles", response_model=list[VoiceProfileOut])
async def list_profiles(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.user_id == user.id).order_by(VoiceProfile.created_at.desc())
    )
    return result.scalars().all()


@router.get("/profiles/{profile_id}", response_model=VoiceProfileDetailOut)
async def get_profile(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")
    return profile


@router.delete("/profiles/{profile_id}", status_code=204)
async def delete_profile(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")

    voice_dir = get_voice_dir(user.id, str(profile_id))
    if os.path.exists(voice_dir):
        import shutil
        shutil.rmtree(voice_dir)

    await db.delete(profile)
    await db.commit()


@router.post("/profiles/{profile_id}/samples", status_code=201)
async def upload_samples(
    profile_id: UUID,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")

    voice_dir = get_voice_dir(user.id, str(profile_id))
    samples_created = 0

    for file in files:
        filename = file.filename or "sample.wav"
        ext = os.path.splitext(filename.lower())[1]
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(400, f"Unsupported audio format: {filename}")

        content = await file.read()
        if len(content) > MAX_SAMPLE_SIZE:
            raise HTTPException(400, f"File too large: {filename} (max 50MB)")
        if len(content) == 0:
            raise HTTPException(400, f"Empty file: {filename}")

        stored_name = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(voice_dir, stored_name)
        with open(filepath, "wb") as f:
            f.write(content)

        # Rough duration estimate based on file size (16kHz * 2 bytes per sample * 2 channels ~ 64KB/sec)
        # Better duration detection happens later in the preview/synthesis
        estimated_duration = max(1.0, len(content) / 64000.0)

        sample = VoiceSample(profile_id=str(profile_id), file_path=filepath, duration_seconds=estimated_duration)
        db.add(sample)
        samples_created += 1

    profile.sample_count = (profile.sample_count or 0) + samples_created
    profile.status = VoiceProfileStatus.creating
    profile.error_message = None
    await db.commit()
    await db.refresh(profile)

    # Trigger background embedding extraction
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, lambda: extract_embedding_background(str(profile_id), str(user.id)))

    return {
        "id": str(profile.id),
        "name": profile.name,
        "status": profile.status.value,
        "sample_count": profile.sample_count,
        "uploaded": samples_created,
    }


@router.post("/profiles/{profile_id}/retry", status_code=200)
async def retry_extraction(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")

    if profile.sample_count == 0:
        raise HTTPException(400, "No audio samples uploaded")

    profile.status = VoiceProfileStatus.creating
    profile.error_message = None
    await db.commit()

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, lambda: extract_embedding_background(str(profile_id), str(user.id)))
    return {"message": "Embedding extraction restarted"}


@router.get("/profiles/{profile_id}/preview")
async def preview_voice(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Synthesize a test phrase with the cloned voice and return audio."""
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")
    if profile.status != VoiceProfileStatus.ready or not profile.embedding_path:
        raise HTTPException(400, "Voice profile not ready yet")

    from app.tts.registry import get_provider

    provider = get_provider("vox_clone")
    if not provider:
        raise HTTPException(500, "VoxClone provider not loaded")

    try:
        audio_bytes = await provider.synthesize(
            "This is a test of the cloned voice profile.",
            voice_profile_id=str(profile_id),
        )
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(500, f"Preview failed: {e}")
