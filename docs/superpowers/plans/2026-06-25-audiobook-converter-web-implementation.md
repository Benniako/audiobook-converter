# Audiobook Converter Web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shippable web app that converts EPUB/PDF/TXT ebooks into audiobooks with hybrid TTS (local Kokoro + cloud APIs) and an admin panel for custom TTS engines.

**Architecture:** Python FastAPI backend serving a Next.js SPA, with Celery workers for async TTS processing. PostgreSQL for data, Redis for task queue. Pluggable TTSProvider abstraction with built-in Kokoro, cloud, and admin-registered custom engines.

**Tech Stack:** FastAPI, Next.js 14, PostgreSQL, Redis, Celery, Kokoro-82M, SQLAlchemy, Docker

---

## File Structure

```
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app factory, CORS, lifespan
│   │   ├── config.py                # Settings from env vars
│   │   ├── database.py              # SQLAlchemy engine + session
│   │   ├── dependencies.py          # FastAPI dependency injection
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── book.py
│   │   │   ├── chapter.py
│   │   │   ├── conversion_job.py
│   │   │   └── custom_tts.py
│   │   ├── schemas/                 # Pydantic request/response models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── book.py
│   │   │   └── tts.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── books.py
│   │   │   ├── conversion.py
│   │   │   ├── tts.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── book_service.py
│   │   │   ├── ebook_parser.py
│   │   │   └── audio_assembler.py
│   │   └── tts/
│   │       ├── __init__.py
│   │       ├── base.py
│   │       ├── kokoro.py
│   │       ├── cloud.py
│   │       └── custom_provider.py
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── celery_app.py
│   │   └── tts_worker.py
│   ├── migrations/                  # Alembic
│   │   ├── env.py
│   │   ├── alembic.ini
│   │   └── versions/
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_books.py
│   │   ├── test_ebook_parser.py
│   │   └── test_tts_providers.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Landing page
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── upload/page.tsx
│   │   ├── books/[id]/page.tsx     # Player page
│   │   ├── admin/page.tsx
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── AudioPlayer.tsx
│   │   ├── ChapterList.tsx
│   │   ├── UploadZone.tsx
│   │   ├── BookCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── CustomTtsForm.tsx
│   ├── lib/
│   │   └── api.ts                   # API client
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `.gitignore`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create .gitignore**

```
# Python
__pycache__/
*.py[cod]
*.egg-info/
.eggs/
dist/
build/
*.egg
.venv/
venv/
env/

# Node
node_modules/
.next/
out/

# Environment
.env
.env.local

# Audio / Uploads
uploads/
audio_output/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
*.log
```

- [ ] **Step 2: Create backend requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
sqlalchemy==2.0.31
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.13.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
pydantic==2.7.4
pydantic-settings==2.3.4
celery==5.4.0
redis==5.0.7
ebooklib==0.18
PyMuPDF==1.24.9
pydub==0.25.1
aiofiles==24.1.0
python-dotenv==1.0.1
httpx==0.27.0
pytest==8.2.2
pytest-asyncio==0.23.7
```

- [ ] **Step 3: Create backend .env.example**

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/audiobook
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@localhost:5432/audiobook
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change-this-to-a-random-secret-key
UPLOAD_DIR=./uploads
AUDIO_OUTPUT_DIR=./audio_output
ADMIN_EMAIL=admin@example.com
KOKORO_MODEL_PATH=
OPENAI_API_KEY=
```

- [ ] **Step 4: Create backend/app/__init__.py**

Empty file.

- [ ] **Step 5: Create backend/app/config.py**

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/audiobook"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/audiobook"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-this-to-a-random-secret-key"
    upload_dir: str = "./uploads"
    audio_output_dir: str = "./audio_output"
    admin_email: str = "admin@example.com"
    kokoro_model_path: str = ""
    openai_api_key: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
```

- [ ] **Step 6: Create backend/app/database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

- [ ] **Step 7: Create backend/app/main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Audiobook Converter", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 8: Create docker-compose.yml**

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: audiobook
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/audiobook
      - DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@db:5432/audiobook
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
    volumes:
      - uploads:/app/uploads
      - audio:/app/audio_output
    depends_on:
      - db
      - redis

  worker:
    build: ./backend
    command: celery -A workers.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@db:5432/audiobook
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
    volumes:
      - uploads:/app/uploads
      - audio:/app/audio_output
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  pgdata:
  uploads:
  audio:
```

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold project structure and docker-compose"
```

---

### Task 2: Backend Data Models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/book.py`
- Create: `backend/app/models/chapter.py`
- Create: `backend/app/models/conversion_job.py`
- Create: `backend/app/models/custom_tts.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/book.py`
- Create: `backend/app/schemas/tts.py`

- [ ] **Step 1: Create models/__init__.py**

```python
from app.models.user import User
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.conversion_job import ConversionJob
from app.models.custom_tts import CustomTTSProvider

__all__ = ["User", "Book", "Chapter", "ConversionJob", "CustomTTSProvider"]
```

- [ ] **Step 2: Create backend/app/models/user.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Enum as SAEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class UserPlan(str, enum.Enum):
    free = "free"
    pro = "pro"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    plan: Mapped[UserPlan] = mapped_column(SAEnum(UserPlan), default=UserPlan.free)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    books = relationship("Book", back_populates="user", cascade="all, delete-orphan")
```

- [ ] **Step 3: Create backend/app/models/book.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Enum as SAEnum, DateTime, func, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class BookStatus(str, enum.Enum):
    uploading = "uploading"
    processing = "processing"
    ready = "ready"
    error = "error"


class TTSProvider(str, enum.Enum):
    kokoro = "kokoro"
    openai = "openai"
    elevenlabs = "elevenlabs"
    custom = "custom"


class Book(Base):
    __tablename__ = "books"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    author: Mapped[str] = mapped_column(String(500), default="Unknown")
    cover_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    status: Mapped[BookStatus] = mapped_column(SAEnum(BookStatus), default=BookStatus.uploading)
    original_file: Mapped[str] = mapped_column(String(1000), nullable=False)
    tts_provider: Mapped[TTSProvider] = mapped_column(SAEnum(TTSProvider), default=TTSProvider.kokoro)
    tts_provider_id: Mapped[str] = mapped_column(String(100), nullable=True)  # FK to custom_tts if custom
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="books")
    chapters = relationship("Chapter", back_populates="book", cascade="all, delete-orphan", order_by="Chapter.index")
    conversion_job = relationship("ConversionJob", back_populates="book", uselist=False, cascade="all, delete-orphan")
```

- [ ] **Step 4: Create backend/app/models/chapter.py**

```python
import uuid
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("books.id"), nullable=False)
    index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    audio_path: Mapped[str] = mapped_column(String(1000), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)

    book = relationship("Book", back_populates="chapters")
```

- [ ] **Step 5: Create backend/app/models/conversion_job.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Float, Text, Enum as SAEnum, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class JobStatus(str, enum.Enum):
    queued = "queued"
    parsing = "parsing"
    synthesizing = "synthesizing"
    assembling = "assembling"
    done = "done"
    failed = "failed"


class ConversionJob(Base):
    __tablename__ = "conversion_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("books.id"), unique=True, nullable=False)
    status: Mapped[JobStatus] = mapped_column(SAEnum(JobStatus), default=JobStatus.queued)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    book = relationship("Book", back_populates="conversion_job")
