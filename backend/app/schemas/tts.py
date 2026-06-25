from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.models.custom_tts import ProviderType


class TTSProviderOut(BaseModel):
    id: str
    name: str
    provider_type: Optional[str] = None

    class Config:
        from_attributes = True


class CustomTTSCreate(BaseModel):
    name: str
    provider_type: ProviderType
    config: str  # JSON


class CustomTTSUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[str] = None
    is_active: Optional[bool] = None


class CustomTTSOut(BaseModel):
    id: UUID
    name: str
    provider_type: str
    config: str
    is_active: bool

    class Config:
        from_attributes = True
