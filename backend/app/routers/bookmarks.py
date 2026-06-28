from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.book import Book
from app.models.bookmark import Bookmark
from app.schemas.bookmark import BookmarkOut, BookmarkCreate

router = APIRouter(prefix="/api/books/{book_id}/bookmarks", tags=["bookmarks"])


@router.get("", response_model=list[BookmarkOut])
async def list_bookmarks(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bookmark).where(
            Bookmark.book_id == str(book_id),
            Bookmark.user_id == current_user.id,
        ).order_by(Bookmark.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=BookmarkOut, status_code=status.HTTP_201_CREATED)
async def create_bookmark(
    book_id: UUID,
    data: BookmarkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the book belongs to the user
    result = await db.execute(
        select(Book).where(Book.id == str(book_id), Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    bookmark = Bookmark(
        user_id=current_user.id,
        book_id=str(book_id),
        chapter_id=data.chapter_id,
        position_seconds=data.position_seconds,
        note=data.note,
    )
    db.add(bookmark)
    await db.flush()
    await db.refresh(bookmark)
    return bookmark


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    book_id: UUID,
    bookmark_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bookmark).where(
            Bookmark.id == str(bookmark_id),
            Bookmark.book_id == str(book_id),
            Bookmark.user_id == current_user.id,
        )
    )
    bookmark = result.scalar_one_or_none()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    await db.delete(bookmark)
