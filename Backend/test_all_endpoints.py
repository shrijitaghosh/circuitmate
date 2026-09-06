from fastapi.testclient import TestClient
import app.domain.session as session_module
from app.server.app import app
from app.domain.models import ToolResult

async def fake_start(self):
    self.emit({'type': 'session.ready'})

async def fake_generate(text, facts, tool_results=None, cancelled=None):
    return f'Fake response for: {text}', []

async def fake_synthesize(text):
    return False, None, 'audio/mpeg', 'Rime disabled in endpoint smoke test'

session_module.SessionActor.start = fake_start
session_module.generate = fake_generate
session_module.synthesize = fake_synthesize

with TestClient(app) as client:
    checks = []
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['ok'] is True
    checks.append(('GET /health', response.status_code))

    response = client.post('/v1/sessions')
    assert response.status_code == 201
    session = response.json()
    session_id = session['sessionId']
    checks.append(('POST /v1/sessions', response.status_code))

    response = client.get(f'/v1/sessions/{session_id}')
    assert response.status_code == 200
    checks.append(('GET /v1/sessions/{id}', response.status_code))

    response = client.post(f'/v1/sessions/{session_id}/turns/text', json={
        'text': 'Connect it to GPIO 13, wait, GPIO 12.'
    })
    assert response.status_code == 200
    checks.append(('POST /v1/sessions/{id}/turns/text', response.status_code))

    response = client.get(f'/v1/sessions/{session_id}')
    assert response.status_code == 200
    assert response.json()['facts']['pin'] == 'GPIO 12'
    assert len(response.json()['turns']) == 1
    checks.append(('GET /v1/sessions/{id} after turn', response.status_code))

    response = client.post(f'/v1/sessions/{session_id}/interrupt')
    assert response.status_code == 200
    checks.append(('POST /v1/sessions/{id}/interrupt', response.status_code))

    with client.websocket_connect(f'/v1/sessions/{session_id}/stream') as websocket:
        ready = websocket.receive_json()
        assert ready['type'] == 'session.ready'
        checks.append(('WS connect/session.ready', 101))
        websocket.send_json({'type': 'ping'})
        assert websocket.receive_json()['type'] == 'pong'
        checks.append(('WS ping/pong', 200))
        websocket.send_json({'type': 'turn.start', 'turnId': 'ws-turn-1'})
        websocket.send_json({'type': 'interrupt', 'reason': 'smoke-test'})
        checks.append(('WS turn.start/interrupt', 200))

    response = client.get('/v1/sessions/does-not-exist')
    assert response.status_code == 404
    checks.append(('404 missing session', response.status_code))

    print('ALL ENDPOINTS PASSED')
    for name, status in checks:
        print(f'{status:>3}  {name}')
