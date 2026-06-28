import os
import json
import asyncio
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.book import Book, BookStatus
from app.models.user import User
from app.models.chapter import Chapter
from app.models.conversion_job import ConversionJob, JobStatus
from app.services.ebook_parser import parse_ebook
from app.services.audio_assembler import assemble_audiobook
from app.tts.registry import get_provider, init_providers
from app.services.email_service import send_conversion_notification
from workers.celery_app import celery_app

settings = get_settings()
sync_engine = create_engine(settings.database_url_sync)


@celery_app.task(bind=True, max_retries=1)
def convert_book(self, book_id: str):
    """Main conversion task: parse -> synthesize -> assemble."""
    init_providers()  # Ensure TTS providers are registered
    session = Session(sync_engine)
    try:
        book = session.execute(select(Book).where(Book.id == book_id)).scalar_one()
        job = book.conversion_job

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

        # Store extracted chapters
        for i, (title, text) in enumerate(chapters_data):
            chapter = Chapter(
                book_id=book.id,
                index=i,
                title=title[:500],
                text=text,
            )
            session.add(chapter)
        session.commit()

        # 1b. Translate chapters if target language specified
        if book.target_language and book.target_language != book.language:
            job.status = JobStatus.parsing
            job.progress = 0.08
            session.commit()

            from app.services.translation_service import TranslationService
            translator = TranslationService()

            chapters = session.execute(
                select(Chapter).where(Chapter.book_id == book.id).order_by(Chapter.index)
            ).scalars().all()

            for idx, chapter in enumerate(chapters):
                job.progress = 0.08 + (idx / total) * 0.07
                session.commit()
                translated = asyncio.run(translator.translate(chapter.text, book.language, book.target_language))
                chapter.text = translated
                translated_title = asyncio.run(translator.translate(chapter.title, book.language, book.target_language))
                chapter.title = translated_title[:500]
            session.commit()

        # 2. Synthesize each chapter
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

            provider_kwargs = {}
            if job and job.voice_profile_id:
                provider_kwargs["voice_profile_id"] = job.voice_profile_id
            audio_bytes = asyncio.run(provider.synthesize(chapter.text, **provider_kwargs))
            chapter_path = os.path.join(audio_dir, f"chapter_{chapter.index:04d}.wav")
            with open(chapter_path, "wb") as f:
                f.write(audio_bytes)

            chapter.audio_path = chapter_path
            # Estimate duration: ~60ms per character at 1x speed
            chapter.duration_seconds = max(1, len(chapter.text) // 16)
            total_duration += chapter.duration_seconds
            session.commit()

        # 3. Assemble final audiobook
        job.status = JobStatus.assembling
        job.progress = 0.95
        session.commit()

        output_path = os.path.join(audio_dir, "audiobook.m4b")
        assemble_audiobook(audio_dir, output_path, chapters)

        book.duration_seconds = total_duration
        book.status = BookStatus.ready
        job.status = JobStatus.done
        job.progress = 1.0
        session.commit()

        # Send success email
        user = session.execute(select(User).where(User.id == book.user_id)).scalar_one()
        asyncio.run(send_conversion_notification(user.email, book.title, "done", str(book.id)))

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

            # Send failure email
            user = session.execute(select(User).where(User.id == book.user_id)).scalar_one()
            try:
                asyncio.run(send_conversion_notification(user.email, book.title, "failed", str(book.id), error=str(exc)))
            except Exception:
                pass
        raise exc
    finally:
        session.close()
