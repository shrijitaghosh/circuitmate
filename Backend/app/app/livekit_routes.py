import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from livekit.api import (
    AccessToken,
    RoomAgentDispatch,
    RoomConfiguration,
    VideoGrants,
)

from ..config.settings import settings
from .auth import bearer, get_user_id


router = APIRouter(prefix="/api/livekit", tags=["LiveKit"])

AGENT_NAME = settings.livekit_agent_name


@router.get("/config")
def livekit_config():
    return {
        "configured": bool(
            settings.livekit_url
            and settings.livekit_api_key
            and settings.livekit_api_secret
        ),
        "agentName": AGENT_NAME,
    }


@router.post("/token")
def create_livekit_token(credentials=Depends(bearer)):
    user_id = get_user_id(credentials)

    if not (
        settings.livekit_url
        and settings.livekit_api_key
        and settings.livekit_api_secret
    ):
        raise HTTPException(
            status_code=503,
            detail="LiveKit is not configured on the backend",
        )

    session_id = str(uuid.uuid4())
    room_name = f"circuitmate-{session_id}"
    identity = f"cm-{user_id}-{uuid.uuid4().hex[:12]}"

    metadata = (
        '{"user_id": "%s", "session_id": "%s"}'
        % (user_id, session_id)
    )

    token = (
        AccessToken(
            settings.livekit_api_key,
            settings.livekit_api_secret,
        )
        .with_identity(identity)
        .with_name("CircuitMate User")
        .with_ttl(timedelta(hours=2))
        .with_grants(
            VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        .with_room_config(
            RoomConfiguration(
                agents=[
                    RoomAgentDispatch(
                        agent_name=AGENT_NAME,
                        metadata=metadata,
                    )
                ]
            )
        )
        .to_jwt()
    )

    return {
        "ok": True,
        "sessionId": session_id,
        "roomName": room_name,
        "identity": identity,
        "token": token,
        "url": settings.livekit_url,
    }