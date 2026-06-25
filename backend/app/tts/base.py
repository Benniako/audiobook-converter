from abc import ABC, abstractmethod
from typing import List


class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, **kwargs) -> bytes:
        """Convert text to audio bytes (WAV format)."""
        pass

    @abstractmethod
    def get_available_voices(self) -> List[dict]:
        """Return list of available voices with metadata."""
        pass