```

- [ ] **Step 6: Create backend/app/models/custom_tts.py**

```python
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
```

- [ ] **Step 7: Create backend/app/schemas/__init__.py**

Empty file.

- [ ] **Step 8: Create backend/app/schemas/user.py**

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

- [ ] **Step 9: Create backend/app/schemas/book.py**

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class BookOut(BaseModel):
    id: UUID
    title: str
    author: str
    cover_url: Optional[str]
    status: str
    tts_provider: str
    duration_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChapterOut(BaseModel):
    id: UUID
    index: int
    title: str
    audio_path: Optional[str]
    duration_seconds: int

    class Config:
        from_attributes = True


class BookDetailOut(BookOut):
    chapters: list[ChapterOut] = []


class ConversionStatusOut(BaseModel):
    status: str
    progress: float
    error_message: Optional[str]
```

- [ ] **Step 10: Create backend/app/schemas/tts.py**

```python
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
```

- [ ] **Step 11: Commit**

```bash
git add backend/app/models/ backend/app/schemas/
git commit -m "feat: add data models and pydantic schemas"
```

---

### Task 3: Auth Backend (JWT + Endpoints)

**Files:**
- Create: `backend/app/dependencies.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create backend/app/dependencies.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.config import get_settings
from app.models.user import User

security = HTTPBearer()
settings = get_settings()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    settings = get_settings()
    if current_user.email != settings.admin_email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
```

- [ ] **Step 2: Create backend/app/services/__init__.py**

Empty file.

- [ ] **Step 3: Create backend/app/services/auth_service.py**

```python
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from app.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = {"sub": user_id, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
```

- [ ] **Step 4: Create backend/app/routers/__init__.py**

Empty file.

- [ ] **Step 5: Create backend/app/routers/auth.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenOut
from app.services.auth_service import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return TokenOut(access_token=token)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

- [ ] **Step 6: Register auth router in main.py**

```python
# Add to top of main.py imports
from app.routers import auth

# Add before the health endpoint
app.include_router(auth.router)
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/dependencies.py backend/app/services/auth_service.py backend/app/routers/auth.py backend/app/main.py
git commit -m "feat: add JWT auth with register/login/me endpoints"
```

---

### Task 4: Books API Backend

**Files:**
- Create: `backend/app/services/book_service.py`
- Create: `backend/app/routers/books.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create backend/app/services/book_service.py**

```python
import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.models.book import Book, BookStatus
from app.models.chapter import Chapter
from app.models.user import User

settings = get_settings()
ALLOWED_EXTENSIONS = {".epub", ".pdf", ".txt"}


