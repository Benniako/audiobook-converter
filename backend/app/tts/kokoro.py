import os
import subprocess
import tempfile
from typing import List
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
        Uses a temp file to pass text, avoiding command-line length limits on long chapters.
        """
        # Write text to a temp file to avoid OS arg length limits
        tmp_text_file = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".txt", delete=False, encoding="utf-8"
            ) as f:
                f.write(text)
                tmp_text_file = f.name

            result = subprocess.run(
                [
                    "python", "-m", "kokoro",
                    "--text-file", tmp_text_file,
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
        except (FileNotFoundError, RuntimeError):
            # Fallback: return silent WAV if Kokoro not installed or errors out
            return self._generate_silent_wav(duration_ms=len(text) * 60)
        finally:
            if tmp_text_file and os.path.exists(tmp_text_file):
                os.unlink(tmp_text_file)

    def get_available_voices(self) -> List[dict]:
        return DEFAULT_VOICES

    def _generate_silent_wav(self, duration_ms: int = 1000) -> bytes:
        """Generate a minimal WAV file (PCM 16-bit mono 22050Hz)."""
        import struct
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
