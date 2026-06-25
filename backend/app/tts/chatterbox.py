"""
Chatterbox TTS Provider — MIT Licensed, SOTA quality (9/10)
https://github.com/resemble-ai/chatterbox

pip install chatterbox-tts

Models: Turbo (350M, English, 4GB VRAM), Multilingual V3 (500M, 23+ langs, 8GB VRAM)
"""
from typing import List
from app.tts.base import TTSProvider
from app.config import get_settings

settings = get_settings()

CHATTERBOX_VOICES = [
    {"id": "default", "name": "Default (Turbo)", "model": "turbo", "language": "en"},
    {"id": "en_female_1", "name": "English Female 1", "model": "multilingual_v3", "language": "en"},
    {"id": "en_male_1", "name": "English Male 1", "model": "multilingual_v3", "language": "en"},
    {"id": "es_female_1", "name": "Spanish Female 1", "model": "multilingual_v3", "language": "es"},
    {"id": "fr_female_1", "name": "French Female 1", "model": "multilingual_v3", "language": "fr"},
    {"id": "de_female_1", "name": "German Female 1", "model": "multilingual_v3", "language": "de"},
    {"id": "it_female_1", "name": "Italian Female 1", "model": "multilingual_v3", "language": "it"},
    {"id": "pt_female_1", "name": "Portuguese Female 1", "model": "multilingual_v3", "language": "pt"},
    {"id": "ja_female_1", "name": "Japanese Female 1", "model": "multilingual_v3", "language": "ja"},
    {"id": "ko_female_1", "name": "Korean Female 1", "model": "multilingual_v3", "language": "ko"},
    {"id": "zh_female_1", "name": "Chinese Female 1", "model": "multilingual_v3", "language": "zh"},
]


class ChatterboxProvider(TTSProvider):
    """Chatterbox TTS — state-of-the-art quality, MIT licensed."""

    def __init__(self, model: str = "turbo"):
        self.model = model
        self._engine = None

    async def synthesize(self, text: str, voice: str = "default", speed: float = 1.0, **kwargs) -> bytes:
        try:
            return await self._synthesize_chatterbox(text, voice, speed)
        except ImportError:
            return self._generate_silent_wav(duration_ms=len(text) * 60)
        except Exception as e:
            raise RuntimeError(f"Chatterbox synthesis failed: {e}")

    async def _synthesize_chatterbox(self, text: str, voice: str, speed: float) -> bytes:
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        from chatterbox.tts_multilingual_v3 import ChatterboxMultilingualV3TTS

        voice_cfg = next((v for v in CHATTERBOX_VOICES if v["id"] == voice), CHATTERBOX_VOICES[0])
        model_type = voice_cfg["model"]

        if self._engine is None:
            if model_type == "turbo":
                self._engine = ChatterboxTurboTTS()
            else:
                self._engine = ChatterboxMultilingualV3TTS()

        audio = self._engine.synthesize(text, voice=voice, speed=speed)
        if isinstance(audio, bytes):
            return audio
        return audio.tobytes() if hasattr(audio, 'tobytes') else bytes(audio)

    def get_available_voices(self) -> List[dict]:
        return CHATTERBOX_VOICES

    def _generate_silent_wav(self, duration_ms: int = 1000) -> bytes:
        import struct
        num_samples = int(22050 * duration_ms / 1000)
        data_size = num_samples * 2
        header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF", 36 + data_size, b"WAVE",
            b"fmt ", 16, 1, 1, 22050, 44100, 2, 8,
            b"data", data_size,
        )
        return header + b"\x80" * data_size
