from typing import Dict, List, Optional
from app.tts.base import TTSProvider
from app.tts.kokoro import KokoroProvider
from app.tts.cloud import CloudProvider
from app.config import get_settings

_providers: Dict[str, TTSProvider] = {}


def init_providers():
    """Register built-in TTS providers."""
    _providers["kokoro"] = KokoroProvider()
    settings = get_settings()
    if settings.openai_api_key:
        _providers["openai"] = CloudProvider()


def register_provider(provider_id: str, provider: TTSProvider):
    _providers[provider_id] = provider


def unregister_provider(provider_id: str):
    _providers.pop(provider_id, None)


def get_provider(provider_id: str) -> Optional[TTSProvider]:
    return _providers.get(provider_id)


def list_providers() -> List[dict]:
    result = []
    for provider_id, provider in _providers.items():
        result.append({
            "id": provider_id,
            "name": provider_id.capitalize(),
            "voices": provider.get_available_voices(),
        })
    return result
