import asyncio, time, uuid
from datetime import datetime, timezone
from collections.abc import Callable
from .models import SessionState, Turn
from .corrections import resolve
from .models import ToolResult
from ..providers.deepgram import DeepgramSession
from ..providers.huggingface import generate
from ..providers.rime import synthesize
from ..tools.diagnostics import run_tool

class SessionActor:
    def __init__(self):
        self.state = SessionState(id=str(uuid.uuid4()), created_at=time.time())
        self.listeners: set[Callable[[dict], None]] = set(); self.active_task: asyncio.Task | None = None; self.cancelled = asyncio.Event(); self.pending_text = ''
        self.stt = DeepgramSession(lambda text, partial: self.append_transcript(text, partial), lambda error: self.emit({'type': 'error', 'code': 'stt_failed', 'message': error}))

    async def start(self): await self.stt.connect(); self.emit({'type': 'session.ready'})
    async def close(self): await self.cancel('session_closed'); await self.stt.close()
    def on(self, callback: Callable[[dict], None]): self.listeners.add(callback); return lambda: self.listeners.discard(callback)
    def emit(self, event: dict):
        event = {**event, 'sessionId': self.state.id}
        for callback in list(self.listeners): callback(event)
    def start_turn(self, turn_id: str | None = None) -> str:
        self.cancel_sync('superseded'); value = turn_id or str(uuid.uuid4()); self.state.active_turn_id = value; self.pending_text = ''; self.emit({'type': 'turn.started', 'turnId': value, 'generation': self.state.generation}); return value
    async def audio(self, data: bytes): await self.stt.send_audio(data); self.emit({'type': 'audio.received', 'bytes': len(data)})
    def append_transcript(self, text: str, partial: bool):
        if partial: self.emit({'type': 'transcript.partial', 'text': text})
        else: self.pending_text = f'{self.pending_text} {text}'.strip()
    async def commit(self, text: str | None = None):
        if text is None: await self.stt.commit(); await asyncio.sleep(.25)
        input_text = (text or self.pending_text).strip()
        if not input_text: self.emit({'type': 'error', 'code': 'empty_turn', 'message': 'No transcript received.'}); return
        turn_id = self.state.active_turn_id or str(uuid.uuid4()); normalized, facts, corrections = resolve(input_text, self.state.facts); self.state.facts = facts
        self.state.metrics.turns += 1; self.state.metrics.corrections += len(corrections)
        turn = Turn(turn_id, input_text, normalized, corrections, datetime.now(timezone.utc).isoformat()); self.state.turns = (*self.state.turns, turn)[-8:]
        self.emit({'type': 'transcript.final', 'turnId': turn_id, 'text': input_text, 'normalizedText': normalized})
        if corrections: self.emit({'type': 'facts.updated', 'facts': self.state.facts, 'corrections': [c.__dict__ for c in corrections]})
        await self.answer(turn_id, normalized)
    def cancel_sync(self, reason: str):
        if self.active_task and not self.active_task.done(): self.active_task.cancel(); self.state.generation += 1; self.state.metrics.cancellations += 1; self.emit({'type': 'turn.cancelled', 'reason': reason, 'generation': self.state.generation})
    async def cancel(self, reason: str): self.cancel_sync(reason); await asyncio.sleep(0)
    async def answer(self, turn_id: str, text: str):
        self.cancel_sync('new_generation'); self.state.generation += 1; generation = self.state.generation; self.cancelled = asyncio.Event(); started = time.monotonic()
        async def work():
            try:
                answer, calls = await generate(text, self.state.facts, cancelled=self.cancelled)
                for call in calls[:1]:
                    if generation != self.state.generation: self.state.metrics.stale_events += 1; return
                    self.emit({'type': 'tool.started', 'name': call['name']}); result = await run_tool(call['name'], call.get('arguments', {}), self.state.facts, self.cancelled); self.emit({'type': 'tool.completed', 'name': call['name'], 'result': result.__dict__})
                    if generation != self.state.generation: self.state.metrics.stale_events += 1; return
                    answer, _ = await generate(text, self.state.facts, [result], cancelled=self.cancelled)
                if generation != self.state.generation: self.state.metrics.stale_events += 1; return
                self.emit({'type': 'assistant.delta', 'turnId': turn_id, 'text': answer, 'generation': generation})
                available, audio, content_type, error = await synthesize(answer)
                if generation != self.state.generation: self.state.metrics.stale_events += 1; return
                if available and audio: self.state.metrics.first_audio_ms = round((time.monotonic() - started) * 1000); self.emit({'type': 'tts.audio', 'turnId': turn_id, 'contentType': content_type, 'audioBase64': __import__('base64').b64encode(audio).decode(), 'generation': generation})
                else: self.emit({'type': 'tts.unavailable', 'reason': error})
                self.emit({'type': 'turn.completed', 'turnId': turn_id, 'generation': generation, 'latencyMs': round((time.monotonic() - started) * 1000)})
            except asyncio.CancelledError: return
            except Exception as exc: self.emit({'type': 'error', 'code': 'assistant_failed', 'message': str(exc)})
        self.active_task = asyncio.create_task(work()); await self.active_task

class SessionStore:
    def __init__(self): self.sessions: dict[str, SessionActor] = {}
    async def create(self): actor = SessionActor(); self.sessions[actor.state.id] = actor; await actor.start(); return actor
    def get(self, session_id: str): return self.sessions.get(session_id)
    async def remove_expired(self, ttl: int):
        for session_id, actor in list(self.sessions.items()):
            if time.time() - actor.state.created_at > ttl: await actor.close(); self.sessions.pop(session_id, None)
