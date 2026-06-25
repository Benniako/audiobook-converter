from fastapi import APIRouter
from app.services.languages import get_supported_languages
from app.tts.registry import list_providers

router = APIRouter(prefix="/api/languages", tags=["languages"])


@router.get("/")
async def list_languages():
    """List all supported languages with TTS provider compatibility."""
    return get_supported_languages()


@router.get("/for-tts")
async def languages_for_tts():
    """Return languages grouped by which TTS providers support them."""
    providers = list_providers()
    result = {}
    for p in providers:
        langs = get_supported_languages(p["id"])
        if langs:
            result[p["id"]] = langs
    return result
