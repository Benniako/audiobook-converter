from typing import Dict, List, Optional
from app.tts.base import TTSProvider
from app.tts.kokoro import KokoroProvider
from app.tts.cloud import CloudProvider
from app.tts.chatterbox import ChatterboxProvider
from app.tts.qwen3 import Qwen3Provider
from app.tts.omnivoice import OmniVoiceProvider
from app.tts.cosyvoice import CosyVoiceProvider
from app.config import get_settings

_providers: Dict[str, TTSProvider] = {}

# Provider registry with metadata for UI
PROVIDER_META: Dict[str, dict] = {}


def init_providers():
    """Register built-in TTS providers."""
    settings = get_settings()

    # Free tier — always available, runs anywhere
    _register("kokoro", KokoroProvider(), {
        "name": "Kokoro-82M",
        "quality": "Good (8/10)",
        "languages": 8,
        "hardware": "CPU / Any GPU",
        "license": "Apache-2.0",
        "tier": "free",
        "description": "Lightweight model that runs on any hardware. Good quality for its tiny size.",
    })

    # Premium local — requires GPU, MIT / Apache-2.0
    _register("chatterbox", ChatterboxProvider(), {
        "name": "Chatterbox Turbo",
        "quality": "Excellent (9/10)",
        "languages": 23,
        "hardware": "GPU 4GB+ VRAM",
        "license": "MIT",
        "tier": "pro",
        "description": "State-of-the-art quality. Zero-shot voice cloning. Best overall pick.",
    })
    _register("qwen3", Qwen3Provider(), {
        "name": "Qwen3-TTS 1.7B",
        "quality": "Excellent (9/10)",
        "languages": 10,
        "hardware": "GPU 4-8GB VRAM",
        "license": "Apache-2.0",
        "tier": "pro",
        "description": "97ms latency, instruction control, voice cloning. By Alibaba.",
    })
    _register("omnivoice", OmniVoiceProvider(), {
        "name": "OmniVoice",
        "quality": "Very Good (8/10)",
        "languages": "600+",
        "hardware": "GPU (CUDA/MPS)",
        "license": "Apache-2.0",
        "tier": "pro",
        "description": "600+ languages, 40x real-time. Broadest language coverage.",
    })
    _register("cosyvoice", CosyVoiceProvider(), {
        "name": "CosyVoice 300M",
        "quality": "Excellent (9/10)",
        "languages": 10,
        "hardware": "GPU 8GB+ VRAM",
        "license": "Apache-2.0",
        "tier": "pro",
        "description": "Instruction-controlled TTS. 150ms streaming. Apache-2.0.",
    })

    # Cloud — requires API key
    if settings.openai_api_key:
        _register("openai", CloudProvider(), {
            "name": "OpenAI TTS",
            "quality": "Very Good (8/10)",
            "languages": 6,
            "hardware": "Cloud API",
            "license": "Proprietary",
            "tier": "pro",
            "description": "OpenAI's cloud TTS API. Requires API key and internet.",
        })


def _register(provider_id: str, provider: TTSProvider, meta: dict):
    _providers[provider_id] = provider
    PROVIDER_META[provider_id] = meta


def register_provider(provider_id: str, provider: TTSProvider):
    _providers[provider_id] = provider


def unregister_provider(provider_id: str):
    _providers.pop(provider_id, None)
    PROVIDER_META.pop(provider_id, None)


def get_provider(provider_id: str) -> Optional[TTSProvider]:
    return _providers.get(provider_id)


def get_provider_meta(provider_id: str) -> Optional[dict]:
    return PROVIDER_META.get(provider_id)


def list_providers() -> List[dict]:
    result = []
    for provider_id, provider in _providers.items():
        meta = PROVIDER_META.get(provider_id, {})
        result.append({
            "id": provider_id,
            "name": meta.get("name", provider_id.capitalize()),
            "quality": meta.get("quality", ""),
            "languages": meta.get("languages", ""),
            "hardware": meta.get("hardware", ""),
            "license": meta.get("license", ""),
            "tier": meta.get("tier", "free"),
            "description": meta.get("description", ""),
            "voices": provider.get_available_voices(),
        })
    return result
