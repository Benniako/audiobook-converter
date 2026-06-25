from typing import List
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

    def get_available_voices(self) -> List[dict]:
        return [
            {"id": "alloy", "name": "Alloy (Neutral)", "provider": "openai"},
            {"id": "echo", "name": "Echo (Male)", "provider": "openai"},
            {"id": "fable", "name": "Fable (British)", "provider": "openai"},
            {"id": "onyx", "name": "Onyx (Male, deep)", "provider": "openai"},
            {"id": "nova", "name": "Nova (Female)", "provider": "openai"},
            {"id": "shimmer", "name": "Shimmer (Female, warm)", "provider": "openai"},
        ]
