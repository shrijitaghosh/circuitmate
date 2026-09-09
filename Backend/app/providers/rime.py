import httpx
from ..config.settings import settings

async def synthesize(text: str) -> tuple[bool, bytes | None, str, str | None]:
    if not settings.rime_api_key: return False, None, 'audio/mpeg', 'RIME_API_KEY is not configured'
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(settings.rime_http_url, headers={'Authorization': f'Bearer {settings.rime_api_key}'}, json={'text': text, 'speaker': settings.rime_speaker, 'modelId': settings.rime_voice})
            if response.status_code >= 400: return False, None, 'audio/mpeg', f'Rime error {response.status_code}: {response.text}'
            return True, response.content, response.headers.get('content-type', 'audio/mpeg'), None
    except Exception as exc: return False, None, 'audio/mpeg', str(exc)
