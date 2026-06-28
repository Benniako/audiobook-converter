from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class VoiceProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None


class VoiceSampleOut(BaseModel):
    id: UUID
    file_path: str
    duration_seconds: float
    created_at: datetime

    model_config = {"from_attributes": True}


class VoiceProfileOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    status: str
    sample_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VoiceProfileDetailOut(VoiceProfileOut):
    audio_samples: list[VoiceSampleOut] = []


class VoiceSampleOut(BaseModel):
    id: UUID
    file_path: str
    duration_seconds: float
    created_at: datetime

    model_config = {"from_attributes": True}
