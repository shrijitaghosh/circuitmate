import asyncio
from ..domain.models import ToolResult

ALLOWED_TOOLS = {'get_board_profile', 'check_pin_power', 'next_diagnostic_step'}

async def run_tool(name: str, args: dict, facts: dict[str, str], cancelled: asyncio.Event) -> ToolResult:
    if cancelled.is_set(): return ToolResult(False, name, error='cancelled')
    if name not in ALLOWED_TOOLS: return ToolResult(False, name, error='tool_not_allowed')
    if name == 'get_board_profile':
        board = str(args.get('board') or facts.get('board') or 'esp32')
        if board not in {'arduino-uno', 'esp32'}: return ToolResult(False, name, error='unsupported_board')
        return ToolResult(True, name, {'board': board, 'logicVoltage': '3.3V' if board == 'esp32' else '5V', 'note': 'Check the peripheral datasheet.'})
    if name == 'check_pin_power':
        return ToolResult(True, name, {'pin': str(args.get('pin') or facts.get('pin') or 'GPIO 12'), 'voltage': str(args.get('voltage') or facts.get('voltage') or '3.3V'), 'safe': True, 'note': 'Rule lookup only; no GPIO was actuated.'})
    await asyncio.sleep(0)
    return ToolResult(True, name, {'step': 'Power off before rewiring. Verify common ground, then measure supply voltage with a multimeter.', 'basedOn': facts})
