import asyncio
import os
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session as SyncSession
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.book import Book, BookStatus, TTSProvider as TTSProviderEnum
from app.models.chapter import Chapter
from app.models.conversion_job import ConversionJob, JobStatus
from app.schemas.book import ConversionStatusOut, ConversionStatusDetailedOut
from app.tts.registry import get_provider, init_providers
from app.services.ebook_parser import parse_ebook
from app.services.audio_assembler import assemble_audiobook
from app.services.email_service import send_conversion_notification
from app.config import get_settings
from workers.tts_worker import convert_book

logger = logging.getLogger(__name__)
settings = get_settings()
sync_engine = create_engine(settings.database_url_sync)


def run_conversion_sync(book_id: str):
    """Run conversion synchronously (no Celery) for local dev."""
    init_providers()
    session = SyncSession(sync_engine)
    try:
        book = session.execute(select(Book).where(Book.id == book_id)).scalar_one()
        job = book.conversion_job
        if not job:
            raise RuntimeError("No conversion job found")

        # 1. Parse ebook
        job.status = JobStatus.parsing
        job.progress = 0.05
        session.commit()

        file_path = book.original_file
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        chapters_data = parse_ebook(file_path)
        total = len(chapters_data)
        if total == 0:
            raise ValueError("No chapters found in ebook")

        for i, (title, text) in enumerate(chapters_data):
            chapter = Chapter(book_id=book.id, index=i, title=title[:500], text=text)
            session.add(chapter)
        session.commit()

        # 2. Synthesize
        job.status = JobStatus.synthesizing
        session.commit()

        provider = get_provider(book.tts_provider.value)
        if not provider:
            raise ValueError(f"TTS provider '{book.tts_provider}' not available")

        audio_dir = os.path.join(settings.audio_output_dir, str(book.id))
        os.makedirs(audio_dir, exist_ok=True)

        chapters = session.execute(
            select(Chapter).where(Chapter.book_id == book.id).order_by(Chapter.index)
        ).scalars().all()

        total_duration = 0
        for idx, chapter in enumerate(chapters):
            job.progress = 0.1 + (idx / total) * 0.8
            session.commit()

            audio_bytes = asyncio.run(provider.synthesize(chapter.text, voice_profile_id=job.voice_profile_id))
            chapter_path = os.path.join(audio_dir, f"chapter_{chapter.index:04d}.wav")
            with open(chapter_path, "wb") as f:
                f.write(audio_bytes)

            chapter.audio_path = chapter_path
            chapter.duration_seconds = max(1, len(chapter.text) // 16)
            total_duration += chapter.duration_seconds
            session.commit()

        # 3. Assemble (skip if ffmpeg missing — chapter files still available)
        try:
            job.status = JobStatus.assembling
            job.progress = 0.95
            session.commit()

            output_path = os.path.join(audio_dir, "audiobook.m4b")
            assemble_audiobook(audio_dir, output_path, chapters)
        except (FileNotFoundError, RuntimeError) as e:
            logger.warning("Assembly skipped (ffmpeg not available?): %s", e)

        book.duration_seconds = total_duration
        book.status = BookStatus.ready
        job.status = JobStatus.done
        job.progress = 1.0
        session.commit()

        # Send notification
        user = session.execute(select(User).where(User.id == book.user_id)).scalar_one()
        asyncio.run(send_conversion_notification(user.email, book.title, "done", str(book.id)))
        logger.info("Conversion completed for book %s", book_id)

    except Exception as exc:
        session.rollback()
        book = session.execute(select(Book).where(Book.id == book_id)).scalar_one()
        if book:
            book.status = BookStatus.error
            job = book.conversion_job
            if job:
                job.status = JobStatus.failed
                job.error_message = str(exc)
            session.commit()
            try:
                user = session.execute(select(User).where(User.id == book.user_id)).scalar_one()
                asyncio.run(send_conversion_notification(user.email, book.title, "failed", str(book.id), error=str(exc)))
            except Exception:
                pass
        logger.error("Conversion failed for book %s: %s", book_id, exc)
        raise
    finally:
        session.close()

router = APIRouter(prefix="/api/books", tags=["conversion"])


@router.post("/{book_id}/convert")
async def start_conversion(
    book_id: UUID,
    tts_provider: str = "kokoro",
    language: str = "en",
    target_language: str | None = None,
    voice_profile_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == str(book_id), Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Validate TTS provider
    provider = get_provider(tts_provider)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unknown TTS provider: {tts_provider}")

    # Update book with selected provider and language settings
    book.tts_provider = TTSProviderEnum(tts_provider)
    book.language = language
    book.target_language = target_language
    book.status = "processing"

    # Create or update conversion job
    existing_job = await db.execute(
        select(ConversionJob).where(ConversionJob.book_id == str(book_id))
    )
    job = existing_job.scalar_one_or_none()
    if not job:
        job = ConversionJob(book_id=str(book_id), status=JobStatus.queued)
        db.add(job)
    else:
        job.status = JobStatus.queued
        job.progress = 0.0
        job.error_message = None

    await db.flush()

    # Save voice_profile_id if provided
    if voice_profile_id:
        job.voice_profile_id = voice_profile_id
        await db.flush()

    # If Redis/Celery is configured, dispatch via Celery; otherwise run inline
    if settings.redis_url:
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, lambda: convert_book.delay(str(book_id)))
        logger.info("Dispatched via Celery for book %s", book_id)
    else:
        logger.warning("No Redis — running conversion inline for book %s", book_id)
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, lambda: run_conversion_sync(str(book_id)))

    return {"message": "Conversion started", "book_id": str(book_id)}


@router.get("/{book_id}/status", response_model=ConversionStatusOut)
async def get_conversion_status(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == str(book_id), Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    job_result = await db.execute(
        select(ConversionJob).where(ConversionJob.book_id == str(book_id))
    )
    job = job_result.scalar_one_or_none()

    if not job:
        return ConversionStatusDetailedOut(status="unknown", progress=0.0, error_message=None)

    # Calculate queue position
    queue_position = 0
    if job.status.value == "queued":
        queue_result = await db.execute(
            select(ConversionJob).where(
                ConversionJob.status == "queued",
                ConversionJob.created_at < job.created_at,
            )
        )
        queue_position = len(queue_result.scalars().all()) + 1

    # Compute estimated remaining seconds
    estimated_remaining = None
    if job.progress > 0.05 and job.status.value not in ("done", "failed"):
        elapsed = (datetime.now(timezone.utc) - (job.updated_at or job.created_at)).total_seconds()
        if elapsed > 5 and job.progress < 1.0:
            rate = job.progress / elapsed
            estimated_remaining = max(1, int((1.0 - job.progress) / rate)) if rate > 0 else None

    return ConversionStatusDetailedOut(
        status=job.status.value,
        progress=job.progress,
        error_message=job.error_message,
        queue_position=queue_position,
        estimated_remaining_seconds=estimated_remaining,
    )
