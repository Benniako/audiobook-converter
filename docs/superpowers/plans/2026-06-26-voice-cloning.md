# Voice Cloning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add voice cloning via local HuggingFace XTTS-v2 model — users upload audio samples, get a cloned voice profile, and use it in book conversions.

**Architecture:** New `VoiceProfile` + `VoiceSample` SQLAlchemy models, new `/api/voices/` router with CRUD + upload endpoints, new `VoxCloneProvider` that wraps Coqui XTTS-v2 for embedding extraction and synthesis, frontend `/voices` pages for management and voice selection during upload.

**Tech Stack:** Coqui TTS/XTTS-v2 (HuggingFace), FastAPI, SQLAlchemy, Next.js 14

---

## File Structure

### Backend — New Files
- `backend/app/models/voice_profile.py` — VoiceProfile + VoiceSample models
- `backend/app/schemas/voice.py` — Pydantic request/response schemas
- `backend/app/routers/voices.py` — CRUD + upload + preview endpoints
- `backend/app/tts/vox_clone.py` — VoxCloneProvider (XTTS wrapping)

### Backend — Modified Files
- `backend/app/models/__init__.py` — export new models
- `backend/app/schemas/__init__.py` — export new schemas
- `backend/app/main.py` — register voices router
- `backend/app/routers/conversion.py` — accept voice_profile_id param
- `backend/workers/tts_worker.py` — handle voice_profile_id during synthesis
- `backend/requirements.txt` — add `TTS`

### Frontend — New Files
- `frontend/app/voices/page.tsx` — voice profile list page
- `frontend/app/voices/VoicesClient.tsx` — voice management client component
- `frontend/app/voices/[id]/page.tsx` — profile detail page
- `frontend/app/voices/[id]/VoiceProfileClient.tsx` — upload samples, preview
- `frontend/components/VoiceSelector.tsx` — dropdown for voice selection in upload form
- `frontend/components/VoiceSampleUploader.tsx` — audio upload zone for voice samples

### Frontend — Modified Files
- `frontend/lib/api.ts` — add voice API methods
- `frontend/app/upload/UploadClient.tsx` — integrate VoiceSelector
- `frontend/app/dashboard/DashboardClient.tsx` — add voices link in header

---

## Phase 1: Backend Models & Schemas

### Task 1: VoiceProfile + VoiceSample SQLAlchemy Models

**Files:**
- Create: `backend/app/models/voice_profile.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create voice_profile.py**

```python
import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID as GUID
from app.database import Base


class VoiceProfileStatus(str, enum.Enum):
    creating = "creating"
    ready = "ready"
    error = "error"


