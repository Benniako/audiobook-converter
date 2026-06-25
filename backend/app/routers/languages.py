from fastapi import APIRouter, HTTPException
from app.services.languages import get_supported_languages
from app.services.translation_service import TranslationService
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


@router.post("/detect")
async def detect_language(data: dict):
    """Detect language from a text sample."""
    text = data.get("text", "")
    if not text or len(text) < 20:
        raise HTTPException(status_code=400, detail="Text sample too short (min 20 chars)")
    try:
        translator = TranslationService()
        lang = await translator.detect_language(text[:1000])
        if lang:
            return {"language": lang}
        return {"language": "en"}
    except Exception as e:
        return {"language": "en", "error": str(e)}
