import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.book import Book
from app.models.chapter import Chapter
from app.schemas.book import BookOut, BookDetailOut
from app.services.book_service import save_upload_file, get_user_books, get_book_detail, delete_book
from app.config import get_settings

router = APIRouter(prefix="/api/books", tags=["books"])


@router.post("/upload", response_model=BookOut, status_code=201)
async def upload_book(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_path = await save_upload_file(file, current_user.id)
    book = Book(
        user_id=current_user.id,
        title=file.filename or "Untitled",
        original_file=file_path,
        status="uploading",
    )
    db.add(book)
    await db.flush()
    await db.refresh(book)
    return book


@router.get("/", response_model=list[BookOut])
async def list_books(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_user_books(db, current_user.id)


@router.get("/{book_id}", response_model=BookDetailOut)
async def get_book(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.delete("/{book_id}", status_code=204)
async def remove_book(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    await delete_book(book)
    await db.delete(book)


@router.get("/{book_id}/chapters/{chapter_id}/audio")
async def stream_chapter_audio(
    book_id: UUID,
    chapter_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    result = await db.execute(
        select(Chapter).where(Chapter.id == chapter_id, Chapter.book_id == book_id)
    )
    chapter = result.scalar_one_or_none()
    if not chapter or not chapter.audio_path:
        raise HTTPException(status_code=404, detail="Chapter audio not available")

    return FileResponse(
        chapter.audio_path,
        media_type="audio/wav",
        filename=f"chapter_{chapter.index}.wav",
    )


@router.get("/{book_id}/download")
async def download_audiobook(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    audio_dir = os.path.join(get_settings().audio_output_dir, str(book.id))
    m4b_path = os.path.join(audio_dir, "audiobook.m4b")
    mp3_path = os.path.join(audio_dir, "audiobook.mp3")

    if os.path.exists(m4b_path):
        return FileResponse(m4b_path, media_type="audio/mp4", filename=f"{book.title}.m4b")
    elif os.path.exists(mp3_path):
        return FileResponse(mp3_path, media_type="audio/mpeg", filename=f"{book.title}.mp3")
    else:
        raise HTTPException(status_code=404, detail="Audiobook not yet ready")
