import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VoiceProfileStatus(str, enum.Enum):
    creating = "creating"
    ready = "ready"
    error = "error"


class VoiceProfile(Base):
    __tablename__ = "voice_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[VoiceProfileStatus] = mapped_column(SAEnum(VoiceProfileStatus), default=VoiceProfileStatus.creating)
    embedding_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sample_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    audio_samples: Mapped[list["VoiceSample"]] = relationship(back_populates="profile", cascade="all, delete-orphan")


class VoiceSample(Base):
    __tablename__ = "voice_samples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("voice_profiles.id", ondelete="CASCADE"), index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    profile: Mapped["VoiceProfile"] = relationship(back_populates="audio_samples")
