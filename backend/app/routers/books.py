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
from app.schemas.book import BookOut, BookDetailOut, PlaybackSpeedUpdate
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
    book = await get_book_detail(db, str(book_id), current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.delete("/{book_id}", status_code=204)
async def remove_book(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, str(book_id), current_user.id)
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
    book = await get_book_detail(db, str(book_id), current_user.id)
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


@router.post("/{book_id}/chapters/{chapter_id}/split", status_code=200)
async def split_chapter(
    book_id: UUID,
    chapter_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, str(book_id), current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    at_position = data.get("at_position", 0)

    result = await db.execute(
        select(Chapter).where(Chapter.id == str(chapter_id), Chapter.book_id == str(book_id))
    )
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    if at_position <= 0 or at_position >= len(chapter.text):
        raise HTTPException(status_code=400, detail="Invalid split position")

    new_chapter = Chapter(
        book_id=str(book_id),
        index=chapter.index + 1,
        title=f"{chapter.title} (cont.)",
        text=chapter.text[at_position:],
    )
    chapter.text = chapter.text[:at_position]

    result = await db.execute(
        select(Chapter).where(
            Chapter.book_id == str(book_id),
            Chapter.index > chapter.index,
        ).order_by(Chapter.index.desc())
    )
    for later_ch in result.scalars().all():
        later_ch.index += 1

    db.add(new_chapter)
    await db.flush()
    await db.refresh(new_chapter)
    return {"message": "Chapter split", "new_chapter_id": str(new_chapter.id)}


@router.post("/{book_id}/chapters/{chapter_id}/merge", status_code=200)
async def merge_chapters(
    book_id: UUID,
    chapter_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, str(book_id), current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    result = await db.execute(
        select(Chapter).where(Chapter.id == str(chapter_id), Chapter.book_id == str(book_id))
    )
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    result = await db.execute(
        select(Chapter).where(
            Chapter.book_id == str(book_id),
            Chapter.index == chapter.index + 1,
        )
    )
    next_chapter = result.scalar_one_or_none()
    if not next_chapter:
        raise HTTPException(status_code=400, detail="No next chapter to merge with")

    chapter.text += "\n\n" + next_chapter.text
    await db.delete(next_chapter)

    result = await db.execute(
        select(Chapter).where(
            Chapter.book_id == str(book_id),
            Chapter.index > chapter.index,
        ).order_by(Chapter.index)
    )
    for later_ch in result.scalars().all():
        later_ch.index -= 1

    await db.flush()
    return {"message": "Chapters merged"}


@router.put("/{book_id}/chapters/reorder", status_code=200)
async def reorder_chapters(
    book_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, str(book_id), current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    chapter_ids = data.get("chapter_ids", [])
    if not chapter_ids:
        raise HTTPException(status_code=400, detail="chapter_ids is required")

    # Fetch all chapters for this book
    result = await db.execute(
        select(Chapter).where(Chapter.book_id == str(book_id)).order_by(Chapter.index)
    )
    existing = result.scalars().all()
    existing_map = {str(ch.id): ch for ch in existing}

    # Validate all IDs exist
    for cid in chapter_ids:
        if cid not in existing_map:
            raise HTTPException(status_code=400, detail=f"Chapter {cid} not found")

    # Update indices
    for i, cid in enumerate(chapter_ids):
        existing_map[cid].index = i
    await db.flush()
    return {"message": "Chapters reordered"}


@router.patch("/{book_id}/speed", response_model=BookOut)
async def update_playback_speed(
    book_id: UUID,
    data: PlaybackSpeedUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, str(book_id), current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    speed = max(0.25, min(3.0, data.speed))  # Clamp between 0.25x and 3.0x
    book.playback_speed = speed
    await db.flush()
    await db.refresh(book)
    return book


@router.get("/{book_id}/download")
async def download_audiobook(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, str(book_id), current_user.id)
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