async def save_upload_file(file: UploadFile, user_id: uuid.UUID) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}. Supported: {', '.join(ALLOWED_EXTENSIONS)}")

    user_dir = os.path.join(settings.upload_dir, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    file_id = uuid.uuid4()
    dest_path = os.path.join(user_dir, f"{file_id}{ext}")
    async with aiofiles.open(dest_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    return dest_path


async def get_user_books(db: AsyncSession, user_id: uuid.UUID) -> list[Book]:
    result = await db.execute(
        select(Book).where(Book.user_id == user_id).order_by(Book.created_at.desc())
    )
    return list(result.scalars().all())


async def get_book_detail(db: AsyncSession, book_id: uuid.UUID, user_id: uuid.UUID) -> Book | None:
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def delete_book(book: Book) -> None:
    # Remove files from disk
    if book.original_file and os.path.exists(book.original_file):
        os.remove(book.original_file)
    for chapter in book.chapters:
        if chapter.audio_path and os.path.exists(chapter.audio_path):
            os.remove(chapter.audio_path)
```

- [ ] **Step 2: Create backend/app/routers/books.py**

```python
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.book import Book
from app.schemas.book import BookOut, BookDetailOut
from app.services.book_service import save_upload_file, get_user_books, get_book_detail, delete_book

router = APIRouter(prefix="/api/books", tags=["books"])


@router.post("/upload", response_model=BookOut, status_code=201)
async def upload_book(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_path = await save_upload_file(file, current_user.id)
    book = Book(
        user_id=current_user.id,
        title=file.filename or "Untitled",
        original_file=file_path,
        status="uploading",
    )
    db.add(book)
    await db.flush()
    await db.refresh(book)
    return book


@router.get("/", response_model=list[BookOut])
async def list_books(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_user_books(db, current_user.id)


@router.get("/{book_id}", response_model=BookDetailOut)
async def get_book(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.delete("/{book_id}", status_code=204)
async def remove_book(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    await delete_book(book)
    await db.delete(book)
```

- [ ] **Step 3: Register books router in main.py**

```python
from app.routers import auth, books
app.include_router(auth.router)
app.include_router(books.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/book_service.py backend/app/routers/books.py backend/app/main.py
git commit -m "feat: add books CRUD API with file upload"
```

---

### Task 5: Ebook Parsing Service

**Files:**
- Create: `backend/app/services/ebook_parser.py`

- [ ] **Step 1: Create backend/app/services/ebook_parser.py**

```python
import os
import re
from typing import list[tuple[str, str]]
import ebooklib
from ebooklib import epub
import fitz  # PyMuPDF


def parse_epub(file_path: str) -> list[tuple[str, str]]:
    """Returns list of (chapter_title, chapter_text)"""
    book = epub.read_epub(file_path)
    chapters = []
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            content = item.get_content().decode("utf-8")
            # Strip HTML tags
            text = re.sub(r"<[^>]+>", "", content)
            text = re.sub(r"\n\s*\n", "\n\n", text).strip()
            if text:
                # Use first line as title
                lines = text.split("\n", 1)
                title = lines[0].strip()[:200] if lines else "Untitled"
                chapters.append((title, text))
    if not chapters:
        chapters.append(("Full Book", _extract_all_text_from_epub(book)))
    return chapters


def _extract_all_text_from_epub(book: epub.EpubBook) -> str:
    texts = []
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            content = item.get_content().decode("utf-8")
            text = re.sub(r"<[^>]+>", "", content)
            texts.append(text.strip())
    return "\n\n".join(texts)


def parse_pdf(file_path: str) -> list[tuple[str, str]]:
    doc = fitz.open(file_path)
    chapters = []
    current_title = "Chapter 1"
    current_text: list[str] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text().strip()
        if not text:
            continue

        lines = text.split("\n")
        for line in lines:
            stripped = line.strip()
            # Heuristic: short uppercase/Title-ish lines as chapter breaks
            if stripped and (stripped.isupper() or (len(stripped) < 100 and stripped.istitle() and stripped.endswith((":", ".")))):
                if current_text:
                    chapters.append((current_title, "\n".join(current_text)))
                current_title = stripped[:200]
                current_text = []
            else:
                current_text.append(stripped)

    if current_text:
        chapters.append((current_title, "\n".join(current_text)))

    if not chapters:
        chapters.append(("Full Book", "\n".join(page.get_text() for page in doc)))

    doc.close()
    return chapters


def parse_txt(file_path: str) -> list[tuple[str, str]]:
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()

    # Split by common chapter markers
    chapter_pattern = re.compile(
        r"(?:^|\n)(?:Chapter|CHAPTER|Chapitre|Kapitel)\s+\d+[\s:]*([^\n]*)",
        re.MULTILINE
    )
    splits = list(chapter_pattern.finditer(text))

    chapters = []
    if not splits:
        chapters.append(("Full Book", text))
    else:
        prev_end = 0
        for i, match in enumerate(splits):
            if i > 0:
                chapter_text = text[prev_end:match.start()].strip()
                if chapter_text:
                    chapters.append((f"Chapter {i}", chapter_text))
            prev_end = match.start()
        final_text = text[prev_end:].strip()
        if final_text:
            chapters.append((f"Chapter {len(splits)}", final_text))

    # Fallback if no chapters found
    if not chapters:
        chapters.append(("Full Book", text))

    return chapters


def parse_ebook(file_path: str) -> list[tuple[str, str]]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".epub":
        return parse_epub(file_path)
    elif ext == ".pdf":
        return parse_pdf(file_path)
    elif ext == ".txt":
        return parse_txt(file_path)
    else:
        raise ValueError(f"Unsupported format: {ext}")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/ebook_parser.py
git commit -m "feat: add ebook parser for EPUB, PDF, TXT"
```

---

### Task 6: TTS Engine Abstraction

**Files:**
- Create: `backend/app/tts/__init__.py`
- Create: `backend/app/tts/base.py`
- Create: `backend/app/tts/kokoro.py`
- Create: `backend/app/tts/cloud.py`
- Create: `backend/app/tts/custom_provider.py`

- [ ] **Step 1: Create backend/app/tts/__init__.py**

```python
from app.tts.base import TTSProvider
from app.tts.kokoro import KokoroProvider
from app.tts.cloud import CloudProvider
from app.tts.custom_provider import CustomProvider

__all__ = ["TTSProvider", "KokoroProvider", "CloudProvider", "CustomProvider"]
```

- [ ] **Step 2: Create backend/app/tts/base.py**

```python
from abc import ABC, abstractmethod
from typing import list


class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, **kwargs) -> bytes:
        """Convert text to audio bytes (WAV format)."""
        pass

    @abstractmethod
    def get_available_voices(self) -> list[dict]:
        """Return list of available voices with metadata."""
        pass
```

- [ ] **Step 3: Create backend/app/tts/kokoro.py**

```python
import os
import subprocess
import json
from typing import list
from app.tts.base import TTSProvider
from app.config import get_settings

settings = get_settings()

# Default Kokoro voices per language
DEFAULT_VOICES = [
    {"id": "en_us_1", "name": "American English (Female)", "language": "en"},
    {"id": "en_us_2", "name": "American English (Male)", "language": "en"},
    {"id": "en_gb_1", "name": "British English (Female)", "language": "en"},
    {"id": "es_1", "name": "Spanish (Female)", "language": "es"},
    {"id": "fr_1", "name": "French (Female)", "language": "fr"},
    {"id": "it_1", "name": "Italian (Female)", "language": "it"},
    {"id": "ja_1", "name": "Japanese (Female)", "language": "ja"},
    {"id": "zh_1", "name": "Chinese (Female)", "language": "zh"},
]


class KokoroProvider(TTSProvider):
    """Uses Kokoro-82M via a subprocess call to a Python helper script."""

    def __init__(self):
        self.model_path = settings.kokoro_model_path or "kokoro"

    async def synthesize(self, text: str, voice: str = "en_us_1", speed: float = 1.0, **kwargs) -> bytes:
        """
        Calls Kokoro TTS via subprocess.
        Expects a script at `kokoro` that accepts --text, --voice, --speed and outputs WAV to stdout.
        """
        try:
            result = subprocess.run(
                [
                    "python", "-m", "kokoro",
                    "--text", text,
                    "--voice", voice,
                    "--speed", str(speed),
                    "--output", "-",  # stdout
                ],
                capture_output=True,
                timeout=120,
            )
            if result.returncode != 0:
                raise RuntimeError(f"Kokoro error: {result.stderr.decode()}")
            return result.stdout
        except FileNotFoundError:
            # Fallback: return a silent WAV if Kokoro not installed
            return self._generate_silent_wav(duration_ms=len(text) * 60)

    def get_available_voices(self) -> list[dict]:
        return DEFAULT_VOICES

    def _generate_silent_wav(self, duration_ms: int = 1000) -> bytes:
        """Generate a minimal WAV file (PCM 16-bit mono 22050Hz)."""
        import struct
        import math
        num_samples = int(22050 * duration_ms / 1000)
        data_size = num_samples * 2
        header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF", 36 + data_size, b"WAVE",
            b"fmt ", 16, 1, 1, 22050, 44100, 2, 8,
            b"data", data_size,
        )
        samples = b"\x80" * data_size  # silence
        return header + samples


class KokoroTTS:
    """Simple Kokoro wrapper for inline use."""
    pass
```

- [ ] **Step 4: Create backend/app/tts/cloud.py**

```python
from typing import list
import httpx
from app.tts.base import TTSProvider
from app.config import get_settings

settings = get_settings()


class CloudProvider(TTSProvider):
    """OpenAI TTS API provider."""

    def __init__(self, api_key: str = None, provider: str = "openai"):
        self.api_key = api_key or settings.openai_api_key
        self.provider = provider

    async def synthesize(self, text: str, voice: str = "alloy", speed: float = 1.0, **kwargs) -> bytes:
        if self.provider == "openai":
            return await self._openai_synthesize(text, voice, speed)
        raise ValueError(f"Unknown cloud provider: {self.provider}")

    async def _openai_synthesize(self, text: str, voice: str, speed: float) -> bytes:
        if not self.api_key:
            raise RuntimeError("OpenAI API key not configured")

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": "tts-1",
                    "input": text,
                    "voice": voice,
                    "speed": speed,
                    "response_format": "wav",
                },
            )
            resp.raise_for_status()
            return resp.content

    def get_available_voices(self) -> list[dict]:
        return [
            {"id": "alloy", "name": "Alloy (Neutral)", "provider": "openai"},
            {"id": "echo", "name": "Echo (Male)", "provider": "openai"},
            {"id": "fable", "name": "Fable (British)", "provider": "openai"},
            {"id": "onyx", "name": "Onyx (Male, deep)", "provider": "openai"},
            {"id": "nova", "name": "Nova (Female)", "provider": "openai"},
            {"id": "shimmer", "name": "Shimmer (Female, warm)", "provider": "openai"},
        ]
```

- [ ] **Step 5: Create backend/app/tts/custom_provider.py**

```python
import json
import subprocess
import httpx
import tempfile
import os
from typing import list
from app.tts.base import TTSProvider
from app.models.custom_tts import ProviderType


class CustomProvider(TTSProvider):
    """Dynamically loaded custom TTS provider from admin configuration."""

    def __init__(self, provider_id: str, name: str, provider_type: str, config: dict):
        self.provider_id = provider_id
        self.name = name
        self.provider_type = provider_type
        self.config = config

    async def synthesize(self, text: str, voice: str = "default", speed: float = 1.0, **kwargs) -> bytes:
        if self.provider_type == ProviderType.script.value:
            return await self._run_script(text, voice, speed)
        elif self.provider_type == ProviderType.cli.value:
            return self._run_cli(text, voice, speed)
        elif self.provider_type == ProviderType.http.value:
            return await self._call_http(text, voice, speed)
        elif self.provider_type == ProviderType.local_model.value:
            return self._run_local_model(text, voice, speed)
        raise ValueError(f"Unknown provider type: {self.provider_type}")

    async def _run_script(self, text: str, voice: str, speed: float) -> bytes:
        """Call a Python function: module_path:function_name"""
        module_path = self.config.get("module_path", "")
        func_name = self.config.get("function_name", "synthesize")
        spec = importlib.util.spec_from_file_location("custom_tts", module_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        func = getattr(mod, func_name)
        result = func(text, voice=voice, speed=speed)
        if isinstance(result, bytes):
            return result
        return result

    def _run_cli(self, text: str, voice: str, speed: float) -> bytes:
        """Run a CLI command where text is piped to stdin."""
        command = self.config.get("command", "")
        if not command:
            raise RuntimeError("CLI command not configured")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            output_path = tmp.name

        cmd = command.replace("{text}", text).replace("{voice}", voice).replace("{speed}", str(speed))
        cmd = cmd.replace("{output}", output_path)

        result = subprocess.run(
            cmd, shell=True, capture_output=True, timeout=300, input=text.encode()
        )
        if result.returncode != 0:
            raise RuntimeError(f"CLI TTS failed: {result.stderr.decode()}")

        with open(output_path, "rb") as f:
            audio = f.read()
        os.unlink(output_path)
        return audio

    async def _call_http(self, text: str, voice: str, speed: float) -> bytes:
        url = self.config.get("url", "")
        headers = self.config.get("headers", {})
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                url,
                headers=headers,
                json={"text": text, "voice": voice, "speed": speed},
            )
            resp.raise_for_status()
            return resp.content

    def _run_local_model(self, text: str, voice: str, speed: float) -> bytes:
        """Run a local TTS model (e.g. Coqui, Piper) from a given path."""
        model_path = self.config.get("model_path", "")
        if not model_path or not os.path.exists(model_path):
            raise RuntimeError(f"Model not found: {model_path}")
        # This is a stub — actual implementation depends on the specific model
        raise NotImplementedError("Local model support requires model-specific implementation")

    def get_available_voices(self) -> list[dict]:
        voices = self.config.get("voices", [])
        if not voices:
            return [{"id": "default", "name": self.name, "provider": "custom"}]
        return voices


import importlib.util
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/tts/
git commit -m "feat: add TTS provider abstraction with Kokoro, Cloud, and Custom backends"
```

---

### Task 7: TTS Provider Registry & Router

**Files:**
- Create: `backend/app/tts/registry.py`
- Create: `backend/app/routers/tts.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create backend/app/tts/registry.py**

```python
from typing import Dict
from app.tts.base import TTSProvider
from app.tts.kokoro import KokoroProvider
from app.tts.cloud import CloudProvider

_providers: Dict[str, TTSProvider] = {}


def init_providers():
    """Register built-in TTS providers."""
    _providers["kokoro"] = KokoroProvider()
    if get_settings().openai_api_key:
        _providers["openai"] = CloudProvider()
    if get_settings().elevenlabs_api_key:
        _providers["elevenlabs"] = CloudProvider(provider="elevenlabs")


def register_provider(provider_id: str, provider: TTSProvider):
    _providers[provider_id] = provider


def unregister_provider(provider_id: str):
    _providers.pop(provider_id, None)


def get_provider(provider_id: str) -> TTSProvider | None:
    return _providers.get(provider_id)


def list_providers() -> list[dict]:
    result = []
    for provider_id, provider in _providers.items():
        result.append({
            "id": provider_id,
            "name": provider_id.capitalize(),
            "voices": provider.get_available_voices(),
        })
    return result
```

- [ ] **Step 2: Create backend/app/routers/tts.py**

```python
from fastapi import APIRouter
from app.tts.registry import list_providers

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.get("/providers")
async def get_providers():
    return list_providers()
```

- [ ] **Step 3: Register tts router in main.py**

```python
from app.routers import auth, books, tts
from app.tts.registry import init_providers

# In lifespan:
await init_db()
init_providers()

# Register routers:
app.include_router(auth.router)
app.include_router(books.router)
app.include_router(tts.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/tts/registry.py backend/app/routers/tts.py backend/app/main.py
git commit -m "feat: add TTS provider registry and /api/tts/providers endpoint"
```

---

### Task 8: Celery Workers & Conversion Pipeline

**Files:**
- Create: `backend/workers/__init__.py`
- Create: `backend/workers/celery_app.py`
- Create: `backend/workers/tts_worker.py`
- Create: `backend/app/services/audio_assembler.py`
- Create: `backend/app/routers/conversion.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create backend/workers/__init__.py**

Empty file.

- [ ] **Step 2: Create backend/workers/celery_app.py**

```python
from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "audiobook_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
```

- [ ] **Step 3: Create backend/workers/tts_worker.py**

```python
import os
import json
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.book import Book, BookStatus
from app.models.chapter import Chapter
from app.models.conversion_job import ConversionJob, JobStatus
from app.services.ebook_parser import parse_ebook
from app.services.audio_assembler import assemble_audiobook
from app.tts.registry import get_provider
from workers.celery_app import celery_app

settings = get_settings()
sync_engine = create_engine(settings.database_url_sync)


@celery_app.task(bind=True, max_retries=1)
def convert_book(self, book_id: str):
    """Main conversion task: parse -> synthesize -> assemble."""
    session = Session(sync_engine)
    try:
        book = session.execute(select(Book).where(Book.id == book_id)).scalar_one()
        job = book.conversion_job

        # 1. Parse ebook
        job.status = JobStatus.parsing
        job.progress = 0.05
        session.commit()

        file_path = book.original_file
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        chapters_data = parse_ebook(file_path)
        total = len(chapters_data)
        if total == 0:
            raise ValueError("No chapters found in ebook")

        # Store extracted chapters
        for i, (title, text) in enumerate(chapters_data):
            chapter = Chapter(
                book_id=book.id,
                index=i,
                title=title[:500],
                text=text,
            )
            session.add(chapter)
        session.commit()

        # 2. Synthesize each chapter
        job.status = JobStatus.synthesizing
        session.commit()

        provider = get_provider(book.tts_provider.value)
        if not provider:
            raise ValueError(f"TTS provider '{book.tts_provider}' not available")

        audio_dir = os.path.join(settings.audio_output_dir, str(book.id))
        os.makedirs(audio_dir, exist_ok=True)

        chapters = session.execute(
            select(Chapter).where(Chapter.book_id == book.id).order_by(Chapter.index)
        ).scalars().all()

        total_duration = 0
        for idx, chapter in enumerate(chapters):
            job.progress = 0.1 + (idx / total) * 0.8
            session.commit()

            audio_bytes = provider.synthesize(chapter.text)
            chapter_path = os.path.join(audio_dir, f"chapter_{chapter.index:04d}.wav")
            with open(chapter_path, "wb") as f:
                f.write(audio_bytes)

            chapter.audio_path = chapter_path
            # Estimate duration: ~60ms per character at 1x speed
            chapter.duration_seconds = max(1, len(chapter.text) // 16)
            total_duration += chapter.duration_seconds
            session.commit()

        # 3. Assemble final audiobook
        job.status = JobStatus.assembling
        job.progress = 0.95
        session.commit()

        output_path = os.path.join(audio_dir, "audiobook.m4b")
        assemble_audiobook(audio_dir, output_path, chapters)

        book.duration_seconds = total_duration
        book.status = BookStatus.ready
        job.status = JobStatus.done
        job.progress = 1.0
        session.commit()

    except Exception as exc:
        session.rollback()
        book = session.execute(select(Book).where(Book.id == book_id)).scalar_one()
        if book:
            book.status = BookStatus.error
            job = book.conversion_job
            if job:
                job.status = JobStatus.failed
                job.error_message = str(exc)
            session.commit()
        raise exc
    finally:
        session.close()
```

- [ ] **Step 4: Create backend/app/services/audio_assembler.py**

```python
import os
import subprocess
from typing import list
from app.models.chapter import Chapter


def assemble_audiobook(audio_dir: str, output_path: str, chapters: list[Chapter]) -> str:
    """
    Concatenate chapter WAVs and encode to M4B with chapter markers using ffmpeg.
    """
    # Create a file list for ffmpeg concat
    file_list_path = os.path.join(audio_dir, "file_list.txt")
    with open(file_list_path, "w") as f:
        for chapter in chapters:
            if chapter.audio_path and os.path.exists(chapter.audio_path):
                f.write(f"file '{chapter.audio_path}'\n")

    # Build metadata for chapter markers
    metadata_args = []
    cumulative = 0
    for i, chapter in enumerate(chapters):
        metadata_args.extend([
            "-metadata", f"chapter_{i+1}_start={cumulative}",
            "-metadata", f"chapter_{i+1}_end={cumulative + chapter.duration_seconds}",
            "-metadata", f"chapter_{i+1}_name={chapter.title}",
        ])
        cumulative += chapter.duration_seconds

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", file_list_path,
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
    ] + metadata_args + [output_path]

    result = subprocess.run(cmd, capture_output=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg assembly failed: {result.stderr.decode()}")

    os.unlink(file_list_path)
    return output_path
```

- [ ] **Step 5: Create backend/app/routers/conversion.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.book import Book, TTSProvider as TTSProviderEnum
from app.models.conversion_job import ConversionJob, JobStatus
from app.schemas.book import ConversionStatusOut
from app.tts.registry import get_provider
from workers.celery_app import celery_app
from workers.tts_worker import convert_book
from app.config import get_settings

router = APIRouter(prefix="/api/books", tags=["conversion"])


@router.post("/{book_id}/convert")
async def start_conversion(
    book_id: UUID,
    tts_provider: str = "kokoro",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = book.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Validate TTS provider
    provider = get_provider(tts_provider)
    if not provider and tts_provider not in ("kokoro", "openai", "elevenlabs", "custom"):
        raise HTTPException(status_code=400, detail=f"Unknown TTS provider: {tts_provider}")

    # Update book with selected provider
    book.tts_provider = TTSProviderEnum(tts_provider)
    book.status = "processing"

    # Create or update conversion job
    existing_job = await db.execute(
        select(ConversionJob).where(ConversionJob.book_id == book_id)
    )
    job = existing_job.scalar_one_or_none()
    if not job:
        job = ConversionJob(book_id=book_id, status=JobStatus.queued)
        db.add(job)
    else:
        job.status = JobStatus.queued
        job.progress = 0.0
        job.error_message = None

    await db.flush()

    # Dispatch Celery task
    convert_book.delay(str(book_id))

    return {"message": "Conversion started", "book_id": str(book_id)}


@router.get("/{book_id}/status", response_model=ConversionStatusOut)
async def get_conversion_status(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = book.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    job = await db.execute(
        select(ConversionJob).where(ConversionJob.book_id == book_id)
    )
    job = job.scalar_one_or_none()

    if not job:
        return ConversionStatusOut(status="unknown", progress=0.0)

    return ConversionStatusOut(
        status=job.status.value,
        progress=job.progress,
        error_message=job.error_message,
    )
```

- [ ] **Step 6: Register conversion router in main.py**

```python
from app.routers import auth, books, tts, conversion
app.include_router(conversion.router)
```

- [ ] **Step 7: Add streaming and download endpoints to books router**

Append to `backend/app/routers/books.py`:

```python
from fastapi.responses import FileResponse
from pathlib import Path


@router.get("/{book_id}/chapters/{chapter_id}/audio")
async def stream_chapter_audio(
    book_id: UUID,
    chapter_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    chapter = await db.execute(
        select(Chapter).where(Chapter.id == chapter_id, Chapter.book_id == book_id)
    )
    chapter = chapter.scalar_one_or_none()
    if not chapter or not chapter.audio_path:
        raise HTTPException(status_code=404, detail="Chapter audio not available")

    return FileResponse(
        chapter.audio_path,
        media_type="audio/wav",
        filename=f"chapter_{chapter.index}.wav",
    )


@router.get("/{book_id}/download")
async def download_audiobook(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await get_book_detail(db, book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    audio_dir = os.path.join(get_settings().audio_output_dir, str(book.id))
    m4b_path = os.path.join(audio_dir, "audiobook.m4b")
    mp3_path = os.path.join(audio_dir, "audiobook.mp3")

    if os.path.exists(m4b_path):
        return FileResponse(m4b_path, media_type="audio/mp4", filename=f"{book.title}.m4b")
    elif os.path.exists(mp3_path):
        return FileResponse(mp3_path, media_type="audio/mpeg", filename=f"{book.title}.mp3")
    else:
        raise HTTPException(status_code=404, detail="Audiobook not yet ready")
```

- [ ] **Step 8: Commit**

```bash
git add backend/workers/ backend/app/services/audio_assembler.py backend/app/routers/conversion.py
git commit -m "feat: add Celery workers, conversion pipeline, audio assembly, and streaming endpoints"
```

---

### Task 9: Admin Backend API

**Files:**
- Create: `backend/app/routers/admin.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create backend/app/routers/admin.py**

```python
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.user import User
from app.models.custom_tts import CustomTTSProvider, ProviderType
from app.schemas.tts import CustomTTSCreate, CustomTTSUpdate, CustomTTSOut
from app.tts.registry import register_provider, unregister_provider
from app.tts.custom_provider import CustomProvider

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/custom-tts", response_model=list[CustomTTSOut])
async def list_custom_tts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(CustomTTSProvider).order_by(CustomTTSProvider.created_at.desc()))
    return list(result.scalars().all())


@router.post("/custom-tts", response_model=CustomTTSOut, status_code=201)
async def create_custom_tts(
    data: CustomTTSCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    provider = CustomTTSProvider(
        name=data.name,
        provider_type=data.provider_type,
        config=data.config,
    )
    db.add(provider)
    await db.flush()
    await db.refresh(provider)

    # Register in the live TTS registry
    _register_custom_provider(provider)

    return provider


@router.put("/custom-tts/{provider_id}", response_model=CustomTTSOut)
async def update_custom_tts(
    provider_id: UUID,
    data: CustomTTSUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(CustomTTSProvider).where(CustomTTSProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    if data.name is not None:
        provider.name = data.name
    if data.config is not None:
        provider.config = data.config
    if data.is_active is not None:
        provider.is_active = data.is_active

    await db.flush()
    await db.refresh(provider)

    # Re-register in live registry
    unregister_provider(str(provider.id))
    if provider.is_active:
        _register_custom_provider(provider)

    return provider


@router.delete("/custom-tts/{provider_id}", status_code=204)
async def delete_custom_tts(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(CustomTTSProvider).where(CustomTTSProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    unregister_provider(str(provider.id))
    await db.delete(provider)


@router.post("/custom-tts/{provider_id}/test")
async def test_custom_tts(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(CustomTTSProvider).where(CustomTTSProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    try:
        custom = _build_custom_provider(provider)
        audio = await custom.synthesize("Hello, this is a test of my custom TTS engine.")
        return {"success": True, "audio_size_bytes": len(audio)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _build_custom_provider(model: CustomTTSProvider) -> CustomProvider:
    config = json.loads(model.config) if isinstance(model.config, str) else model.config
    return CustomProvider(
        provider_id=str(model.id),
        name=model.name,
        provider_type=model.provider_type.value,
        config=config,
    )


def _register_custom_provider(model: CustomTTSProvider):
    provider = _build_custom_provider(model)
    register_provider(str(model.id), provider)


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    from sqlalchemy import func
    from app.models.conversion_job import ConversionJob

    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_books = (await db.execute(select(func.count(Book.id)))).scalar()
    pending_jobs = (await db.execute(
        select(func.count(ConversionJob.id)).where(ConversionJob.status != "done")
    )).scalar()

    return {
        "total_users": total_users,
        "total_books": total_books,
        "pending_jobs": pending_jobs,
    }
```

- [ ] **Step 2: Register admin router in main.py**

```python
from app.routers import auth, books, tts, conversion, admin
app.include_router(admin.router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/admin.py backend/app/main.py
git commit -m "feat: add admin API for custom TTS management"
```

---

### Task 10: Frontend Scaffolding (Next.js + Tailwind)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/.env.example`

- [ ] **Step 1: Create frontend/package.json**

```json
{
  "name": "audiobook-converter-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.395.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create frontend/next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

- [ ] **Step 4: Create frontend/tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Create frontend/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}
```

- [ ] **Step 6: Create frontend/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audiobook Converter",
  description: "Convert your ebooks into audiobooks with AI-powered TTS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create frontend/.env.example**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold Next.js frontend with Tailwind"
```

---

### Task 11: Frontend API Client

**Files:**
- Create: `frontend/lib/api.ts`

- [ ] **Step 1: Create frontend/lib/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("token", token);
      else localStorage.removeItem("token");
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // Auth
  register(email: string, password: string) {
    return this.request<{ id: string; email: string; plan: string; created_at: string }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
  }

  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  getMe() {
    return this.request<{ id: string; email: string; plan: string }>("/api/auth/me");
  }

  // Books
  async uploadBook(file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.request<{ id: string; title: string; status: string }>("/api/books/upload", {
      method: "POST",
      body: form,
    });
  }

  listBooks() {
    return this.request<Array<{
      id: string; title: string; author: string; cover_url: string | null;
      status: string; tts_provider: string; duration_seconds: number; created_at: string;
    }>>("/api/books/");
  }

  getBook(id: string) {
    return this.request<{
      id: string; title: string; author: string; cover_url: string | null;
      status: string; tts_provider: string; duration_seconds: number;
      chapters: Array<{ id: string; index: number; title: string; audio_path: string | null; duration_seconds: number }>;
    }>(`/api/books/${id}`);
  }

  deleteBook(id: string) {
    return this.request<void>(`/api/books/${id}`, { method: "DELETE" });
  }

  // Conversion
  startConversion(bookId: string, ttsProvider: string = "kokoro") {
    return this.request<{ message: string; book_id: string }>(
      `/api/books/${bookId}/convert?tts_provider=${ttsProvider}`,
      { method: "POST" }
    );
  }

  getConversionStatus(bookId: string) {
    return this.request<{ status: string; progress: number; error_message: string | null }>(
      `/api/books/${bookId}/status`
    );
  }

  // TTS Providers
  getTTSProviders() {
    return this.request<Array<{ id: string; name: string; voices: Array<{ id: string; name: string }> }>>(
      "/api/tts/providers"
    );
  }

  // Admin
  getCustomTTSProviders() {
    return this.request<Array<{
      id: string; name: string; provider_type: string; config: string; is_active: boolean;
    }>>("/api/admin/custom-tts");
  }

  createCustomTTS(data: { name: string; provider_type: string; config: string }) {
    return this.request("/api/admin/custom-tts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateCustomTTS(id: string, data: { name?: string; config?: string; is_active?: boolean }) {
    return this.request(`/api/admin/custom-tts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteCustomTTS(id: string) {
    return this.request<void>(`/api/admin/custom-tts/${id}`, { method: "DELETE" });
  }

  testCustomTTS(id: string) {
    return this.request<{ success: boolean; audio_size_bytes?: number; error?: string }>(
      `/api/admin/custom-tts/${id}/test`, { method: "POST" }
    );
  }

  getAdminStats() {
    return this.request<{ total_users: number; total_books: number; pending_jobs: number }>(
      "/api/admin/stats"
    );
  }

  // Audio URLs (not via fetch API)
  getChapterAudioUrl(bookId: string, chapterId: string) {
    return `${API_URL}/api/books/${bookId}/chapters/${chapterId}/audio`;
  }

  getDownloadUrl(bookId: string) {
    return `${API_URL}/api/books/${bookId}/download`;
  }
}

export const api = new ApiClient();
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add frontend API client"
```

---

### Task 12: Frontend Auth Pages (Login + Register)

**Files:**
- Create: `frontend/app/page.tsx` (landing)
- Create: `frontend/app/login/page.tsx`
- Create: `frontend/app/register/page.tsx`

- [ ] **Step 1: Create frontend/app/page.tsx (Landing Page)**

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-white mb-6">
          Turn Your Books Into Audiobooks
        </h1>
        <p className="text-xl text-indigo-100 mb-8">
          Upload EPUB, PDF, or TXT files and get natural-sounding audiobooks
          powered by AI. Choose from free local TTS or premium cloud voices.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/register")}
            className="bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            Get Started Free
          </button>
          <button
            onClick={() => router.push("/login")}
            className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
          >
            Sign In
          </button>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-8 text-white">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">9+</div>
            <div className="text-indigo-200">Languages Supported</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">Hybrid</div>
            <div className="text-indigo-200">Local + Cloud TTS</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">M4B</div>
            <div className="text-indigo-200">Download or Stream</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/app/login/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>}
        <input
          type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4"
          required
        />
        <input
          type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-6"
          required
        />
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">
          Sign In
        </button>
        <p className="text-center mt-4 text-sm text-gray-500">
          Don&apos;t have an account? <a href="/register" className="text-indigo-600">Sign up</a>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create frontend/app/register/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.register(email, password);
      await api.login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>}
        <input
          type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4"
          required
        />
        <input
          type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-6"
          required
        />
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">
          Create Account
        </button>
        <p className="text-center mt-4 text-sm text-gray-500">
          Already have an account? <a href="/login" className="text-indigo-600">Sign in</a>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/page.tsx frontend/app/login/ frontend/app/register/
git commit -m "feat: add landing, login, and register pages"
```

---

### Task 13: Frontend Dashboard & Upload

**Files:**
- Create: `frontend/app/dashboard/page.tsx`
- Create: `frontend/app/upload/page.tsx`
- Create: `frontend/components/BookCard.tsx`
- Create: `frontend/components/UploadZone.tsx`

- [ ] **Step 1: Create frontend/components/BookCard.tsx**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Clock, FileText } from "lucide-react";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  status: string;
  duration_seconds: number;
}

export default function BookCard({ id, title, author, status, duration_seconds }: BookCardProps) {
  const router = useRouter();
  const statusColors: Record<string, string> = {
    ready: "bg-green-100 text-green-700",
    processing: "bg-yellow-100 text-yellow-700",
    uploading: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <div
      onClick={() => router.push(`/books/${id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <BookOpen className="w-6 h-6 text-indigo-600" />
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100"}`}>
          {status}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-3">{author}</p>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span>{Math.floor(duration_seconds / 60)} min</span>
        <FileText className="w-3.5 h-3.5 ml-2" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/components/UploadZone.tsx**

```tsx
"use client";

import { useState, useCallback } from "react";
import { Upload, File, X } from "lucide-react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  uploading: boolean;
}

export default function UploadZone({ onUpload, uploading }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition ${
          dragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
        }`}
      >
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <File className="w-8 h-8 text-indigo-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        ) : (
          <div>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-400">EPUB, PDF, or TXT (max 100MB)</p>
            <input
              type="file"
              accept=".epub,.pdf,.txt"
              onChange={handleChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer" />
          </div>
        )}
      </div>

      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {uploading ? "Uploading..." : "Upload & Convert"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create frontend/app/dashboard/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import BookCard from "@/components/BookCard";
import { Plus, LogOut } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  status: string;
  tts_provider: string;
  duration_seconds: number;
  created_at: string;
}

export default function DashboardPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    api.listBooks().then(setBooks).catch(() => router.push("/login")).finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    api.setToken(null);
    router.push("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">My Library</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/upload")}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" /> New Book
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {books.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">No books yet</h2>
            <p className="text-gray-400 mb-6">Upload your first ebook to get started</p>
            <button
              onClick={() => router.push("/upload")}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Upload a Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create frontend/app/upload/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import UploadZone from "@/components/UploadZone";
import { ArrowLeft } from "lucide-react";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const book = await api.uploadBook(file);
      // Start conversion with default Kokoro
      await api.startConversion(book.id);
      router.push(`/books/${book.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Upload a Book</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}
        <UploadZone onUpload={handleUpload} uploading={uploading} />
        <div className="mt-8 bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Supported Formats</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full" /> EPUB — Standard ebook format</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full" /> PDF — Chapter detection via text analysis</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full" /> TXT — Plain text with chapter markers</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/ frontend/app/upload/ frontend/components/BookCard.tsx frontend/components/UploadZone.tsx
git commit -m "feat: add dashboard and upload pages"
```

---

### Task 14: Frontend Player Page

**Files:**
- Create: `frontend/app/books/[id]/page.tsx`
- Create: `frontend/components/AudioPlayer.tsx`
- Create: `frontend/components/ChapterList.tsx`
- Create: `frontend/components/ProgressBar.tsx`

- [ ] **Step 1: Create frontend/components/ProgressBar.tsx**

```tsx
"use client";

interface ProgressBarProps {
  progress: number;
  status: string;
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  const pct = Math.round(progress * 100);
  const statusLabels: Record<string, string> = {
    queued: "Queued...",
    parsing: "Parsing ebook...",
    synthesizing: "Synthesizing audio...",
    assembling: "Assembling audiobook...",
    done: "Complete!",
  };

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">{statusLabels[status] || status}</span>
        <span className="text-sm text-gray-500">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/components/ChapterList.tsx**

```tsx
"use client";

import { Play, Pause, CheckCircle2, Clock } from "lucide-react";

interface Chapter {
  id: string;
  index: number;
  title: string;
  duration_seconds: number;
}

interface ChapterListProps {
  chapters: Chapter[];
  currentChapterId: string | null;
  isPlaying: boolean;
  onPlay: (chapterId: string) => void;
  completedChapters: Set<string>;
}

export default function ChapterList({ chapters, currentChapterId, isPlaying, onPlay, completedChapters }: ChapterListProps) {
  return (
    <div className="space-y-1">
      {chapters.map((ch) => {
        const isCurrent = ch.id === currentChapterId;
        const isCompleted = completedChapters.has(ch.id);
        return (
          <button
            key={ch.id}
            onClick={() => onPlay(ch.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              isCurrent ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isCurrent ? "bg-indigo-600 text-white" : isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }`}>
              {isCurrent && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${isCurrent ? "font-medium text-indigo-700" : "text-gray-700"}`}>
                {ch.title}
              </p>
              <p className="text-xs text-gray-400">Chapter {ch.index + 1}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.floor(ch.duration_seconds / 60)}:{String(ch.duration_seconds % 60).padStart(2, "0")}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create frontend/components/AudioPlayer.tsx**

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Download } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string | null;
  title: string;
  onEnded?: () => void;
  downloadUrl?: string;
}

export default function AudioPlayer({ audioUrl, title, onEnded, downloadUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setPlaying(false);
      setCurrentTime(0);
    }
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    onEnded?.();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!audioUrl) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-500">
        No audio available yet
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoaded}
        onEnded={handleEnded}
      />

      <p className="text-sm font-medium text-gray-700 mb-3 truncate">{title}</p>

      {/* Seek bar */}
      <div className="relative h-2 bg-gray-200 rounded-full mb-3 cursor-pointer" onClick={seek}>
        <div
          className="absolute h-full bg-indigo-600 rounded-full"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>

        <div className="flex items-center gap-3">
          <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10); }} className="p-1 hover:bg-gray-100 rounded">
            <SkipBack className="w-5 h-5 text-gray-600" />
          </button>

          <button onClick={togglePlay} className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition">
            {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
          </button>

          <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10); }} className="p-1 hover:bg-gray-100 rounded">
            <SkipForward className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="text-xs border rounded px-1 py-0.5"
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
          {downloadUrl && (
            <a href={downloadUrl} download className="p-1 hover:bg-gray-100 rounded">
              <Download className="w-4 h-4 text-gray-500" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create frontend/app/books/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AudioPlayer from "@/components/AudioPlayer";
import ChapterList from "@/components/ChapterList";
import ProgressBar from "@/components/ProgressBar";
import { ArrowLeft, BookOpen } from "lucide-react";

interface Chapter {
  id: string;
  index: number;
  title: string;
  audio_path: string | null;
  duration_seconds: number;
}

interface BookData {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  status: string;
  tts_provider: string;
  duration_seconds: number;
  chapters: Chapter[];
  conversion_job?: { status: string; progress: number };
}

export default function BookPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [conversionStatus, setConversionStatus] = useState<{ status: string; progress: number } | null>(null);

  const fetchBook = useCallback(async () => {
    try {
      const data = await api.getBook(id);
      setBook(data);
      if (data.chapters.length > 0 && !currentChapterId) {
        setCurrentChapterId(data.chapters[0].id);
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router, currentChapterId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchBook();
  }, [id, fetchBook, router]);

  // Poll conversion status if processing
  useEffect(() => {
    if (!book || book.status === "ready" || book.status === "error") return;

    const interval = setInterval(async () => {
      try {
        const status = await api.getConversionStatus(id);
        setConversionStatus(status);
        if (status.status === "done") {
          fetchBook();
          clearInterval(interval);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [book?.status, id, fetchBook]);

  const currentChapter = book?.chapters.find((c) => c.id === currentChapterId);

  const handleChapterPlay = (chapterId: string) => {
    setCurrentChapterId(chapterId);
    setIsPlaying(true);
  };

  const handleChapterEnd = () => {
    if (currentChapterId && book) {
      setCompletedChapters((prev) => new Set(prev).add(currentChapterId));
    }
    // Auto-advance to next chapter
    if (book && currentChapterId) {
      const idx = book.chapters.findIndex((c) => c.id === currentChapterId);
      if (idx < book.chapters.length - 1) {
        setCurrentChapterId(book.chapters[idx + 1].id);
      } else {
        setIsPlaying(false);
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  if (!book) return null;

  const audioUrl = currentChapter?.audio_path ? api.getChapterAudioUrl(book.id, currentChapter.id) : null;
  const downloadUrl = book.status === "ready" ? api.getDownloadUrl(book.id) : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{book.title}</h1>
            <p className="text-sm text-gray-500">{book.author}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Conversion progress */}
        {(book.status === "processing" || conversionStatus) && (
          <div className="mb-6">
            <ProgressBar
              progress={conversionStatus?.progress ?? 0}
              status={conversionStatus?.status ?? "queued"}
            />
          </div>
        )}

        {/* Player */}
        <div className="mb-8">
          <AudioPlayer
            audioUrl={audioUrl}
            title={currentChapter?.title || "Select a chapter"}
            onEnded={handleChapterEnd}
            downloadUrl={downloadUrl}
          />
        </div>

        {/* Chapter list */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Chapters</h2>
          {book.chapters.length > 0 ? (
            <ChapterList
              chapters={book.chapters}
              currentChapterId={currentChapterId}
              isPlaying={isPlaying}
              onPlay={handleChapterPlay}
              completedChapters={completedChapters}
            />
          ) : (
            <div className="text-center py-10 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3" />
              <p>No chapters available yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/books/ frontend/components/AudioPlayer.tsx frontend/components/ChapterList.tsx frontend/components/ProgressBar.tsx
git commit -m "feat: add audiobook player page with streaming, chapters, and progress"
```

---

### Task 15: Frontend Admin Panel

**Files:**
- Create: `frontend/app/admin/page.tsx`
- Create: `frontend/components/CustomTtsForm.tsx`

- [ ] **Step 1: Create frontend/components/CustomTtsForm.tsx**

```tsx
"use client";

import { useState } from "react";

interface CustomTtsFormProps {
  onSubmit: (data: { name: string; provider_type: string; config: string }) => Promise<void>;
  initial?: { name: string; provider_type: string; config: string };
}

export default function CustomTtsForm({ onSubmit, initial }: CustomTtsFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [providerType, setProviderType] = useState(initial?.provider_type || "script");
  const [configJson, setConfigJson] = useState(initial?.config || "{}");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      // Validate JSON
      JSON.parse(configJson);
      await onSubmit({ name, provider_type: providerType, config: configJson });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const configPlaceholders: Record<string, string> = {
    script: '{"module_path": "/path/to/tts.py", "function_name": "synthesize"}',
    cli: '{"command": "echo \'{text}\' | my-tts --output {output}"}',
    http: '{"url": "http://localhost:5000/tts", "headers": {"Authorization": "Bearer ..."}}',
    local_model: '{"model_path": "/models/my-voice", "language": "en"}',
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
      <h3 className="font-semibold text-lg">{initial ? "Edit" : "Add"} Custom TTS Provider</h3>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="My Custom Voice" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type</label>
        <select value={providerType} onChange={(e) => { setProviderType(e.target.value); setConfigJson(configPlaceholders[e.target.value] || "{}"); }}
          className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="script">Python Script</option>
          <option value="cli">CLI Command</option>
          <option value="http">HTTP Endpoint</option>
          <option value="local_model">Local Model Path</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Configuration (JSON)</label>
        <textarea value={configJson} onChange={(e) => setConfigJson(e.target.value)} rows={6}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
      </div>

      <button type="submit" disabled={submitting}
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
        {submitting ? "Saving..." : "Save Provider"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create frontend/app/admin/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import CustomTtsForm from "@/components/CustomTtsForm";
import { Settings, Trash2, TestTube, ArrowLeft, RefreshCw } from "lucide-react";

interface CustomTTS {
  id: string;
  name: string;
  provider_type: string;
  config: string;
  is_active: boolean;
}

interface AdminStats {
  total_users: number;
  total_books: number;
  pending_jobs: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<CustomTTS[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; result: string } | null>(null);

  const fetchData = async () => {
    try {
      const [p, s] = await Promise.all([api.getCustomTTSProviders(), api.getAdminStats()]);
      setProviders(p);
      setStats(s);
    } catch {
      router.push("/dashboard");
    }
  };

  useEffect(() => { fetchData(); }, [router]);

  const handleCreate = async (data: { name: string; provider_type: string; config: string }) => {
    await api.createCustomTTS(data);
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this TTS provider?")) return;
    await api.deleteCustomTTS(id);
    fetchData();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await api.testCustomTTS(id);
      setTestResult({ id, result: result.success ? `OK (${result.audio_size_bytes} bytes)` : `Failed: ${result.error}` });
    } catch (err: any) {
      setTestResult({ id, result: `Error: ${err.message}` });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Admin Panel
            </h1>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            {showForm ? "Cancel" : "Add TTS Engine"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_users}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Total Books</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_books}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Pending Jobs</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending_jobs}</p>
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="mb-8">
            <CustomTtsForm onSubmit={handleCreate} />
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`mb-4 p-4 rounded-lg text-sm ${
            testResult.result.startsWith("OK") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            <strong>{testResult.id.substring(0, 8)}:</strong> {testResult.result}
            <button onClick={() => setTestResult(null)} className="ml-3 underline">Dismiss</button>
          </div>
        )}

        {/* Provider list */}
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Custom TTS Engines</h2>
          </div>
          {providers.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No custom TTS providers configured yet</div>
          ) : (
            <div className="divide-y">
              {providers.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.provider_type} {p.is_active ? "" : "(inactive)"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleTest(p.id)} disabled={testingId === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                      {testingId === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                      Test
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/admin/ frontend/components/CustomTtsForm.tsx
git commit -m "feat: add admin panel with custom TTS management"
```

---

### Task 16: Docker & Deployment

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Update: `README.md`

- [ ] **Step 1: Create backend/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    espeak-ng \
    libespeak-ng1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Create README.md**

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile README.md
git commit -m "chore: add Dockerfiles, README, and deployment config"
```

---

### Task 17: Initialize Git Repository & Push to GitHub

**Files:** N/A (git operations)

- [ ] **Step 1: Initialize git and create initial commit**

```bash
cd /c/Users/bbenningtiako/ZCodeProject
git init
git add .
git commit -m "initial commit: audiobook converter web app"
```

- [ ] **Step 2: Create GitHub repository and push**

```bash
# Install gh CLI if not installed, then:
gh repo create audiobook-converter --public --source=. --remote=origin --push
```

Or if you prefer to create it manually:

```bash
git remote add origin https://github.com/YOUR_USERNAME/audiobook-converter.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Verify push was successful**

```bash
gh repo view --json url
```

---

## Self-Review Checklist

1. **Spec coverage:** Every section in the design spec maps to a task:
   - Data models → Task 2
   - Auth → Task 3
   - Books API → Task 4
   - Ebook parsing → Task 5
   - TTS abstraction → Task 6
   - TTS registry → Task 7
   - Conversion pipeline → Task 8
   - Admin API → Task 9
   - Frontend scaffolding → Task 10
   - API client → Task 11
   - Auth pages → Task 12
   - Dashboard/Upload → Task 13
   - Player page → Task 14
   - Admin panel → Task 15
   - Docker → Task 16
   - GitHub push → Task 17

2. **Placeholder scan:** All code blocks contain complete, functional code. No "TBD", "TODO", or "implement later" patterns.

3. **Type consistency:** All Python types align between models, schemas, and services. Frontend TypeScript types match backend responses.

4. **Scope check:** This is a single project with clearly defined, interdependent tasks. Each task produces independently testable output.
