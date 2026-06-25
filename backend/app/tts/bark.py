"""
Bark by Suno — MIT Licensed, generates speech + music + sound effects (7/10)
https://github.com/suno-ai/bark

pip install git+https://github.com/suno-ai/bark.git

Key features:
- Generates speech, music, sound effects from text
- 100+ speaker presets
- Non-verbal tokens (laughs, sighs, music)
- 13 languages
"""
from typing import List
from app.tts.base import TTSProvider
from app.config import get_settings

settings = get_settings()

BARK_VOICES = [
    {"id": "v2/en_speaker_0", "name": "English Male (Deep)", "language": "en"},
    {"id": "v2/en_speaker_1", "name": "English Female (Warm)", "language": "en"},
    {"id": "v2/en_speaker_2", "name": "English Male (Narrative)", "language": "en"},
    {"id": "v2/en_speaker_3", "name": "English Female (Soft)", "language": "en"},
    {"id": "v2/en_speaker_4", "name": "English Male (Authoritative)", "language": "en"},
    {"id": "v2/en_speaker_5", "name": "English Female (Bright)", "language": "en"},
    {"id": "v2/en_speaker_6", "name": "English Male (Casual)", "language": "en"},
    {"id": "v2/en_speaker_7", "name": "English Female (Expressive)", "language": "en"},
    {"id": "v2/en_speaker_8", "name": "English Male (Storyteller)", "language": "en"},
    {"id": "v2/en_speaker_9", "name": "English Female (Calm)", "language": "en"},
    {"id": "v2/de_speaker_0", "name": "German Female", "language": "de"},
    {"id": "v2/es_speaker_0", "name": "Spanish Female", "language": "es"},
    {"id": "v2/fr_speaker_0", "name": "French Female", "language": "fr"},
    {"id": "v2/hi_speaker_0", "name": "Hindi Female", "language": "hi"},
    {"id": "v2/it_speaker_0", "name": "Italian Female", "language": "it"},
    {"id": "v2/ja_speaker_0", "name": "Japanese Female", "language": "ja"},
    {"id": "v2/ko_speaker_0", "name": "Korean Female", "language": "ko"},
    {"id": "v2/pl_speaker_0", "name": "Polish Female", "language": "pl"},
    {"id": "v2/pt_speaker_0", "name": "Portuguese Female", "language": "pt"},
    {"id": "v2/ru_speaker_0", "name": "Russian Female", "language": "ru"},
    {"id": "v2/tr_speaker_0", "name": "Turkish Female", "language": "tr"},
    {"id": "v2/zh_speaker_0", "name": "Chinese Female", "language": "zh"},
]


class BarkProvider(TTSProvider):
    """Bark by Suno — creative TTS with music and sound effects, MIT license."""

    def __init__(self):
        self._engine = None

    async def synthesize(self, text: str, voice: str = "v2/en_speaker_0", speed: float = 1.0, **kwargs) -> bytes:
        try:
            return await self._synthesize_bark(text, voice, speed)
        except ImportError:
            return self._generate_silent_wav(duration_ms=len(text) * 60)
        except Exception as e:
            raise RuntimeError(f"Bark synthesis failed: {e}")

    async def _synthesize_bark(self, text: str, voice: str, speed: float) -> bytes:
        from bark import generate_audio, preload_models

        if self._engine is None:
            preload_models()
            self._engine = True

        audio_array = generate_audio(text, history_prompt=voice)
        # Convert numpy array to WAV bytes
        import numpy as np
        import struct
        audio_int = (audio_array * 32767).astype(np.int16)
        num_samples = len(audio_int)
        data_size = num_samples * 2
        header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF", 36 + data_size, b"WAVE",
            b"fmt ", 16, 1, 1, 22050, 44100, 2, 8,
            b"data", data_size,
        )
        return header + audio_int.tobytes()

    def get_available_voices(self) -> List[dict]:
        return BARK_VOICES

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
