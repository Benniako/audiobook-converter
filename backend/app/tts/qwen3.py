"""
Qwen3-TTS Provider — Apache-2.0, 97ms latency, instruction control (9/10)
https://huggingface.co/Qwen/Qwen3-TTS

pip install qwen-tts

Models: 1.7B (8GB VRAM), 0.6B (4GB VRAM)
"""
from typing import List
from app.tts.base import TTSProvider
from app.config import get_settings

settings = get_settings()

QWEN3_VOICES = [
    {"id": "default", "name": "Default", "model": "1.7B", "language": "en"},
    {"id": "zh_female_1", "name": "Chinese Female 1", "model": "1.7B", "language": "zh"},
    {"id": "en_female_1", "name": "English Female 1", "model": "1.7B", "language": "en"},
    {"id": "en_male_1", "name": "English Male 1", "model": "1.7B", "language": "en"},
    {"id": "ja_female_1", "name": "Japanese Female 1", "model": "1.7B", "language": "ja"},
    {"id": "ko_female_1", "name": "Korean Female 1", "model": "1.7B", "language": "ko"},
    {"id": "fr_female_1", "name": "French Female 1", "model": "1.7B", "language": "fr"},
    {"id": "de_female_1", "name": "German Female 1", "model": "1.7B", "language": "de"},
    {"id": "es_female_1", "name": "Spanish Female 1", "model": "1.7B", "language": "es"},
    {"id": "it_female_1", "name": "Italian Female 1", "model": "1.7B", "language": "it"},
    {"id": "pt_female_1", "name": "Portuguese Female 1", "model": "1.7B", "language": "pt"},
    {"id": "ru_female_1", "name": "Russian Female 1", "model": "1.7B", "language": "ru"},
    # Small model variants
    {"id": "default_small", "name": "Default (0.6B)", "model": "0.6B", "language": "en"},
    {"id": "zh_small", "name": "Chinese (0.6B)", "model": "0.6B", "language": "zh"},
]


class Qwen3Provider(TTSProvider):
    """Qwen3-TTS by Alibaba — end-to-end, low-latency, instruction-controllable."""

    def __init__(self, model: str = "1.7B"):
        self.model = model
        self._engine = None

    async def synthesize(self, text: str, voice: str = "default", speed: float = 1.0, **kwargs) -> bytes:
        try:
            return await self._synthesize_qwen(text, voice, speed)
        except ImportError:
            return self._generate_silent_wav(duration_ms=len(text) * 60)
        except Exception as e:
            raise RuntimeError(f"Qwen3-TTS synthesis failed: {e}")

    async def _synthesize_qwen(self, text: str, voice: str, speed: float) -> bytes:
        from qwen_tts import Qwen3TTSModel

        if self._engine is None:
            model_id = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice" if "1.7B" in self.model else "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
            self._engine = Qwen3TTSModel.from_pretrained(model_id)

        # Instruction-based control
        instruction = f"Speak at {speed}x speed. Use a natural, conversational tone."
        audio = self._engine.synthesize(text, instruction=instruction, voice=voice)
        return audio if isinstance(audio, bytes) else bytes(audio)

    def get_available_voices(self) -> List[dict]:
        return QWEN3_VOICES

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
