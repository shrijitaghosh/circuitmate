import asyncio, json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ..config.settings import settings, providers
from ..domain.session import SessionStore

store = SessionStore()
class TextTurn(BaseModel): text: str = Field(min_length=1); turnId: str | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(cleanup())
    yield
    task.cancel()

async def cleanup():
    while True:
        await asyncio.sleep(min(settings.session_ttl_seconds, 60)); await store.remove_expired(settings.session_ttl_seconds)

app = FastAPI(title='Voice Hardware Debugger Backend', version='1.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'] if settings.cors_origin == '*' else [settings.cors_origin], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.get('/health')
async def health(): return {'ok': True, 'providers': providers}

@app.post('/v1/sessions', status_code=201)
async def create_session():
    actor = await store.create(); return {'sessionId': actor.state.id, 'websocketUrl': f'/v1/sessions/{actor.state.id}/stream', 'expiresInSeconds': settings.session_ttl_seconds}

@app.get('/v1/sessions/{session_id}')
async def get_session(session_id: str):
    actor = store.get(session_id)
    if not actor: raise HTTPException(404, 'session_not_found')
    state = actor.state
    return {'id': state.id, 'facts': state.facts, 'turns': [t.__dict__ for t in state.turns], 'generation': state.generation, 'metrics': state.metrics.__dict__}

@app.post('/v1/sessions/{session_id}/turns/text')
async def text_turn(session_id: str, body: TextTurn):
    actor = store.get(session_id)
    if not actor: raise HTTPException(404, 'session_not_found')
    actor.start_turn(body.turnId); await actor.commit(body.text); return {'ok': True, 'sessionId': session_id}

@app.post('/v1/sessions/{session_id}/interrupt')
async def interrupt(session_id: str):
    actor = store.get(session_id)
    if not actor: raise HTTPException(404, 'session_not_found')
    await actor.cancel('api'); return {'ok': True}

@app.websocket('/v1/sessions/{session_id}/stream')
async def stream(websocket: WebSocket, session_id: str):
    actor = store.get(session_id)
    if not actor: await websocket.close(code=1008, reason='session_not_found'); return
    await websocket.accept(); unsubscribe = actor.on(lambda event: asyncio.create_task(websocket.send_json(event)))
    try:
        actor.emit({'type': 'session.ready', 'providers': providers})
        while True:
            message = await websocket.receive()
            if message.get('bytes') is not None: await actor.audio(message['bytes']); continue
            if message.get('text') is None: continue
            data = json.loads(message['text']); kind = data.get('type')
            if kind == 'turn.start': actor.start_turn(data.get('turnId'))
            elif kind == 'turn.commit': await actor.commit()
            elif kind == 'interrupt': await actor.cancel(data.get('reason', 'user'))
            elif kind == 'ping': await websocket.send_json({'type': 'pong'})
            else: await websocket.send_json({'type': 'error', 'code': 'invalid_message', 'message': 'Unknown message type'})
    except WebSocketDisconnect: pass
    except RuntimeError as exc:
        # Starlette can raise this when a test client or browser disconnects
        # between receive() calls. It is not an application failure.
        if 'disconnect' not in str(exc).lower():
            raise
    finally: unsubscribe()
