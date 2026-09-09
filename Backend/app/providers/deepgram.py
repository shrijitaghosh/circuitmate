import asyncio, json
from collections.abc import Callable
import websockets
from ..config.settings import settings

class DeepgramSession:
    def __init__(self, on_transcript: Callable[[str, bool], None], on_error: Callable[[str], None]):
        self.on_transcript, self.on_error = on_transcript, on_error
        self.socket = None
        self.task: asyncio.Task | None = None

    async def connect(self):
        if not settings.deepgram_api_key: return
        url = 'wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&interim_results=true&smart_format=true&endpointing=300'
        try:
            self.socket = await websockets.connect(url, additional_headers={'Authorization': f'Token {settings.deepgram_api_key}'})
            self.task = asyncio.create_task(self._read())
        except Exception as exc: self.on_error(f'Deepgram connection failed: {exc}')

    async def _read(self):
        try:
            async for raw in self.socket:
                message = json.loads(raw)
                text = message.get('channel', {}).get('alternatives', [{}])[0].get('transcript', '')
                if text: self.on_transcript(text, not bool(message.get('is_final') or message.get('speech_final')))
        except Exception as exc:
            if not isinstance(exc, asyncio.CancelledError): self.on_error(str(exc))

    async def send_audio(self, chunk: bytes):
        if self.socket: await self.socket.send(chunk)

    async def commit(self):
        if self.socket: await self.socket.send(json.dumps({'type': 'Finalize'}))

    async def close(self):
        if self.task: self.task.cancel()
        if self.socket: await self.socket.close()
