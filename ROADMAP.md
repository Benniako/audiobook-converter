# Audiobook Converter — Roadmap

## Phase 1: Foundation ✅
- [x] Project scaffolding (FastAPI + Next.js + Docker)
- [x] Data models (User, Book, Chapter, Job, CustomTTS)
- [x] JWT authentication (register, login, me)
- [x] File upload API (EPUB, PDF, TXT)
- [x] Ebook parsing service
- [x] TTS engine abstraction (Kokoro, OpenAI, Custom)
- [x] Celery workers for async conversion
- [x] Audio assembly (chapter WAVs → M4B with ffmpeg)
- [x] Admin API for custom TTS management
- [x] Frontend pages (landing, auth, dashboard, upload, player, admin)
- [x] Admin custom TTS plugin UI
- [x] Docker Compose deployment

## Phase 2: UX & Polish ⬅️ (Current)
- [ ] UI redesign — modern, professional design system
- [ ] Dark mode support
- [ ] Responsive mobile layout
- [ ] Loading skeletons and transitions
- [ ] Toast/notification system
- [ ] Form validation UX improvements
- [ ] Empty states with illustrations
- [ ] Keyboard shortcuts (space for play/pause)
- [ ] Chapter auto-advance with smooth transitions

## Phase 3: TTS & Audio
- [ ] Kokoro-82M Docker integration (pre-installed model)
- [ ] Streaming TTS — listen while it generates
- [ ] Voice preview in provider selector
- [ ] Per-chapter voice override
- [ ] Audio normalization (loudness equalization)
- [ ] Multi-format export (M4B, MP3, FLAC, OPUS)
- [ ] Audiobook chapter markers in M4B metadata
- [ ] Cover art embedding in audio files

## Phase 4: Features
- [ ] Reading progress sync across devices
- [ ] Bookmark system (save positions)
- [ ] Sleep timer
- [ ] Playback speed per book (remember settings)
- [ ] Offline listening (PWA)
- [ ] Batch upload & convert
- [ ] Drag-drop reorder chapters
- [ ] Text-to-speech preview before conversion
- [ ] Edit chapter titles and merge/split

## Phase 5: Admin & Power Features
- [ ] Custom TTS engine testing dashboard
- [ ] Conversion logs and debug views
- [ ] User management (admin)
- [ ] Usage analytics
- [ ] Rate limiting configuration
- [ ] API key management for programmatic access
- [ ] Webhook notifications on conversion complete
- [ ] Custom voice training pipeline

## Phase 6: Monetization
- [ ] Stripe subscription integration
- [ ] Free tier (2 books/month, Kokoro only)
- [ ] Pro tier (unlimited, all TTS engines)
- [ ] Pay-per-conversion option
- [ ] Team/enterprise plans
- [ ] Usage-based billing

## Phase 7: Scale & Deploy
- [ ] CDN for audio file delivery
- [ ] S3/cloud storage for uploads & output
- [ ] Horizontal worker scaling
- [ ] Database connection pooling optimization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing suite
- [ ] Performance benchmarks
- [ ] Security audit

## Phase 8: Community
- [ ] Open-source TTS model marketplace
- [ ] User-contributed voice presets
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Plugin SDK documentation
- [ ] Example custom TTS provider templates
- [ ] Discord/community support
