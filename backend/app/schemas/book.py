from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class BookOut(BaseModel):
    id: UUID
    title: str
    author: str
    cover_url: Optional[str]
    status: str
    tts_provider: str
    language: str = "en"
    target_language: Optional[str] = None
    duration_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChapterOut(BaseModel):
    id: UUID
    index: int
    title: str
    audio_path: Optional[str]
    duration_seconds: int

    class Config:
        from_attributes = True


class BookDetailOut(BookOut):
    chapters: list[ChapterOut] = []


class ConversionStatusOut(BaseModel):
    status: str
    progress: float
    error_message: Optional[str]
