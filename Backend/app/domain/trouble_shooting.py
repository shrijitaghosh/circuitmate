
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
import time
import uuid


class DebugState(str, Enum):
    INITIAL = "INITIAL"
    IDENTIFY_HARDWARE = "IDENTIFY_HARDWARE"
    IDENTIFY_PROBLEM = "IDENTIFY_PROBLEM"
    COLLECT_FACTS = "COLLECT_FACTS"
    HYPOTHESIS = "HYPOTHESIS"
    DIAGNOSTIC_TEST = "DIAGNOSTIC_TEST"
    RESULT = "RESULT"
    NEXT_TEST = "NEXT_TEST"
    RESOLUTION = "RESOLUTION"


@dataclass
class Turn:
    id: str
    user_message: str
    assistant_message: str
    state: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class DiagnosticTest:
    id: str
    name: str
    description: str
    expected_result: str
    failure_meaning: str


@dataclass
class Session:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

    state: DebugState = DebugState.INITIAL

    hardware: str | None = None
    problem: str | None = None

    facts: dict[str, Any] = field(default_factory=dict)

    hypothesis: list[str] = field(default_factory=list)

    current_test: DiagnosticTest | None = None

    test_results: list[dict[str, Any]] = field(default_factory=list)

    turns: list[Turn] = field(default_factory=list)

    generation: int = 0

    active: bool = True

    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def add_turn(
        self,
        user_message: str,
        assistant_message: str,
    ) -> None:
        self.turns.append(
            Turn(
                id=str(uuid.uuid4()),
                user_message=user_message,
                assistant_message=assistant_message,
                state=self.state.value,
            )
        )

        self.updated_at = time.time()

    def update_fact(
        self,
        key: str,
        value: Any,
    ) -> None:
        self.facts[key] = value
        self.updated_at = time.time()

    def remove_fact(
        self,
        key: str,
    ) -> None:
        self.facts.pop(key, None)
        self.updated_at = time.time()

    def increment_generation(self) -> int:
        self.generation += 1
        self.updated_at = time.time()
        return self.generation

    def record_test_result(
        self,
        test_id: str,
        result: str,
        observation: str,
    ) -> None:
        self.test_results.append(
            {
                "testId": test_id,
                "result": result,
                "observation": observation,
                "timestamp": time.time(),
            }
        )

        self.updated_at = time.time()


# ---

# ## 3. `app/services/troubleshooting_service.py`

# This is the main brain.

# ```python
# 
# ```

# ---

# # 4. Create the API route

# Create:

# `Backend/app/routes/troubleshooting_routes.py`



# # 5. Connect it to your existing FastAPI app

# You currently have:

# ```text
# Backend/app/server/app.py
# ```

# At the top, add:

# ```python

# ```

# Then after your existing:

# ```python
# app.include_router(auth_router)
# app.include_router(livekit_router)
# ```

# add:

# ```python

# ```

# So that section becomes:

# ```python
# app.include_router(auth_router)
# app.include_router(livekit_router)
# app.include_router(troubleshooting_router)
# ```

# ---

# # 6. Start the backend

# From:

# ```powershell
# cd C:\Users\SOUMADIP\voice\Backend
# ```

# activate your environment:

# ```powershell
# .\win\Scripts\Activate.ps1
# ```

# Then:

# ```powershell
# python main.py
# ```

# You should get:

# ```text
# Uvicorn running on http://127.0.0.1:8787
# ```

# ---

# # 7. Test it

# First create a debugging session:

# ```powershell
# Invoke-RestMethod `
#   -Method POST `
#   -Uri http://localhost:8787/api/debug/sessions
# ```

# You'll get:

# ```json
# {
#   "ok": true,
#   "sessionId": "..."
# }
# ```

# Copy that session ID.

# For example:

# ```text
# abc123
# ```

# Then:

# ```powershell
# Invoke-RestMethod `
#   -Method POST `
#   -Uri http://localhost:8787/api/debug/message `
#   -ContentType "application/json" `
#   -Body '{"sessionId":"abc123","message":"My LED is not working"}'
# ```

# You should get something like:

# ```json
# {
#   "ok": true,
#   "sessionId": "abc123",
#   "state": "IDENTIFY_HARDWARE",
#   "response": "Sure. Let's troubleshoot it step by step. What hardware or board are you using?"
# }
# ```

# Then:

# ```powershell
# Invoke-RestMethod `
#   -Method POST `
#   -Uri http://localhost:8787/api/debug/message `
#   -ContentType "application/json" `
#   -Body '{"sessionId":"abc123","message":"I am using an ESP32"}'
# ```

# Then:

# ```powershell
# Invoke-RestMethod `
#   -Method POST `
#   -Uri http://localhost:8787/api/debug/message `
#   -ContentType "application/json" `
#   -Body '{"sessionId":"abc123","message":"The LED is not turning on"}'
# ```

# ---

# # 8. Test the important correction feature

# This is the part we particularly want for the hackathon.

# Send:

# ```powershell
# Invoke-RestMethod `
#   -Method POST `
#   -Uri http://localhost:8787/api/debug/message `
#   -ContentType "application/json" `
#   -Body '{"sessionId":"abc123","message":"It is connected to GPIO 13"}'
# ```

# You should get:

# ```json
# "facts": {
#     "gpio": 13
# }
# ```

# Now send:

# ```powershell
# Invoke-RestMethod `
#   -Method POST `
#   -Uri http://localhost:8787/api/debug/message `
#   -ContentType "application/json" `
#   -Body '{"sessionId":"abc123","message":"Wait, actually GPIO 12"}'
# ```

# The important result is:

# ```json
# {
#   "facts": {
#     "gpio": "12"
#   },
#   "generation": 1
# }
# ```

# The previous GPIO 13 is replaced.

# That `generation` value is important because later, when we add asynchronous diagnostic tools, we'll use it to prevent an old GPIO-13 result from being accepted after the user changes to GPIO-12.

# ---

# ## One architectural improvement we'll make next

# Right now the session store is:

# ```python
# sessions: dict[str, Session] = {}
# ```

# That's intentionally simple for testing.

# Once this works, we'll connect it to your existing `SessionStore`/database architecture rather than maintaining two independent session systems.

# Then the architecture becomes:

# ```text
#                  CIRCUITMATE
#                      │
#               User speaks/types
#                      │
#                      ▼
#           ┌─────────────────────┐
#           │ Technical Correction│
#           │      Engine         │
#           └──────────┬──────────┘
#                      │
#                      ▼
#           ┌─────────────────────┐
#           │   Session Memory    │
#           │ facts + generation  │
#           └──────────┬──────────┘
#                      │
#                      ▼
#           ┌─────────────────────┐
#           │ Troubleshooting     │
#           │ State Machine       │
#           └──────────┬──────────┘
#                      │
#           ┌──────────┴──────────┐
#           ▼                     ▼
#    Hardware Rules             LLM
#           │                     │
#           └──────────┬──────────┘
#                      ▼
#              Response Planner
#                      │
#                      ▼
#                   Rime
#                      │
#                      ▼
#                   User
# ```

# **For now, don't touch LiveKit. Get these `/api/debug/*` endpoints working first.**
