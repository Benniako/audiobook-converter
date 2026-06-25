import json
import subprocess
import httpx
import tempfile
import os
import importlib.util
from typing import List
from app.tts.base import TTSProvider
from app.models.custom_tts import ProviderType


class CustomProvider(TTSProvider):
    """Dynamically loaded custom TTS provider from admin configuration."""

    def __init__(self, provider_id: str, name: str, provider_type: str, config: dict):
        self.provider_id = provider_id
        self.name = name
        self.provider_type = provider_type
        self.config = config

    async def synthesize(self, text: str, voice: str = "default", speed: float = 1.0, **kwargs) -> bytes:
        if self.provider_type == ProviderType.script.value:
            return await self._run_script(text, voice, speed)
        elif self.provider_type == ProviderType.cli.value:
            return self._run_cli(text, voice, speed)
        elif self.provider_type == ProviderType.http.value:
            return await self._call_http(text, voice, speed)
        elif self.provider_type == ProviderType.local_model.value:
            return self._run_local_model(text, voice, speed)
        raise ValueError(f"Unknown provider type: {self.provider_type}")

    async def _run_script(self, text: str, voice: str, speed: float) -> bytes:
        """Call a Python function: module_path:function_name"""
        module_path = self.config.get("module_path", "")
        func_name = self.config.get("function_name", "synthesize")
        spec = importlib.util.spec_from_file_location("custom_tts", module_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        func = getattr(mod, func_name)
        result = func(text, voice=voice, speed=speed)
        if isinstance(result, bytes):
            return result
        return result

    def _run_cli(self, text: str, voice: str, speed: float) -> bytes:
        """Run a CLI command where text is piped to stdin."""
        command = self.config.get("command", "")
        if not command:
            raise RuntimeError("CLI command not configured")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            output_path = tmp.name

        cmd = command.replace("{text}", text).replace("{voice}", voice).replace("{speed}", str(speed))
        cmd = cmd.replace("{output}", output_path)

        result = subprocess.run(
            cmd, shell=True, capture_output=True, timeout=300, input=text.encode()
        )
        if result.returncode != 0:
            raise RuntimeError(f"CLI TTS failed: {result.stderr.decode()}")

        with open(output_path, "rb") as f:
            audio = f.read()
        os.unlink(output_path)
        return audio

    async def _call_http(self, text: str, voice: str, speed: float) -> bytes:
        url = self.config.get("url", "")
        headers = self.config.get("headers", {})
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                url,
                headers=headers,
                json={"text": text, "voice": voice, "speed": speed},
            )
            resp.raise_for_status()
            return resp.content

    def _run_local_model(self, text: str, voice: str, speed: float) -> bytes:
        """Run a local TTS model (e.g. Coqui, Piper) from a given path."""
        model_path = self.config.get("model_path", "")
        if not model_path or not os.path.exists(model_path):
            raise RuntimeError(f"Model not found: {model_path}")
        raise NotImplementedError("Local model support requires model-specific implementation")

    def get_available_voices(self) -> List[dict]:
        voices = self.config.get("voices", [])
        if not voices:
            return [{"id": "default", "name": self.name, "provider": "custom"}]
        return voices
