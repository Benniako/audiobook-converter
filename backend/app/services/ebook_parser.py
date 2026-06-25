import os
import re
from typing import List, Tuple
import ebooklib
from ebooklib import epub
import fitz  # PyMuPDF


def parse_epub(file_path: str) -> List[Tuple[str, str]]:
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


def parse_pdf(file_path: str) -> List[Tuple[str, str]]:
    doc = fitz.open(file_path)
    chapters = []
    current_title = "Chapter 1"
    current_text: List[str] = []

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


def parse_txt(file_path: str) -> List[Tuple[str, str]]:
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

    if not chapters:
        chapters.append(("Full Book", text))

    return chapters


def parse_ebook(file_path: str) -> List[Tuple[str, str]]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".epub":
        return parse_epub(file_path)
    elif ext == ".pdf":
        return parse_pdf(file_path)
    elif ext == ".txt":
        return parse_txt(file_path)
    else:
        raise ValueError(f"Unsupported format: {ext}")
