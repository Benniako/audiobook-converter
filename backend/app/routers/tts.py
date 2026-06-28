from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.tts.registry import list_providers, get_provider

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.get("/providers")
async def get_providers():
    return list_providers()


@router.get("/preview/{provider_id}")
async def preview_tts(provider_id: str):
    """Generate a 5-second TTS preview sample."""
    provider = get_provider(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")

    sample_text = "Hello, this is a preview of the voice."
    try:
        audio_data = await provider.synthesize(sample_text)
        return Response(content=audio_data, media_type="audio/wav")
    except Exception as e:
        # Return a minimal silent WAV as fallback so the UI doesn't break
        import struct
        header = struct.pack("<4sI4s4sIHHIIHH4sI", b"RIFF", 36, b"WAVE", b"fmt ", 16, 1, 1, 22050, 44100, 2, 8, b"data", 0)
        return Response(content=header, media_type="audio/wav")
