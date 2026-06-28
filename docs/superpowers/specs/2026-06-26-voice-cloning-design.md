# Voice Cloning Feature — Design Spec

**Date:** 2026-06-26  
**Status:** Draft  
**Related:** ROADMAP.md, PRODUCT.md

---

## Overview

Add voice cloning to the audiobook converter. Users upload audio samples of people they know, and a local HuggingFace TTS model (XTTS-v2) extracts a unique speaker embedding that can be used during conversion to synthesize speech in that person's voice.

---

## Architecture

```
Upload audio clips → VoiceProfile created (status: creating)
        ↓
Background worker: extract speaker embedding via VoxCloneProvider
        ↓
VoiceProfile saved to disk as .npy embedding file (status: ready)
        ↓
During book conversion: user picks a VoiceProfile + VoxCloneProvider
        ↓
Provider loads embedding → synthesizes each chapter in cloned voice
```

The feature slots into the existing patterns:
- **TTS Provider system** — new `VoxCloneProvider` implements the same `TTSProvider` base class
- **Background processing** — embedding extraction follows the same worker pattern as book conversion
- **Job status tracking** — reuses `JobStatus` enum for voice profile creation

---

## Data Model

```python
class VoiceProfile(Base):
    __tablename__ = "voice_profiles"

    id: Mapped[UUID] = mapped_column(GUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))                   # "Sarah's Voice"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[VoiceProfileStatus] = mapped_column(SAEnum(VoiceProfileStatus), default=VoiceProfileStatus.creating)
    embedding_path: Mapped[str | None] = mapped_column(String(500), nullable=True)  # path to .npy
    sample_count: Mapped[int] = mapped_column(Integer, default=0)
    audio_samples: Mapped[list["VoiceSample"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

class VoiceSample(Base):
    __tablename__ = "voice_samples"

    id: Mapped[UUID] = mapped_column(GUID, primary_key=True, default=uuid4)
    profile_id: Mapped[UUID] = mapped_column(ForeignKey("voice_profiles.id", ondelete="CASCADE"))
    file_path: Mapped[str] = mapped_column(String(500))
    duration_seconds: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    profile: Mapped["VoiceProfile"] = relationship(back_populates="audio_samples")

class VoiceProfileStatus(enum.Enum):
    creating = "creating"
    ready = "ready"
    error = "error"
```

### ConversionJob changes

```python
# Add optional FK to voice_profile
voice_profile_id: Mapped[UUID | None] = mapped_column(ForeignKey("voice_profiles.id"), nullable=True)
```

---

## API Endpoints

All under `/api/voices/`, protected by existing JWT auth.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/voices/profiles` | Create profile (body: `{"name": "...", "description": "..."}`) |
| POST | `/api/voices/profiles/{id}/samples` | Upload audio clip(s) — multipart, auto-triggers embedding extraction |
| GET | `/api/voices/profiles` | List user's profiles (with status) |
| GET | `/api/voices/profiles/{id}` | Get profile detail + samples |
| DELETE | `/api/voices/profiles/{id}` | Delete profile, samples, embedding |
| POST | `/api/voices/profiles/{id}/retry` | Re-run embedding extraction |
| GET | `/api/voices/profiles/{id}/preview` | Synthesize a test phrase → stream audio |

Upload flow:
1. Create profile (returns `{id}`)
2. Upload 1+ audio samples to `POST {id}/samples`
3. Worker auto-extracts embedding
4. Poll profile status until `ready`

---

## TTS Provider: VoxCloneProvider

Registered as `"vox_clone"` in the existing registry.

### synthesize() signature
```python
async def synthesize(
    self,
    text: str,
    voice_profile_id: UUID | None = None,
    **kwargs
) -> bytes
```

### Lifecycle
- **init:** Load the XTTS model once from HuggingFace (`XTTSModel.from_pretrained("coqui/XTTS-v2")`)
- **embedding extraction:** Load audio clips → compute speaker embedding → save `.npy` to disk
- **synthesis:** Load `.npy` embedding → pass to XTTS `synthesize(text, speaker_embedding=embedding)` → return WAV bytes

### Model requirements
- `TTS` library from Coqui (`pip install TTS`)
- ~2GB model download on first run
- GPU recommended (CUDA), CPU fallback (slower)
- Model loading cached in provider singleton (same memory across requests)

### Error handling
- XTTS model fails to load → profile status = `"error"`, error message stored
- Audio clips too short (< 2s) → validation error
- Clip sample rate mismatch → auto-resample in worker

---

## Frontend

### New pages
- **`/voices`** — list all voice profiles, create new, delete
- **`/voices/[id]`** — profile detail, upload samples, preview test phrase

### Changes to existing pages
- **Upload/Conversion page** — when `"vox_clone"` provider is selected, show a dropdown of available voice profiles
- **BookPlayer** — (future) per-chapter voice assignment

### Component additions
- `VoiceProfileCard` — thumbnail, name, status badge, sample count
- `VoiceSampleUploader` — drag-and-drop audio upload zone
- `VoiceSelector` — dropdown listing all user's ready profiles

---

## Implementation Roadmap

### Phase 1: Backend Foundation (Current Sprint)
1. Create `VoiceProfile` + `VoiceSample` SQLAlchemy models
2. Add `voice_profile_id` FK to `ConversionJob`
3. Implement CRUD routes (`/api/voices/profiles` and `/api/voices/profiles/{id}/samples`)
4. Add `VoxCloneProvider` class with XTTS model loading and basic `synthesize()`

### Phase 2: Voice Cloning Engine (Next Sprint)
1. Implement embedding extraction endpoint (`POST {id}/samples` → auto-process)
2. Add Celery worker task for embedding extraction
3. Wire up preview endpoint (`GET {id}/preview`)
4. Handle errors and status transitions (creating → ready / error)

### Phase 3: Frontend (Next Sprint)
1. Build `/voices` page (list, create, delete profiles)
2. Build `/voices/[id]` page (upload samples, preview, status polling)
3. Integrate `VoiceSelector` into conversion upload form

### Phase 4: Conversion Integration (Future)
1. Pass `voice_profile_id` through conversion pipeline
2. Per-chapter voice assignment UI in BookPlayer
3. Character-based voice mapping (for novels with dialogue)

---

## Open Questions / Future

- **Model caching:** XTTS model loaded once, but ~2GB RAM — fine for single-user, consider for multi-user
- **GPU sharing:** If book conversion is also running, GPU contention could slow both
- **Multi-model support:** Can add FishSpeech, GPT-SoVITS etc. later via a `VoiceCloningProvider` abstraction
