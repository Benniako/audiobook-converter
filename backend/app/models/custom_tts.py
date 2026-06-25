import uuid
from datetime import datetime
from sqlalchemy import String, Text, Enum as SAEnum, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class ProviderType(str, enum.Enum):
    script = "script"
    cli = "cli"
    http = "http"
    local_model = "local_model"


class CustomTTSProvider(Base):
    __tablename__ = "custom_tts_providers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_type: Mapped[ProviderType] = mapped_column(SAEnum(ProviderType), nullable=False)
    config: Mapped[str] = mapped_column(Text, nullable=False)  # JSON blob with provider-specific config
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
