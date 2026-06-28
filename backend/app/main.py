from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.config import get_settings
from app.routers import auth, books, tts, conversion, admin, languages, bookmarks, voices
from app.tts.registry import init_providers

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    init_providers()
    yield


app = FastAPI(title="Audiobook Converter", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(tts.router)
app.include_router(conversion.router)
app.include_router(admin.router)
app.include_router(languages.router)
app.include_router(bookmarks.router)
app.include_router(voices.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
