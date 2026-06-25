from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.book import Book, TTSProvider as TTSProviderEnum
from app.models.conversion_job import ConversionJob, JobStatus
from app.schemas.book import ConversionStatusOut
from app.tts.registry import get_provider
from workers.tts_worker import convert_book

router = APIRouter(prefix="/api/books", tags=["conversion"])


@router.post("/{book_id}/convert")
async def start_conversion(
    book_id: UUID,
    tts_provider: str = "kokoro",
    language: str = "en",
    target_language: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
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
        select(ConversionJob).where(ConversionJob.book_id == book_id)
    )
    job = existing_job.scalar_one_or_none()
    if not job:
        job = ConversionJob(book_id=book_id, status=JobStatus.queued)
        db.add(job)
    else:
        job.status = JobStatus.queued
        job.progress = 0.0
        job.error_message = None

    await db.flush()

    # Dispatch Celery task
    convert_book.delay(str(book_id))

    return {"message": "Conversion started", "book_id": str(book_id)}


@router.get("/{book_id}/status", response_model=ConversionStatusOut)
async def get_conversion_status(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    job_result = await db.execute(
        select(ConversionJob).where(ConversionJob.book_id == book_id)
    )
    job = job_result.scalar_one_or_none()

    if not job:
        return ConversionStatusOut(status="unknown", progress=0.0)

    return ConversionStatusOut(
        status=job.status.value,
        progress=job.progress,
        error_message=job.error_message,
    )
