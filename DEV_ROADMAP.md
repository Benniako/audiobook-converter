# Local Development Roadmap

## Current Status (June 26, 2026)

### ✅ Working
- Backend (FastAPI) running on `localhost:8001` with SQLite
- Frontend (Next.js 14) running on `localhost:3001`
- User registration, login, JWT auth
- File upload (EPUB/PDF/TXT)
- Ebook parsing (3 chapters extracted from test TXT)
- TTS synthesis pipeline (silent WAV fallback when model not installed)
- Conversion job tracking (queued → parsing → synthesizing → done)
- All TTS providers listed via API
- Bookmarks CRUD (backend)
- Chapter split/merge/reorder (backend)
- Playback speed per book (backend)
- Demo mode (no login required for browsing)
- Dark mode, keyboard shortcuts, sleep timer, welcome tour, PWA manifest
- Inline conversion fallback (no Redis/Celery needed for dev)

### ❌ Not Working / Missing
- **ffmpeg not installed** → Audio assembly (M4B/MP3) skipped. Only WAV files per chapter.
- **Kokoro TTS model not installed** → Silent WAVs generated instead of real speech.
- **passlib/bcrypt version mismatch** → Warning on every startup (harmless but annoying).
- **`email-validator` not in requirements.txt** → Must be installed separately.
- **`aiosqlite` not in requirements.txt** → Must be installed separately.
- **TTS providers hardcoded in frontend** → Should fetch from backend API.
- **Bookmarks frontend integration** → API exists, UI doesn't use it.
- **BookCard still uses `line-clamp-2`** → Tailwind v3.3+ renamed to `line-clamp-2` (check if it still works).
- **No error boundaries** → Component crashes show white screen.

---

## Phase 1: Get Audio Working (Immediate)

| Step | Task | Why | Est. |
|------|------|-----|------|
| 1 | **Install ffmpeg** | Without it, M4B/MP3 download doesn't work. All chapter markers, format conversion depend on it. | `choco install ffmpeg` |
| 2 | **Install Kokoro-82M** (optional) | Gets real speech instead of silent WAVs. Run: `pip install kokoro` + download model. | ~5 min |
| 3 | **Fix requirements.txt** | Add `email-validator`, `aiosqlite` | 2 min |
| 4 | **Fix passlib/bcrypt warning** | `pip install bcrypt==4.1.3` is done. The warning is cosmetic from passlib. Upgrading passlib would fix it. | 10 min |

## Phase 2: Polish What Exists (This Week)

| Priority | Task | Files |
|----------|------|-------|
| High | **Fetch TTS providers from backend** instead of hardcoding in `UploadClient.tsx` | `frontend/app/upload/UploadClient.tsx` lines 166-175 |
| High | **Integrate bookmarks in player UI** — save/restore position per chapter | `frontend/app/books/[id]/BookPlayerClient.tsx` + `frontend/lib/api.ts` |
| Medium | **Show estimated remaining time** from backend in ProgressBar | `frontend/components/ProgressBar.tsx` |
| Medium | **Make sleep timer actually stop playback** (component exists but timer doesn't pause player) | `frontend/components/SleepTimer.tsx` |
| Low | **Remember playback speed per book** (backend endpoint exists, frontend needs to use it) | `frontend/lib/api.ts:95` + `AudioPlayer.tsx` |
| Low | **Add error boundaries** for production-grade crash handling | Each page + layout |

## Phase 3: Docker Full Stack (Next Session)

| Step | Task |
|------|------|
| 1 | **Run Redis** (WSL or Docker) to test Celery async processing |
| 2 | **Run PostgreSQL** (Docker) to test with production DB |
| 3 | **Test Docker Compose** full stack: `docker compose up` |
| 4 | **Add health checks** to docker-compose services |
| 5 | **Add non-root user** to Dockerfiles |

## Phase 4: Feature Work

Based on PRODUCT.md priorities:

### Tier 1 — Core Product Gaps
1. **Offline listening (PWA)** — Manifest exists, add service worker + cache strategy
2. **Conversion time estimate** — Backend computes it, frontend displays it
3. **Bookmarks** — Save position, resume from where you left off
4. **Playback speed remembered** — Per-book speed stored in DB
5. **Sleep timer** — Actually stop playback at timer expiry

### Tier 2 — Growth
1. **Welcome tour** — Already implemented ✅
2. **Clipboard upload** — Paste URL to an EPUB and we fetch + convert
3. **Multi-format download** — Download as MP3, FLAC, OPUS in addition to M4B
4. **Drag-and-drop reorder chapters** — Backend endpoint done, frontend needs UI

### Tier 3 — Developer Experience
1. **Add unit tests** — pytest for API endpoints, Jest for components
2. **Add CI/CD** — GitHub Actions for lint, type-check, test
3. **Add Pre-commit hooks** — ruff, prettier, type checks

## Quick Start Commands Summary

```bash
# Start backend (from backend/)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Start frontend (from frontend/)
npx next dev -p 3001

# Open in browser
open http://localhost:3001
```

## Test Flow

After starting both services:
1. Open http://localhost:3001
2. Click "Get Started" → Register with any email/password
3. Dashboard shows empty library
4. Click "Upload" → Upload a `.txt` or `.epub` file
5. Select TTS engine (Kokoro will generate silent WAVs without the model)
6. Click "Convert" → Wait ~10 seconds → Listen to chapters
