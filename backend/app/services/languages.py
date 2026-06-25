"""
Language support data for TTS providers and translation.
ISO 639-1 codes.
"""

LANGUAGES = {
    "en":  {"name": "English",         "native": "English",           "flag": "🇬🇧", "tts": ["kokoro", "chatterbox", "qwen3", "omnivoice", "styletts2", "bark", "cosyvoice", "openai"]},
    "es":  {"name": "Spanish",         "native": "Español",           "flag": "🇪🇸", "tts": ["kokoro", "chatterbox", "omnivoice", "styletts2", "bark", "cosyvoice", "openai"]},
    "fr":  {"name": "French",          "native": "Français",          "flag": "🇫🇷", "tts": ["kokoro", "chatterbox", "omnivoice", "styletts2", "bark", "cosyvoice", "openai"]},
    "de":  {"name": "German",          "native": "Deutsch",           "flag": "🇩🇪", "tts": ["chatterbox", "omnivoice", "styletts2", "bark", "cosyvoice", "openai"]},
    "it":  {"name": "Italian",         "native": "Italiano",          "flag": "🇮🇹", "tts": ["kokoro", "chatterbox", "omnivoice", "styletts2", "bark", "cosyvoice", "openai"]},
    "pt":  {"name": "Portuguese",      "native": "Português",         "flag": "🇵🇹", "tts": ["chatterbox", "omnivoice", "cosyvoice", "openai", "styletts2", "bark"]},
    "nl":  {"name": "Dutch",           "native": "Nederlands",        "flag": "🇳🇱", "tts": ["omnivoice", "openai"]},
    "ru":  {"name": "Russian",         "native": "Русский",           "flag": "🇷🇺", "tts": ["chatterbox", "omnivoice", "cosyvoice", "openai", "styletts2", "bark"]},
    "ja":  {"name": "Japanese",        "native": "日本語",             "flag": "🇯🇵", "tts": ["kokoro", "chatterbox", "qwen3", "omnivoice", "cosyvoice", "openai", "styletts2", "bark"]},
    "ko":  {"name": "Korean",          "native": "한국어",              "flag": "🇰🇷", "tts": ["chatterbox", "qwen3", "omnivoice", "cosyvoice", "openai", "styletts2", "bark"]},
    "zh":  {"name": "Chinese",         "native": "中文",               "flag": "🇨🇳", "tts": ["kokoro", "chatterbox", "qwen3", "omnivoice", "cosyvoice", "openai", "styletts2", "bark"]},
    "ar":  {"name": "Arabic",          "native": "العربية",            "flag": "🇸🇦", "tts": ["omnivoice", "openai"]},
    "hi":  {"name": "Hindi",           "native": "हिन्दी",             "flag": "🇮🇳", "tts": ["omnivoice", "openai", "bark"]},
    "pl":  {"name": "Polish",          "native": "Polski",            "flag": "🇵🇱", "tts": ["chatterbox", "omnivoice", "openai", "styletts2", "bark"]},
    "tr":  {"name": "Turkish",         "native": "Türkçe",            "flag": "🇹🇷", "tts": ["chatterbox", "omnivoice", "openai", "styletts2", "bark"]},
    "vi":  {"name": "Vietnamese",      "native": "Tiếng Việt",        "flag": "🇻🇳", "tts": ["omnivoice", "openai"]},
    "th":  {"name": "Thai",            "native": "ไทย",               "flag": "🇹🇭", "tts": ["omnivoice", "openai"]},
    "sv":  {"name": "Swedish",         "native": "Svenska",           "flag": "🇸🇪", "tts": ["chatterbox", "omnivoice", "openai"]},
    "da":  {"name": "Danish",          "native": "Dansk",             "flag": "🇩🇰", "tts": ["chatterbox", "omnivoice", "openai"]},
    "fi":  {"name": "Finnish",         "native": "Suomi",             "flag": "🇫🇮", "tts": ["chatterbox", "omnivoice", "openai"]},
    "cs":  {"name": "Czech",           "native": "Čeština",           "flag": "🇨🇿", "tts": ["chatterbox", "omnivoice", "openai"]},
    "el":  {"name": "Greek",           "native": "Ελληνικά",          "flag": "🇬🇷", "tts": ["chatterbox", "omnivoice", "openai"]},
    "he":  {"name": "Hebrew",          "native": "עברית",             "flag": "🇮🇱", "tts": ["chatterbox", "omnivoice", "openai"]},
    "ro":  {"name": "Romanian",        "native": "Română",            "flag": "🇷🇴", "tts": ["chatterbox", "omnivoice", "openai"]},
    "hu":  {"name": "Hungarian",       "native": "Magyar",            "flag": "🇭🇺", "tts": ["chatterbox", "omnivoice", "openai"]},
    "uk":  {"name": "Ukrainian",       "native": "Українська",        "flag": "🇺🇦", "tts": ["omnivoice", "openai"]},
}


def get_language(code: str) -> dict | None:
    return LANGUAGES.get(code)


def get_supported_languages(tts_provider: str | None = None) -> list[dict]:
    if tts_provider:
        return [{"code": k, **v} for k, v in LANGUAGES.items() if tts_provider in v.get("tts", [])]
    return [{"code": k, **v} for k, v in LANGUAGES.items()]
