from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class BookmarkOut(BaseModel):
    id: UUID
    book_id: UUID
    chapter_id: UUID
    position_seconds: int
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BookmarkCreate(BaseModel):
    chapter_id: str
    position_seconds: int = 0
    note: Optional[str] = None
