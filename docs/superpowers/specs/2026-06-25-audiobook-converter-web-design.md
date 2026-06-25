# Audiobook Converter Web — Design Spec

**Date:** 2026-06-25
**Status:** Draft

## Overview

A web application that converts ebooks (EPUB, PDF, and TXT) into audiobooks with hybrid TTS support. Users upload books, select a TTS engine, and get back a streaming or downloadable audiobook with chapter navigation.

**MVP formats:** EPUB, PDF, TXT — other formats (MOBI, AZW3, DOCX) are future scope.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Next.js    │────▶│  FastAPI     │────▶│  Celery Workers│
│  Frontend   │     │  REST API    │     │  (TTS Engine)  │
│             │◀────│              │◀────│                │
└─────────────┘     └──────┬───────┘     └────────────────┘
                           │                        │
                    ┌──────┴───────┐         ┌──────┴───────┐
                    │  PostgreSQL  │         │  File Storage │
                    │  (users,     │         │  (ebooks +    │
                    │   books,     │         │   audiobooks) │
                    │   jobs)      │         │               │
                    └──────────────┘         └───────────────┘
                           │
                    ┌──────┴───────┐
                    │    Redis     │
                    │ (Celery +    │
                    │  caching)    │
                    └──────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend** | Python (FastAPI) | TTS models are Python-native; excellent ebook parsing libraries; async support for streaming |
| **Frontend** | Next.js + React | Rich audio player ecosystem; SSR for landing pages; best fit for media-heavy SPA |
| **Task Queue** | Celery + Redis | Async TTS processing; progress tracking; retry logic |
| **Database** | PostgreSQL | Reliable, well-supported ORM (SQLAlchemy) |
| **File Storage** | Local disk (MVP) → S3-compatible (production) | Simple start, scalable later |
| **Auth** | JWT (access + refresh tokens) | Stateless, standard |

### Key Design Decisions

1. **Async TTS conversion** — Users upload a book and are notified when conversion completes (polling via status endpoint). Chapters become available incrementally as they're processed.
2. **Hybrid TTS** — Abstract `TTSProvider` interface with pluggable backends (Kokoro-82M local, OpenAI TTS, ElevenLabs). Free tier uses Kokoro; paid tier unlocks cloud voices.
3. **Streaming-first** — Individual chapter audio files allow seamless streaming. Full M4B/MP3 assembly happens after all chapters are done.

## Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `email` | String | Unique, used for auth |
| `password_hash` | String | bcrypt |
| `plan` | Enum | `free` / `pro` |
| `created_at` | DateTime | |

### Book
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → User |
| `title` | String | Extracted from ebook metadata |
| `author` | String | Extracted |
| `cover_url` | String | Cover image path/URL |
| `status` | Enum | `uploading` → `processing` → `ready` → `error` |
| `original_file` | String | Path to uploaded EPUB/PDF |
| `tts_provider` | Enum | `kokoro` / `openai` / `elevenlabs` |
| `duration_seconds` | Integer | Total audiobook length |
| `created_at` | DateTime | |

### Chapter
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `book_id` | UUID | FK → Book |
| `index` | Integer | Chapter order |
| `title` | String | Chapter title |
| `text` | Text | Chapter content (stored for re-processing) |
| `audio_path` | String | Path to generated audio file |
| `duration_seconds` | Integer | Chapter length |

### ConversionJob
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `book_id` | UUID | FK → Book |
| `status` | Enum | `queued` → `parsing` → `synthesizing` → `assembling` → `done` → `failed` |
| `progress` | Float | 0.0–1.0 |
| `error_message` | Text | If failed |
| `created_at` | DateTime | |

## API Endpoints

### Auth
- `POST /api/auth/register` — Sign up
- `POST /api/auth/login` — Login (JWT)
- `GET /api/auth/me` — Current user info

### Books
- `POST /api/books/upload` — Upload ebook file
- `GET /api/books/` — List user's books
- `GET /api/books/{id}` — Book details + chapters
- `DELETE /api/books/{id}` — Delete book + audio

### Conversion
- `POST /api/books/{id}/convert` — Start conversion (select TTS provider, voice, speed)
- `GET /api/books/{id}/status` — Poll conversion progress

### Streaming & Download
- `GET /api/books/{id}/chapters/{chapter_id}/audio` — Stream chapter audio
- `GET /api/books/{id}/download` — Download full M4B/MP3

### TTS Providers
- `GET /api/tts/providers` — List available providers and voices

### Admin
- `GET /api/admin/custom-tts` — List custom TTS providers
- `POST /api/admin/custom-tts` — Register a new custom TTS provider
- `PUT /api/admin/custom-tts/{id}` — Update a custom provider
- `DELETE /api/admin/custom-tts/{id}` — Remove a custom provider
- `POST /api/admin/custom-tts/{id}/test` — Test a custom provider with sample text
- `GET /api/admin/stats` — System status (queue, jobs, users)

## Frontend Pages (Next.js)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, demo, CTA to sign up |
| `/login` | Login | Email/password login |
| `/register` | Register | Create account |
| `/dashboard` | Library | Grid of user's books with status |
| `/upload` | Upload | Drag-and-drop upload + TTS settings |
| `/books/{id}` | Player | Audiobook player with chapters |
| `/admin` | Admin Panel | Custom TTS engines, system status, user mgmt (admin only) |
| `/settings` | Settings | Account settings, plan |

