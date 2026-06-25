# Audiobook Converter Web

Convert EPUB, PDF, and TXT files into audiobooks with AI-powered TTS.

## Features

- Upload EPUB, PDF, or TXT files
- Convert to audiobooks with chapter navigation
- Hybrid TTS: Kokoro-82M (free, local) + OpenAI/ElevenLabs (premium)
- Admin panel to add custom TTS engines
- Stream in browser or download as M4B
- User accounts with library

## Quick Start

```bash
# Clone and start
docker compose up -d

# Open browser
open http://localhost:3000
```

## Development

```bash
# Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Architecture

- **Backend:** Python FastAPI + Celery + PostgreSQL
- **Frontend:** Next.js + Tailwind CSS
- **TTS:** Pluggable providers (Kokoro, OpenAI, custom)
