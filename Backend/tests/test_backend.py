import pytest
from httpx import ASGITransport, AsyncClient
from app.domain.corrections import resolve
from app.tools.diagnostics import run_tool
from app.server.app import app


def test_gpio_correction():
    normalized, facts, corrections = resolve('Connect it to GPIO 13, wait, GPIO 12.', {'scenario': 'x', 'pin': 'GPIO 13'})
    assert facts['pin'] == 'GPIO 12'
    assert corrections[0].previous == 'GPIO 13'


def test_voltage_and_board_correction():
    _, facts, _ = resolve('Use 5 volts, sorry, 3.3 volts on Arduino Uno, actually ESP32.', {'scenario': 'x'})
    assert facts['voltage'] == '3.3V'
    assert facts['board'] == 'esp32'

@pytest.mark.asyncio
async def test_tools_are_allowlisted():
    import asyncio
    result = await run_tool('shell', {}, {'scenario': 'x'}, asyncio.Event())
    assert result.ok is False
    assert result.error == 'tool_not_allowed'

@pytest.mark.asyncio
async def test_health_and_session():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        health = await client.get('/health')
        assert health.status_code == 200
        created = await client.post('/v1/sessions')
        assert created.status_code == 201
        session_id = created.json()['sessionId']
        response = await client.post(f'/v1/sessions/{session_id}/turns/text', json={'text': 'My LED is not turning on.'})
        assert response.status_code == 200
        state = await client.get(f'/v1/sessions/{session_id}')
        assert len(state.json()['turns']) == 1
