from fastapi import APIRouter
from app.tts.registry import list_providers

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.get("/providers")
async def get_providers():
    return list_providers()
