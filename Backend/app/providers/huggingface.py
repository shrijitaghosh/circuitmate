import json, re
import httpx
from ..config.settings import settings
from ..domain.models import ToolResult

def local_answer(text: str, facts: dict[str, str], tool_results: list[ToolResult] | None = None) -> tuple[str, list[dict]]:
    if tool_results: return 'Based on the current facts, power off before rewiring. Check common ground, verify the corrected pin, and measure the supply with a multimeter. No hardware was actuated.', []
    if re.search(r'not turning|not working|won\'t|doesn\'t work', text, re.I): return f"Let us narrow it down. I have {facts.get('board', 'your board')} with {facts.get('pin', 'the stated pin')} and {facts.get('voltage', 'the stated voltage')}. Power off before rewiring. Is the component ground connected to board ground?", []
    return f'I understood: {text}. Active facts are {json.dumps(facts)}. Power off before changing wiring. Should we verify the board, pin, or supply voltage first?', []

async def generate(text: str, facts: dict[str, str], tool_results: list[ToolResult] | None = None, cancelled=None) -> tuple[str, list[dict]]:
    if not settings.hf_token: return local_answer(text, facts, tool_results)
    prompt = ('You are a concise, safety-conscious Arduino and ESP32 troubleshooting assistant. '
              'Never control hardware. Begin rewiring advice with power-off. Treat latest corrections as authoritative. '
              'Answer in 2-4 spoken sentences. If a lookup is needed, output exactly TOOL:name:{JSON}. '
              'Allowed tools: get_board_profile, check_pin_power, next_diagnostic_step.\n'
              f'Facts: {json.dumps(facts)}\nUser: {text}\nTool results: {json.dumps([r.__dict__ for r in (tool_results or [])])}')
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(f'https://api-inference.huggingface.co/models/{settings.hf_model}', headers={'Authorization': f'Bearer {settings.hf_token}'}, json={'inputs': prompt, 'parameters': {'max_new_tokens': 180, 'return_full_text': False}})
        response.raise_for_status(); data = response.json(); output = data[0].get('generated_text', '') if isinstance(data, list) else data.get('generated_text', '')
    match = re.search(r'TOOL:(get_board_profile|check_pin_power|next_diagnostic_step):\s*(\{.*\})', output, re.S)
    if match:
        try: return output.replace(match.group(0), '').strip(), [{'name': match.group(1), 'arguments': json.loads(match.group(2))}]
        except json.JSONDecodeError: pass
    return output.strip() or local_answer(text, facts, tool_results)[0], []
