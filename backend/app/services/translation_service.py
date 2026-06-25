"""
Translation service abstraction supporting multiple providers.
- LibreTranslate (self-hosted, free)
- OpenAI GPT-4o (cloud, paid)
- Google Cloud Translation (cloud, paid)
"""
from typing import Callable, Awaitable
import httpx
from app.config import get_settings

settings = get_settings()


class TranslationService:
    """Translate text between languages using configured provider."""

    def __init__(self):
        self.provider = settings.translation_provider or "libre"

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if source_lang == target_lang:
            return text

        if self.provider == "libre":
            return await self._libre_translate(text, source_lang, target_lang)
        elif self.provider == "openai":
            return await self._openai_translate(text, source_lang, target_lang)
        elif self.provider == "google":
            return await self._google_translate(text, source_lang, target_lang)
        raise ValueError(f"Unknown translation provider: {self.provider}")

    async def detect_language(self, text: str) -> str | None:
        if self.provider == "libre":
            return await self._libre_detect(text)
        return "en"  # fallback

    async def _libre_translate(self, text: str, src: str, tgt: str) -> str:
        url = settings.libre_translate_url or "http://localhost:5000/translate"
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json={
                "q": text,
                "source": src,
                "target": tgt,
                "format": "text",
            })
            resp.raise_for_status()
            return resp.json().get("translatedText", text)

    async def _libre_detect(self, text: str) -> str | None:
        url = (settings.libre_translate_url or "http://localhost:5000").rstrip("/") + "/detect"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json={"q": text[:500]})
                resp.raise_for_status()
                results = resp.json()
                if results and len(results) > 0:
                    return results[0].get("language")
        except Exception:
            pass
        return None

    async def _openai_translate(self, text: str, src: str, tgt: str) -> str:
        if not settings.openai_api_key:
            raise RuntimeError("OpenAI API key not configured for translation")

        from app.services.languages import get_language
        src_name = (get_language(src) or {}).get("name", src)
        tgt_name = (get_language(tgt) or {}).get("name", tgt)

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": f"You are a translator. Translate the following text from {src_name} to {tgt_name}. Return ONLY the translated text, nothing else."},
                        {"role": "user", "content": text[:4000]},
                    ],
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()

    async def _google_translate(self, text: str, src: str, tgt: str) -> str:
        if not settings.google_api_key:
            raise RuntimeError("Google API key not configured")
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"https://translation.googleapis.com/language/translate/v2",
                params={
                    "key": settings.google_api_key,
                    "q": text[:5000],
                    "source": src,
                    "target": tgt,
                    "format": "text",
                },
            )
            resp.raise_for_status()
            return resp.json()["data"]["translations"][0]["translatedText"]