### Player Page Details
- Book cover + metadata header
- Chapter list with play/complete indicators
- Audio player bar: play/pause, seek, speed (0.5x–2x), skip, chapter title
- Download button (enabled when fully converted)
- Real-time progress bar during conversion

## Hybrid TTS Engine

```
┌─────────────────────────────┐
│     TTSProvider (ABC)        │
├─────────────────────────────┤
│  + synthesize(text)          │
│  + get_available_voices()    │
└─────────┬───────────────────┘
          │
    ┌─────┼──────────┬────────┐
    │     │          │        │
┌───┴────┐┌──┴──────┐┌┴──────┐┌┴──────────┐
│ Kokoro  ││ OpenAI  ││Eleven ││ Custom    │
│ Provider││ Provider││Labs   ││ Providers │
└─────────┘└─────────┘└──────┘│ (admin-   │
                              │  added)   │
                              └───────────┘
```

### Free Tier (Kokoro-82M)
- Ships with the app, no API key needed
- Runs locally via Celery worker (GPU optional, CPU fallback)
- 9+ languages with multiple voices
- Zero operating cost per conversion

### Premium Tier (Cloud APIs)
- OpenAI TTS, ElevenLabs, Google Cloud TTS
- Users bring API key or use platform credits
- Higher quality, more voice variety

### Admin Custom TTS Plugin System
The admin can register **any local TTS engine** via a UI or config:
- **Custom Python script** — Point to a Python script/module that implements `synthesize(text) → audio`
- **Custom CLI command** — Provide a shell command where text is piped in and audio comes out
- **Custom HTTP endpoint** — Point to any internal/external API that accepts text and returns audio
- **Local model path** — Path to a local TTS model on disk (e.g. Coqui, Piper, your own fine-tuned model)

Each custom provider gets a name, description, and configuration stored in the database — available to all users on the platform.

### Conversion Pipeline
1. **Parse** — Extract chapters from EPUB/PDF using `ebooklib` / `PyMuPDF`
2. **Synthesize** — For each chapter, call `TTSProvider.synthesize(text)` → WAV file
3. **Assemble** — Concatenate chapter WAVs, encode to M4B via `ffmpeg`, attach chapter markers

## Admin Panel

A protected admin dashboard (route `/admin`) accessible only to the platform admin:

| Feature | Description |
|---------|-------------|
| **Custom TTS Engines** | Add, edit, test, and remove custom TTS providers |
| **System Status** | View Celery worker status, queue depth, failed jobs |
| **User Management** | View users, upgrade/downgrade plans |
| **Logs** | View conversion logs and error details |

### Custom TTS Provider Registration Form
- Name (e.g. "My Fine-Tuned Voice")
- Provider type: `script` / `cli` / `http` / `local_model`
- Configuration payload (varies by type):
  - `script`: Python module path + function name
  - `cli`: Command template (e.g. `echo "{text}" | my-tts --output -`)
  - `http`: URL + headers + response format
  - `local_model`: Model path + language + voice name
- Test button: synthesize a short phrase to verify it works

## Monetization Model

| Tier | Price | TTS Engine | Features |
|------|-------|-----------|----------|
| **Free** | $0 | Kokoro-82M only | 2 books/month, standard voices |
| **Pro** | $9.99/mo | Kokoro + Cloud APIs + Custom | Unlimited books, premium voices, custom admin TTS |

## File Structure (MVP)

```
/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── book.py
│   │   │   ├── chapter.py
│   │   │   └── conversion_job.py
│   │   ├── routers/             # API routes
│   │   │   ├── auth.py
│   │   │   ├── books.py
│   │   │   ├── conversion.py
│   │   │   ├── tts.py
│   │   │   └── admin.py
│   │   ├── services/            # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── book_service.py
│   │   │   ├── ebook_parser.py
│   │   │   └── audio_assembler.py
│   │   ├── tts/                 # TTS provider abstraction
│   │   │   ├── base.py
│   │   │   ├── kokoro.py
│   │   │   └── cloud.py
│   │   └── dependencies.py      # FastAPI DI
│   ├── workers/
│   │   └── tts_worker.py        # Celery tasks
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # Landing
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── upload/page.tsx
│   │   ├── books/[id]/page.tsx  # Player
│   │   └── settings/page.tsx
│   ├── app/admin/
│   │   └── page.tsx             # Admin dashboard
│   ├── components/
│   │   ├── AudioPlayer.tsx
│   │   ├── ChapterList.tsx
│   │   ├── UploadZone.tsx
│   │   ├── BookCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── CustomTtsForm.tsx    # Admin: add/edit custom TTS
│   ├── lib/
│   │   └── api.ts               # API client
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Error Handling & Edge Cases

- **Large books (1000+ pages):** Stream chapters incrementally as they're processed; user can start listening before conversion finishes
- **Failed conversion:** Clear error message with option to retry with different TTS provider
- **Unsupported format:** Graceful rejection with supported format list
- **Rate limiting:** Free tier: 2 concurrent conversions; Pro tier: 10 concurrent
- **File size limits:** 100MB max upload (configurable)
