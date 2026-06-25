import uuid
from datetime import datetime
from sqlalchemy import String, Enum as SAEnum, DateTime, func, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
import enum


class BookStatus(str, enum.Enum):
    uploading = "uploading"
    processing = "processing"
    ready = "ready"
    error = "error"


class TTSProvider(str, enum.Enum):
    kokoro = "kokoro"
    chatterbox = "chatterbox"
    qwen3 = "qwen3"
    omnivoice = "omnivoice"
    styletts2 = "styletts2"
    bark = "bark"
    cosyvoice = "cosyvoice"
    openai = "openai"
    elevenlabs = "elevenlabs"
    custom = "custom"


class Book(Base):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    author: Mapped[str] = mapped_column(String(500), default="Unknown")
    cover_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    status: Mapped[BookStatus] = mapped_column(SAEnum(BookStatus), default=BookStatus.uploading)
    original_file: Mapped[str] = mapped_column(String(1000), nullable=False)
    tts_provider: Mapped[TTSProvider] = mapped_column(SAEnum(TTSProvider), default=TTSProvider.kokoro)
    tts_provider_id: Mapped[str] = mapped_column(String(100), nullable=True)  # FK to custom_tts if custom
    language: Mapped[str] = mapped_column(String(10), default="en")  # ISO 639-1 source language
    target_language: Mapped[str] = mapped_column(String(10), nullable=True)  # ISO 639-1 translation target, null = no translation
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="books")
    chapters = relationship("Chapter", back_populates="book", cascade="all, delete-orphan", order_by="Chapter.index")
    conversion_job = relationship("ConversionJob", back_populates="book", uselist=False, cascade="all, delete-orphan")