class VoiceProfile(Base):
    __tablename__ = "voice_profiles"

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[GUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
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

    id: Mapped[GUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[GUID] = mapped_column(ForeignKey("voice_profiles.id", ondelete="CASCADE"), index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    profile: Mapped["VoiceProfile"] = relationship(back_populates="audio_samples")
```

- [ ] **Step 2: Export new models in `__init__.py`**

Replace `__all__` line with:
```python
from app.models.voice_profile import VoiceProfile, VoiceSample, VoiceProfileStatus

__all__ = ["User", "Book", "Chapter", "ConversionJob", "CustomTTSProvider", "Bookmark", "VoiceProfile", "VoiceSample", "VoiceProfileStatus"]
```

- [ ] **Step 3: Add voice_profile_id FK to ConversionJob model**

Read `backend/app/models/conversion_job.py` and add:
```python
voice_profile_id: Mapped[UUID | None] = mapped_column(ForeignKey("voice_profiles.id", ondelete="SET NULL"), nullable=True)
```
Add the import and field. Keep existing fields.

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add VoiceProfile and VoiceSample models"
```

---

### Task 2: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/voice.py`
- Modify: `backend/app/schemas/__init__.py`

- [ ] **Step 1: Create voice.py**

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class VoiceProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None


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
    audio_samples: list["VoiceSampleOut"] = []


class VoiceSampleOut(BaseModel):
    id: UUID
    file_path: str
    duration_seconds: float
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: add voice profile pydantic schemas"
```

---

## Phase 2: Backend API Routes

### Task 3: Voice CRUD + Upload Router

**Files:**
- Create: `backend/app/routers/voices.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create voices.py router**

```python
import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.voice_profile import VoiceProfile, VoiceSample, VoiceProfileStatus
from app.schemas.voice import VoiceProfileCreate, VoiceProfileOut, VoiceProfileDetailOut, VoiceSampleOut
from app.config import get_settings
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voices", tags=["voices"])
settings = get_settings()

ALLOWED_AUDIO_TYPES = {"audio/wav", "audio/mpeg", "audio/mp4", "audio/x-wav", "audio/x-m4a", "audio/ogg"}
MAX_SAMPLE_SIZE = 50 * 1024 * 1024  # 50MB


def get_voice_dir(user_id: UUID, profile_id: UUID) -> str:
    """Get or create directory for voice profile samples and embeddings."""
    base = os.path.join(settings.upload_dir, "voices", str(user_id), str(profile_id))
    os.makedirs(base, exist_ok=True)
    return base


@router.post("/profiles", response_model=VoiceProfileOut, status_code=201)
async def create_profile(
    data: VoiceProfileCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    profile = VoiceProfile(user_id=user.id, name=data.name, description=data.description)
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return profile


@router.get("/profiles", response_model=list[VoiceProfileOut])
async def list_profiles(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.user_id == user.id).order_by(VoiceProfile.created_at.desc())
    )
    return result.scalars().all()


@router.get("/profiles/{profile_id}", response_model=VoiceProfileDetailOut)
async def get_profile(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")
    return profile


@router.delete("/profiles/{profile_id}", status_code=204)
async def delete_profile(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")

    # Delete files on disk
    voice_dir = get_voice_dir(user.id, profile_id)
    if os.path.exists(voice_dir):
        import shutil
        shutil.rmtree(voice_dir)

    await db.delete(profile)
    await db.commit()


@router.post("/profiles/{profile_id}/samples", status_code=201)
async def upload_samples(
    profile_id: UUID,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")

    voice_dir = get_voice_dir(user.id, profile_id)
    samples = []

    for file in files:
        if file.content_type not in ALLOWED_AUDIO_TYPES and not file.filename.lower().endswith((".wav", ".mp3", ".m4a", ".ogg")):
            raise HTTPException(400, f"Unsupported audio format: {file.filename}")

        content = await file.read()
        if len(content) > MAX_SAMPLE_SIZE:
            raise HTTPException(400, f"File too large: {file.filename}")

        # Save file
        ext = os.path.splitext(file.filename)[1] or ".wav"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(voice_dir, filename)
        with open(filepath, "wb") as f:
            f.write(content)

        # Detect duration (rough estimate — we can get precise later)
        duration = len(content) / (16000 * 2 * 2)  # rough: bytes / (sample_rate * bytes_per_sample * channels)

        sample = VoiceSample(profile_id=profile_id, file_path=filepath, duration_seconds=max(1.0, duration))
        samples.append(sample)
        db.add(sample)

    profile.sample_count = (profile.sample_count or 0) + len(samples)
    profile.status = VoiceProfileStatus.creating
    await db.commit()

    # Trigger embedding extraction in background
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, lambda: extract_embedding(str(profile_id), str(user.id)))

    # Refresh to get samples
    await db.refresh(profile)
    return profile


def extract_embedding(profile_id: str, user_id: str):
    """Background task: extract speaker embedding from uploaded samples."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session as SyncSession
    from app.config import get_settings
    from app.tts.registry import get_provider

    settings = get_settings()
    engine = create_engine(settings.database_url_sync)
    session = SyncSession(engine)
    try:
        # We'll implement the actual embedding extraction after VoxCloneProvider is built
        # For now, just mark as error so user knows embedding isn't ready
        profile = session.execute(
            select(VoiceProfile).where(VoiceProfile.id == profile_id)
        ).scalar_one()
        provider = get_provider("vox_clone")
        if not provider or not hasattr(provider, "extract_embedding"):
            profile.status = VoiceProfileStatus.error
            profile.error_message = "VoxClone provider not available"
            session.commit()
            return

        samples = session.execute(
            select(VoiceSample).where(VoiceSample.profile_id == profile_id)
        ).scalars().all()

        audio_paths = [s.file_path for s in samples]
        embedding_path = provider.extract_embedding(audio_paths, profile_id, user_id)
        profile.embedding_path = embedding_path
        profile.status = VoiceProfileStatus.ready
        session.commit()
    except Exception as e:
        session.rollback()
        profile = session.execute(
            select(VoiceProfile).where(VoiceProfile.id == profile_id)
        ).scalar_one()
        if profile:
            profile.status = VoiceProfileStatus.error
            profile.error_message = str(e)
            session.commit()
        logger.error("Embedding extraction failed for %s: %s", profile_id, e)
    finally:
        session.close()


@router.post("/profiles/{profile_id}/retry", status_code=200)
async def retry_extraction(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")

    if profile.sample_count == 0:
        raise HTTPException(400, "No audio samples uploaded")

    profile.status = VoiceProfileStatus.creating
    profile.error_message = None
    await db.commit()

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, lambda: extract_embedding(str(profile_id), str(user.id)))
    return {"message": "Embedding extraction restarted"}


@router.get("/profiles/{profile_id}/preview")
async def preview_voice(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Synthesize a test phrase with the cloned voice and return audio."""
    result = await db.execute(
        select(VoiceProfile).where(VoiceProfile.id == profile_id, VoiceProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Voice profile not found")
    if profile.status != VoiceProfileStatus.ready or not profile.embedding_path:
        raise HTTPException(400, "Voice profile not ready yet")

    from fastapi.responses import Response
    from app.tts.registry import get_provider

    provider = get_provider("vox_clone")
    if not provider:
        raise HTTPException(500, "VoxClone provider not loaded")

    try:
        audio_bytes = await provider.synthesize(
            "This is a test of the cloned voice profile.",
            voice_profile_id=str(profile_id),
        )
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(500, f"Preview failed: {e}")
```

- [ ] **Step 2: Register router in main.py**

After line 39 (`app.include_router(bookmarks.router)`), add:
```python
from app.routers import voices as voices_router
app.include_router(voices_router.router)
```

Add `voices` to the import on line 6:
```python
from app.routers import auth, books, tts, conversion, admin, languages, bookmarks, voices
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/voices.py backend/app/main.py
git commit -m "feat: add voice profile CRUD and upload API endpoints"
```

---

## Phase 3: VoxCloneProvider

### Task 4: XTTS-based TTS Provider

**Files:**
- Create: `backend/app/tts/vox_clone.py`
- Modify: `backend/app/tts/registry.py`
- Modify: `backend/app/tts/__init__.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Create vox_clone.py**

```python
import os
import numpy as np
import logging
from typing import Optional
from app.tts.base import TTSProvider
from app.config import get_settings

logger = logging.getLogger(__name__)


class VoxCloneProvider(TTSProvider):
    """Voice cloning provider using Coqui XTTS-v2 from HuggingFace.

    Loads the model once (singleton), extracts speaker embeddings from
    uploaded audio, and synthesizes speech using those embeddings.
    """

    def __init__(self):
        self._model = None
        self._model_id = "coqui/XTTS-v2"
        self._loaded = False

    @property
    def model(self):
        if not self._loaded:
            self._load_model()
        return self._model

    def _load_model(self):
        """Lazy-load the XTTS model on first use."""
        try:
            from TTS.api import TTS
            logger.info("Loading XTTS-v2 model from HuggingFace (this may take a moment)...")
            self._model = TTS(self._model_id, gpu=False)
            self._loaded = True
            logger.info("XTTS-v2 model loaded successfully")
        except Exception as e:
            logger.error("Failed to load XTTS model: %s", e)
            raise RuntimeError(f"XTTS model load failed: {e}")

    def extract_embedding(self, audio_paths: list[str], profile_id: str, user_id: str) -> str:
        """Extract speaker embedding from audio samples, save to disk.

        Returns the path to the saved .npy embedding file.
        """
        m = self.model
        if not audio_paths:
            raise ValueError("No audio samples provided")

        # Use the first audio clip to compute a speaker embedding
        # XTTS computes embedding via speaker encoder
        primary_audio = audio_paths[0]

        # Compute the speaker latent using XTTS
        embedding = m.speaker_encoder.compute_embedding(primary_audio)
        embedding_np = embedding.cpu().detach().numpy()

        # Save to disk
        settings = get_settings()
        embed_dir = os.path.join(settings.upload_dir, "voices", user_id, profile_id)
        os.makedirs(embed_dir, exist_ok=True)
        embed_path = os.path.join(embed_dir, "speaker_embedding.npy")
        np.save(embed_path, embedding_np)
        logger.info("Saved speaker embedding to %s", embed_path)
        return embed_path

    async def synthesize(
        self,
        text: str,
        voice_profile_id: Optional[str] = None,
        **kwargs,
    ) -> bytes:
        """Synthesize text using a voice profile's speaker embedding."""
        m = self.model

        if voice_profile_id:
            # Load the saved embedding
            settings = get_settings()
            # We need the user_id to find the file — we store it as user_id/profile_id/
            # For now, search for the embedding file
            profile_dir = os.path.join(settings.upload_dir, "voices")
            embed_path = None
            for root, dirs, files in os.walk(profile_dir):
                if voice_profile_id in root and "speaker_embedding.npy" in files:
                    embed_path = os.path.join(root, "speaker_embedding.npy")
                    break

            if embed_path and os.path.exists(embed_path):
                embedding = np.load(embed_path)
                # Synthesize with the loaded embedding
                wav = m.tts(text=text, speaker_embedding=embedding)
            else:
                # Fallback to a random voice from the model
                logger.warning("Embedding not found for %s, using default voice", voice_profile_id)
                wav = m.tts(text=text, speaker=m.speakers[0] if m.speakers else None)
        else:
            # No voice profile — use default speaker
            wav = m.tts(text=text)

        # Convert numpy array to WAV bytes
        import io
        import soundfile as sf
        buffer = io.BytesIO()
        sf.write(buffer, wav, samplerate=24000, format="WAV")
        return buffer.getvalue()

    def get_metadata(self) -> dict:
        return {
            "id": "vox_clone",
            "name": "Vox Clone (XTTS)",
            "description": "Local voice cloning via Coqui XTTS-v2",
            "needs_voice_profile": True,
        }
```

- [ ] **Step 2: Register provider in registry.py**

Read `backend/app/tts/registry.py` and add to the `init_providers()` function:

```python
from app.tts.vox_clone import VoxCloneProvider

try:
    _providers["vox_clone"] = VoxCloneProvider()
    logger.info("Registered VoxClone provider")
except Exception as e:
    logger.warning("VoxClone provider not available: %s", e)
```

Add the import and registration code after existing provider registrations.

- [ ] **Step 3: Add TTS to requirements.txt**

Append to `backend/requirements.txt`:
```
TTS>=0.22.0
soundfile>=0.12.1
numpy>=1.24.0
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/tts/vox_clone.py backend/app/tts/registry.py backend/requirements.txt
git commit -m "feat: add VoxCloneProvider wrapping Coqui XTTS-v2"
```

---

## Phase 4: Frontend — API Client + Voice Pages

### Task 5: Add Voice Methods to API Client

**File:** Modify `frontend/lib/api.ts`

- [ ] **Step 1: Add voice methods**

Before the Audio URLs section (line 223), add:

```typescript
  // Voice Profiles
  listVoiceProfiles() {
    return this.request<Array<{
      id: string; name: string; description: string | null;
      status: string; sample_count: number; error_message: string | null;
      created_at: string; updated_at: string;
    }>>("/api/voices/profiles");
  }

  getVoiceProfile(id: string) {
    return this.request<{
      id: string; name: string; description: string | null;
      status: string; sample_count: number; error_message: string | null;
      created_at: string; updated_at: string;
      audio_samples: Array<{ id: string; file_path: string; duration_seconds: number; created_at: string }>;
    }>(`/api/voices/profiles/${id}`);
  }

  createVoiceProfile(data: { name: string; description?: string }) {
    return this.request<{
      id: string; name: string; description: string | null;
      status: string; sample_count: number; created_at: string; updated_at: string;
    }>("/api/voices/profiles", { method: "POST", body: JSON.stringify(data) });
  }

  uploadVoiceSamples(profileId: string, files: FileList | File[]) {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    return this.request<{
      id: string; name: string; status: string; sample_count: number;
    }>(`/api/voices/profiles/${profileId}/samples`, {
      method: "POST",
      body: formData,
    });
  }

  deleteVoiceProfile(id: string) {
    return this.request<void>(`/api/voices/profiles/${id}`, { method: "DELETE" });
  }

  retryVoiceExtraction(id: string) {
    return this.request<{ message: string }>(`/api/voices/profiles/${id}/retry`, { method: "POST" });
  }

  getVoicePreviewUrl(profileId: string) {
    return `${API_URL}/api/voices/profiles/${profileId}/preview`;
  }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add voice profile API methods to frontend client"
```

---

### Task 6: Voice Profile List Page

**Files:**
- Create: `frontend/app/voices/page.tsx`
- Create: `frontend/app/voices/VoicesClient.tsx`

- [ ] **Step 1: Create page.tsx**

```tsx
import VoicesClient from "./VoicesClient";

export default function VoicesPage() {
  return <VoicesClient />;
}
```

- [ ] **Step 2: Create VoicesClient.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { ArrowLeft, Plus, Mic, Trash2, CheckCircle, Clock, AlertCircle, RefreshCw, Headphones } from "lucide-react";

interface VoiceProfile {
  id: string; name: string; description: string | null;
  status: string; sample_count: number; error_message: string | null;
  created_at: string; updated_at: string;
}

export default function VoicesClient() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const fetchProfiles = async () => {
    try {
      const data = await api.listVoiceProfiles();
      setProfiles(data);
    } catch (err: any) {
      toast(err.message || "Could not load voice profiles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const profile = await api.createVoiceProfile({ name: newName.trim(), description: newDesc.trim() || undefined });
      setProfiles((prev) => [profile as any, ...prev]);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      toast("Voice profile created! Upload audio samples to activate.", "success");
    } catch (err: any) {
      toast(err.message || "Failed to create profile", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteVoiceProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast("Profile deleted", "info");
    } catch (err: any) {
      toast(err.message || "Failed to delete", "error");
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "ready":
        return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3 h-3" /> Ready</span>;
      case "creating":
        return <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><Clock className="w-3 h-3 animate-pulse" /> Processing</span>;
      case "error":
        return <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400"><AlertCircle className="w-3 h-3" /> Error</span>;
      default:
        return <span className="text-xs text-[var(--text-muted)]">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-[var(--text)]">Voice Profiles</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Profile
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {showCreate && (
          <div className="card p-5 space-y-4 animate-fade-in">
            <h2 className="font-semibold text-[var(--text)]">New Voice Profile</h2>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. Sarah's Voice)"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!newName.trim()} className="btn-primary text-sm">Create</button>
              <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5"><Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-32" /></div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center mx-auto mb-6">
              <Mic className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text)] mb-2">No voice profiles yet</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              Create a profile, upload audio samples of someone&apos;s voice, and we&apos;ll clone it for TTS conversion.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Profile</button>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/voices/${p.id}`)}
                className="card p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--text)] truncate">{p.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {p.sample_count} sample{p.sample_count !== 1 ? "s" : ""}
                      {p.description ? ` · ${p.description}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={p.status} />
                  {p.status === "error" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); api.retryVoiceExtraction(p.id).then(fetchProfiles).catch(() => {}); }}
                      className="btn-ghost p-1.5 text-xs"
                      title="Retry"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                    className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Add /voices link to DashboardClient header**

In `frontend/app/dashboard/DashboardClient.tsx`, add a Voices button next to the Admin button:

```tsx
<button onClick={() => router.push("/voices")} className="btn-ghost text-sm hidden sm:flex items-center gap-1.5">
  <Mic className="w-4 h-4" /> Voices
</button>
```

Add `Mic` to the lucide-react imports.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/voices/ frontend/app/dashboard/DashboardClient.tsx
git commit -m "feat: add voice profile management frontend pages"
```

---

### Task 7: Voice Profile Detail Page

**Files:**
- Create: `frontend/app/voices/[id]/page.tsx`
- Create: `frontend/app/voices/[id]/VoiceProfileClient.tsx`

- [ ] **Step 1: Create [id]/page.tsx**

```tsx
import VoiceProfileClient from "./VoiceProfileClient";

export default function VoiceProfilePage() {
  return <VoiceProfileClient />;
}
```

- [ ] **Step 2: Create VoiceProfileClient.tsx**

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import AudioPlayer from "@/components/AudioPlayer";
import { ArrowLeft, Upload, Mic, CheckCircle, Clock, AlertCircle, RefreshCw, Play, Trash2, FileAudio } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

interface VoiceSample {
  id: string; file_path: string; duration_seconds: number; created_at: string;
}

interface VoiceProfile {
  id: string; name: string; description: string | null;
  status: string; sample_count: number; error_message: string | null;
  created_at: string; updated_at: string;
  audio_samples: VoiceSample[];
}

export default function VoiceProfileClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    try {
      const data = await api.getVoiceProfile(id);
      setProfile(data);
    } catch (err: any) {
      toast(err.message || "Could not load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [id]);

  // Poll status while processing
  useEffect(() => {
    if (!profile || profile.status !== "creating") return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getVoiceProfile(id);
        setProfile(data);
        if (data.status !== "creating") clearInterval(interval);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [profile?.status, id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await api.uploadVoiceSamples(id, files);
      toast("Samples uploaded! Processing voice...", "success");
      fetchProfile();
    } catch (err: any) {
      toast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePreview = async () => {
    try {
      const url = api.getVoicePreviewUrl(id);
      setPreviewAudio(url);
      setIsPlaying(true);
    } catch {
      toast("Preview not available yet", "error");
    }
  };

  const handleRetry = async () => {
    try {
      await api.retryVoiceExtraction(id);
      toast("Restarting extraction...", "info");
      fetchProfile();
    } catch (err: any) {
      toast(err.message || "Failed to retry", "error");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
  if (!profile) return null;

  const statusIcons: Record<string, React.ReactNode> = {
    ready: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    creating: <Clock className="w-5 h-5 text-amber-500 animate-pulse" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
  };

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/voices")} className="btn-ghost p-2 flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-[var(--text)] truncate">{profile.name}</h1>
              <p className="text-xs text-[var(--text-muted)]">{profile.description || "Voice Profile"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile.status === "ready" && (
              <button onClick={handlePreview} className="btn-secondary text-sm flex items-center gap-1.5">
                <Play className="w-4 h-4" /> Test Voice
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Status */}
        <div className="card p-5 flex items-center gap-4">
          {statusIcons[profile.status] || null}
          <div>
            <p className="font-medium text-[var(--text)]">
              Status: {profile.status === "ready" ? "Ready to use" : profile.status === "creating" ? "Processing voice..." : "Error"}
            </p>
            {profile.status === "creating" && (
              <p className="text-xs text-[var(--text-muted)] mt-1">Extracting speaker embedding from {profile.sample_count} sample{profile.sample_count !== 1 ? "s" : ""}...</p>
            )}
            {profile.status === "error" && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-red-500">{profile.error_message || "Unknown error"}</p>
                <button onClick={handleRetry} className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview audio player */}
        {previewAudio && (
          <AudioPlayer
            audioUrl={previewAudio}
            title="Voice Preview"
            playing={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        {/* Upload samples */}
        <div className="card p-5">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-[var(--primary)]" /> Audio Samples
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Upload clear recordings of the person speaking. WAV or MP3, at least 10 seconds each, 50MB max per file.
          </p>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          >
            <FileAudio className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="text-indigo-500 font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">WAV or MP3 — {profile.sample_count} sample{profile.sample_count !== 1 ? "s" : ""} uploaded</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.m4a,.ogg"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </div>
          {uploading && (
            <div className="flex items-center gap-2 mt-3 text-sm text-[var(--text-secondary)]">
              <div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
              Uploading...
            </div>
          )}
        </div>

        {/* Sample list */}
        {profile.audio_samples.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Uploaded Samples</h3>
            <div className="space-y-2">
              {profile.audio_samples.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-secondary)]">{s.file_path.split("/").pop() || "sample"}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{Math.round(s.duration_seconds)}s</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/voices/
git commit -m "feat: add voice profile detail page with upload and preview"
```

---

## Phase 5: Integration — Voice Selection During Conversion

### Task 8: VoiceSelector Component

**File:** Create `frontend/components/VoiceSelector.tsx`

- [ ] **Step 1: Create VoiceSelector.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Mic, CheckCircle, Clock, AlertCircle, ChevronDown } from "lucide-react";

interface VoiceProfile {
  id: string; name: string; status: string; sample_count: number; description: string | null;
}

interface VoiceSelectorProps {
  selectedProfileId: string | null;
  onSelect: (profileId: string | null) => void;
}

export default function VoiceSelector({ selectedProfileId, onSelect }: VoiceSelectorProps) {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.listVoiceProfiles()
      .then(setProfiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const readyProfiles = profiles.filter((p) => p.status === "ready");
  const selected = profiles.find((p) => p.id === selectedProfileId);

  if (loading || readyProfiles.length === 0) return null;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Cloned Voice</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] hover:border-indigo-400 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Mic className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          <span className="truncate">{selected ? selected.name : "Select a voice..."}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!selectedProfileId ? "text-indigo-600 font-medium" : "text-[var(--text-secondary)]"}`}
            >
              None (default voice)
            </button>
            {readyProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p.id); setOpen(false); }}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between ${selectedProfileId === p.id ? "text-indigo-600 font-medium" : "text-[var(--text-secondary)]"}`}
              >
                <span>{p.name}</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/VoiceSelector.tsx
git commit -m "feat: add VoiceSelector component for voice profile selection"
```

---

### Task 9: Integrate VoiceSelector into Conversion Flow

**Files:**
- Modify: `frontend/app/upload/UploadClient.tsx`
- Modify: `backend/app/routers/conversion.py`
- Modify: `backend/workers/tts_worker.py`

- [ ] **Step 1: Add voice_profile_id to startConversion API method**

In `frontend/lib/api.ts`, update `startConversion` to accept `voiceProfileId`:

```typescript
  startConversion(bookId: string, ttsProvider: string = "kokoro", language?: string, targetLanguage?: string, voiceProfileId?: string) {
    let url = `/api/books/${bookId}/convert?tts_provider=${ttsProvider}`;
    if (language) url += `&language=${language}`;
    if (targetLanguage) url += `&target_language=${targetLanguage}`;
    if (voiceProfileId) url += `&voice_profile_id=${voiceProfileId}`;
    return this.request<{ message: string; book_id: string }>(url, { method: "POST" });
  }
```

- [ ] **Step 2: Update conversion route to accept voice_profile_id**

In `backend/app/routers/conversion.py`, update the `start_conversion` endpoint:

```python
@router.post("/api/books/{book_id}/convert")
async def start_conversion(
    book_id: UUID,
    tts_provider: str = "kokoro",
    language: Optional[str] = None,
    target_language: Optional[str] = None,
    voice_profile_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ...
    # Before dispatch, save voice_profile_id to the job
    job.voice_profile_id = voice_profile_id
    await db.commit()
    ...
```

Also update `run_conversion_sync()` to accept and pass `voice_profile_id` through the synthesis call.

- [ ] **Step 3: Integrate VoiceSelector in UploadClient.tsx**

In `frontend/app/upload/UploadClient.tsx`:
1. Import VoiceSelector
2. Add `[selectedVoiceId, setSelectedVoiceId]` state
3. When Vox Clone provider is selected, show `<VoiceSelector>`
4. Pass `voiceProfileId` to `api.startConversion()`

Add state near other state declarations:
```tsx
const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
// Reset voice selection when provider changes
useEffect(() => { setSelectedVoiceId(null); }, [selectedProvider]);
```

Add the VoiceSelector after provider selection (when `selectedProvider === "vox_clone"`):
```tsx
{selectedProvider === "vox_clone" && (
  <VoiceSelector
    selectedProfileId={selectedVoiceId}
    onSelect={setSelectedVoiceId}
  />
)}
```

Update the startConversion call:
```tsx
await api.startConversion(book.id, selectedProvider, srcLang, enableTranslation ? tgtLang : undefined, selectedVoiceId || undefined);
```

- [ ] **Step 4: Pass voice_profile_id through conversion pipeline**

In `backend/workers/tts_worker.py` `convert_book`, when synthesizing:
```python
provider_kwargs = {}
if job.voice_profile_id:
    provider_kwargs["voice_profile_id"] = str(job.voice_profile_id)

audio_bytes = asyncio.run(provider.synthesize(chapter.text, **provider_kwargs))
```

And in `run_conversion_sync()`:
```python
provider_kwargs = {}
if job.voice_profile_id:
    provider_kwargs["voice_profile_id"] = str(job.voice_profile_id)

audio_bytes = asyncio.run(provider.synthesize(chapter.text, **provider_kwargs))
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/upload/UploadClient.tsx frontend/lib/api.ts backend/app/routers/conversion.py backend/workers/tts_worker.py
git commit -m "feat: integrate voice profile selection into conversion flow"
```

---

## Verification Checklist

After all tasks:

- [ ] Backend starts without errors: `cd backend && python -c "from app.tts.registry import init_providers; init_providers(); from app.main import app; print('OK')"`
- [ ] Frontend builds without errors: `cd frontend && npx next build`
- [ ] Can create voice profile via API: `POST /api/voices/profiles`
- [ ] Can upload audio samples: `POST /api/voices/profiles/{id}/samples`
- [ ] Can list profiles: `GET /api/voices/profiles`
- [ ] Can delete profile: `DELETE /api/voices/profiles/{id}`
- [ ] Frontend `/voices` page loads and shows profiles
- [ ] VoiceSelector appears when Vox Clone is selected in upload form
- [ ] Conversion with `voice_profile_id` passes through pipeline
