import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    book_id: Mapped[str] = mapped_column(String(36), ForeignKey("books.id"), nullable=False)
    chapter_id: Mapped[str] = mapped_column(String(36), ForeignKey("chapters.id"), nullable=False)
    position_seconds: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    book = relationship("Book")
    chapter = relationship("Chapter")
