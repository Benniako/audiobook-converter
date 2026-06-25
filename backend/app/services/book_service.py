import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.models.book import Book, BookStatus
from app.models.chapter import Chapter
from app.models.user import User

settings = get_settings()
ALLOWED_EXTENSIONS = {".epub", ".pdf", ".txt"}


async def save_upload_file(file: UploadFile, user_id: uuid.UUID) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}. Supported: {', '.join(ALLOWED_EXTENSIONS)}")

    user_dir = os.path.join(settings.upload_dir, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    file_id = uuid.uuid4()
    dest_path = os.path.join(user_dir, f"{file_id}{ext}")
    async with aiofiles.open(dest_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    return dest_path


async def get_user_books(db: AsyncSession, user_id: uuid.UUID) -> list[Book]:
    result = await db.execute(
        select(Book).where(Book.user_id == user_id).order_by(Book.created_at.desc())
    )
    return list(result.scalars().all())


async def get_book_detail(db: AsyncSession, book_id: uuid.UUID, user_id: uuid.UUID) -> Book | None:
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def delete_book(book: Book) -> None:
    if book.original_file and os.path.exists(book.original_file):
        os.remove(book.original_file)
    for chapter in book.chapters:
        if chapter.audio_path and os.path.exists(chapter.audio_path):
            os.remove(chapter.audio_path)
