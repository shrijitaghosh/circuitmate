from dataclasses import dataclass, field
from typing import Any, Literal

@dataclass
class Correction:
    key: str
    previous: str
    next: str
    phrase: str
    confidence: float = 0.98

@dataclass
class Turn:
    id: str
    raw_text: str
    normalized_text: str
    corrections: list[Correction] = field(default_factory=list)
    created_at: str = ''

@dataclass
class Metrics:
    turns: int = 0
    corrections: int = 0
    stale_events: int = 0
    cancellations: int = 0
    first_audio_ms: int | None = None

@dataclass
class SessionState:
    id: str
    created_at: float
    facts: dict[str, str] = field(default_factory=lambda: {'scenario': 'led-not-lighting'})
    turns: list[Turn] = field(default_factory=list)
    generation: int = 0
    active_turn_id: str | None = None
    metrics: Metrics = field(default_factory=Metrics)

@dataclass
class ToolResult:
    ok: bool
    tool: str
    data: Any = None
    error: str | None = None

ClientType = Literal['turn.start', 'turn.commit', 'interrupt', 'ping']
