from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..domain.trouble_shooting import Session
from ..services.troubleshooting_services import (
    troubleshooting_service,
)


router = APIRouter(
    prefix="/api/debug",
    tags=["Troubleshooting"],
)


# ---------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------

sessions: dict[str, Session] = {}


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------

class CreateSessionResponse(BaseModel):
    ok: bool
    sessionId: str


class DebugMessage(BaseModel):
    sessionId: str
    message: str = Field(min_length=1)


class TestResultRequest(BaseModel):
    sessionId: str
    result: str
    observation: str


# ---------------------------------------------------------
# CREATE SESSION
# ---------------------------------------------------------

@router.post(
    "/sessions",
    response_model=CreateSessionResponse,
)
async def create_debug_session():

    session = Session()

    sessions[session.id] = session

    return {
        "ok": True,
        "sessionId": session.id,
    }


# ---------------------------------------------------------
# GET SESSION
# ---------------------------------------------------------

@router.get(
    "/sessions/{session_id}",
)
async def get_debug_session(
    session_id: str,
):

    session = sessions.get(session_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="debug_session_not_found",
        )

    return serialize_session(session)


# ---------------------------------------------------------
# SEND MESSAGE
# ---------------------------------------------------------

@router.post(
    "/message",
)
async def send_debug_message(
    body: DebugMessage,
):

    session = sessions.get(body.sessionId)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="debug_session_not_found",
        )

    if not session.active:
        raise HTTPException(
            status_code=400,
            detail="debug_session_closed",
        )

    result = troubleshooting_service.process_message(
        session,
        body.message,
    )

    return result


# ---------------------------------------------------------
# CANCEL CURRENT WORK
# ---------------------------------------------------------

@router.post(
    "/sessions/{session_id}/interrupt",
)
async def interrupt_debug_session(
    session_id: str,
):

    session = sessions.get(session_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="debug_session_not_found",
        )

    generation = session.increment_generation()

    session.current_test = None

    return {
        "ok": True,
        "sessionId": session_id,
        "generation": generation,
        "message": "Current diagnostic work invalidated.",
    }


# ---------------------------------------------------------
# CLOSE SESSION
# ---------------------------------------------------------

@router.post(
    "/sessions/{session_id}/close",
)
async def close_debug_session(
    session_id: str,
):

    session = sessions.get(session_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="debug_session_not_found",
        )

    session.active = False

    return {
        "ok": True,
        "sessionId": session_id,
    }


@router.get("/sessions/{session_id}/results")
async def get_debug_results(session_id: str):
    """Return a stable, frontend-ready summary for a completed debug session."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="debug_session_not_found")

    test_results = session.test_results
    passed = sum(1 for item in test_results if item["result"] == "PASS")
    failed = sum(1 for item in test_results if item["result"] == "FAIL")
    unknown = sum(1 for item in test_results if item["result"] == "UNKNOWN")
    corrections = sum(1 for turn in session.turns if "actually" in turn.user_message.lower() or "sorry" in turn.user_message.lower())
    total = len(test_results)
    duration_seconds = max(0, int(session.updated_at - session.created_at))

    return {
        "ok": True,
        "sessionId": session.id,
        "hardware": session.hardware,
        "problem": session.problem,
        "facts": session.facts,
        "state": session.state.value,
        "resolved": not session.active,
        "durationSeconds": duration_seconds,
        "summary": {
            "totalTests": total,
            "successful": passed,
            "failed": failed,
            "unknown": unknown,
            "corrections": corrections,
            "successRate": round((passed / total) * 100) if total else 0,
        },
        "testResults": test_results,
        "turns": [
            {"userMessage": turn.user_message, "assistantMessage": turn.assistant_message, "timestamp": turn.timestamp}
            for turn in session.turns
        ],
    }


# ---------------------------------------------------------
# SERIALIZATION
# ---------------------------------------------------------

def serialize_session(
    session: Session,
) -> dict[str, Any]:

    return {
        "ok": True,
        "sessionId": session.id,
        "state": session.state.value,
        "hardware": session.hardware,
        "problem": session.problem,
        "facts": session.facts,
        "hypothesis": session.hypothesis,
        "generation": session.generation,
        "active": session.active,
        "currentTest": (
            troubleshooting_service.serialize_test(
                session.current_test
            )
            if session.current_test
            else None
        ),
        "testResults": session.test_results,
        "turns": [
            {
                "id": turn.id,
                "userMessage": turn.user_message,
                "assistantMessage": turn.assistant_message,
                "state": turn.state,
                "timestamp": turn.timestamp,
            }
            for turn in session.turns
        ],
    }
