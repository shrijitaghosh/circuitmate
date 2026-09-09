import json
import os
import re
import time
import asyncio
from dataclasses import dataclass, field

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    cli,
    inference,
)
from livekit.plugins import deepgram, rime

load_dotenv()


# ============================================================
# CONFIG
# ============================================================

AGENT_NAME = os.getenv(
    "LIVEKIT_AGENT_NAME",
    "circuitmate-agent",
)

RIME_MODEL = os.getenv(
    "RIME_MODEL",
    "coda",
)

RIME_SPEAKER = os.getenv(
    "RIME_SPEAKER",
    "celeste",
)

DEEPGRAM_MODEL = os.getenv(
    "DEEPGRAM_MODEL",
    "nova-3",
)

DEEPGRAM_LANGUAGE = os.getenv(
    "DEEPGRAM_LANGUAGE",
    "en-US",
)

LLM_MODEL = os.getenv(
    "LIVEKIT_LLM_MODEL",
    "google/gemma-4-31b-it",
)


# ============================================================
# TROUBLESHOOTING STATE
# ============================================================

@dataclass
class TroubleshootingState:
    board: str = ""
    mcu: str = ""
    pin: str = ""
    voltage: str = ""
    connection: str = ""
    firmware: str = ""
    problem: str = ""
    generation: int = 0
    step: str = "IDENTIFY_HARDWARE"
    facts: dict = field(default_factory=dict)


# ============================================================
# CIRCUITMATE AGENT
# ============================================================

class CircuitMateAgent(Agent):

    def __init__(self, ctx: JobContext):

        super().__init__(
            instructions=(
                "You are CircuitMate, a voice-first electronics troubleshooting assistant. "
                "The user is physically working on hardware, so be concise and actionable. "
                "Ask one diagnostic question or give one physical test at a time. "
                "Track board, MCU, pin, voltage, connection, firmware and problem facts. "
                "When the user corrects a technical value, immediately use the corrected value. "
                "Never insist on an old value after a correction. "
                "Do not invent measurements. If a measurement is needed, ask the user to perform it. "
                "Prefer safe low-voltage checks and tell the user to power down before changing wiring. "
                "Keep spoken responses short and natural."
            ),
            llm=inference.LLM(
                model=LLM_MODEL
            ),
        )

        self.ctx = ctx
        self.state = TroubleshootingState()
        self.turn_started = time.perf_counter()

    # ========================================================
    # SEND DATA TO FRONTEND
    # ========================================================

    async def emit(self, payload: dict):

        try:
            await self.ctx.room.local_participant.publish_data(
                json.dumps(payload),
                reliable=True,
                topic="circuitmate",
            )

        except Exception as e:
            print(
                f"[CircuitMate] Failed to emit data: {type(e).__name__}: {e}"
            )

    # ========================================================
    # EXTRACT HARDWARE INFORMATION
    # ========================================================

    def _extract(self, text: str):

        lower = text.lower()
        updates = {}

        board_patterns = [
            (r"\barduino\s+uno\b", "Arduino Uno"),
            (r"\barduino\s+nano\b", "Arduino Nano"),
            (r"\besp32\b", "ESP32"),
            (r"\besp8266\b", "ESP8266"),
            (
                r"\braspi\b|\braspberry\s+pi\b",
                "Raspberry Pi",
            ),
        ]

        for pattern, value in board_patterns:

            if re.search(pattern, lower):

                updates["board"] = value
                break

        # GPIO / Arduino D pin
        pin = re.search(
            r"\b(GPIO\s*\d+|D\s*\d+)\b",
            text,
            re.I,
        )

        if pin:

            updates["pin"] = (
                re.sub(
                    r"\s+",
                    " ",
                    pin.group(1).upper(),
                )
                .replace("D ", "D")
            )

        # Voltage
        voltage = re.search(
            r"\b(3\.3|5|12)\s*(?:V|volts?)\b",
            text,
            re.I,
        )

        if voltage:

            updates["voltage"] = (
                f"{voltage.group(1)}V"
            )

        # Connection
        if re.search(
            r"\b(usb|serial|uart)\b",
            lower,
        ):

            updates["connection"] = "USB/Serial"

        # LED problem
        if (
            re.search(r"\b(led|light)\b", lower)
            and re.search(
                r"\b("
                r"not working|"
                r"not responding|"
                r"doesn'?t work|"
                r"won'?t light|"
                r"off"
                r")\b",
                lower,
            )
        ):

            updates["problem"] = (
                "LED is not responding"
            )

        # Motor problem
        if (
            re.search(r"\bmotor\b", lower)
            and re.search(
                r"\b("
                r"not working|"
                r"doesn'?t work|"
                r"won'?t spin"
                r")\b",
                lower,
            )
        ):

            updates["problem"] = (
                "Motor is not responding"
            )

        # Sensor problem
        if (
            re.search(r"\bsensor\b", lower)
            and re.search(
                r"\b("
                r"not working|"
                r"no reading|"
                r"wrong reading"
                r")\b",
                lower,
            )
        ):

            updates["problem"] = (
                "Sensor reading is incorrect or missing"
            )

        # Firmware version
        if re.search(
            r"\bfirmware\b|\bversion\b",
            lower,
        ):

            version = re.search(
                r"\bv?(\d+\.\d+(?:\.\d+)?)\b",
                text,
            )

            if version:

                updates["firmware"] = (
                    version.group(1)
                )

        return updates

    # ========================================================
    # DETECT USER CORRECTIONS
    # ========================================================

    def _detect_correction(self, text: str):

        value = (
            r"(GPIO\s*\d+|"
            r"D\s*\d+|"
            r"\d+(?:\.\d+)?\s*(?:V|volts?))"
        )

        patterns = [

            rf"{value}\s*"
            rf"(?:,|\.\.\.|—|-)?\s*"
            rf"(?:no|actually|sorry|I meant|rather)\s*"
            rf"{value}",

            rf"(?:no|actually|sorry|I meant|rather)\s*"
            rf"{value}",
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                text,
                re.I,
            )

            if not match:
                continue

            groups = [
                g
                for g in match.groups()
                if g
            ]

            if len(groups) >= 2:

                previous = groups[-2]
                next_value = groups[-1]

            elif (
                len(groups) == 1
                and self.state.pin
            ):

                previous = self.state.pin
                next_value = groups[0]

            else:
                continue

            previous = (
                re.sub(
                    r"\s+",
                    " ",
                    previous.upper(),
                )
                .replace("D ", "D")
            )

            next_value = (
                re.sub(
                    r"\s+",
                    " ",
                    next_value.upper(),
                )
                .replace("D ", "D")
            )

            confidence = (
                0.96
                if previous != next_value
                else 0.72
            )

            return {
                "previous": previous,
                "next": next_value,
                "confidence": confidence,
                "field": (
                    "pin"
                    if (
                        "GPIO" in next_value
                        or next_value.startswith("D")
                    )
                    else "voltage"
                ),
            }

        return None

    # ========================================================
    # ADVANCE TROUBLESHOOTING STATE
    # ========================================================

    def _advance_step(self):

        if self.state.problem and self.state.pin:

            self.state.step = (
                "WIRING_VERIFICATION"
            )

        elif self.state.problem:

            self.state.step = (
                "COLLECT_FACTS"
            )

        elif self.state.board:

            self.state.step = (
                "IDENTIFY_PROBLEM"
            )

        else:

            self.state.step = (
                "IDENTIFY_HARDWARE"
            )

    # ========================================================
    # PROCESS USER TURN
    # ========================================================

    async def process_turn(self, text: str):

        self.turn_started = (
            time.perf_counter()
        )

        print(
            f"[CircuitMate] User transcript: {text}"
        )

        correction = (
            self._detect_correction(text)
        )

        updates = self._extract(text)

        # ----------------------------------------------------
        # Handle correction
        # ----------------------------------------------------

        if correction:

            field_name = correction["field"]

            if field_name == "pin":

                self.state.pin = (
                    correction["next"]
                )

                updates["pin"] = (
                    correction["next"]
                )

            elif field_name == "voltage":

                self.state.voltage = (
                    correction["next"]
                )

                updates["voltage"] = (
                    correction["next"]
                )

            self.state.generation += 1

            await self.emit(
                {
                    "type": "correction.detected",
                    "generation": (
                        self.state.generation
                    ),
                    "correction": correction,
                }
            )

        # ----------------------------------------------------
        # Apply extracted facts
        # ----------------------------------------------------

        for key, value in updates.items():

            setattr(
                self.state,
                key,
                value,
            )

        self._advance_step()

        self.state.facts = {

            "board": self.state.board,

            "mcu": self.state.mcu,

            "pin": self.state.pin,

            "voltage": self.state.voltage,

            "connection": self.state.connection,

            "firmware": self.state.firmware,

            "problem": self.state.problem,

            "step": self.state.step,

            "generation": self.state.generation,
        }

        # ----------------------------------------------------
        # Send updated facts
        # ----------------------------------------------------

        if updates:

            await self.emit(
                {
                    "type": "facts.updated",
                    "generation": (
                        self.state.generation
                    ),
                    "facts": self.state.facts,
                }
            )

        return self.state.facts

    # ========================================================
    # USER TURN COMPLETED
    # ========================================================

    async def on_user_turn_completed(
        self,
        turn_ctx,
        new_message,
    ):

        text = (
            new_message.text_content or ""
        ).strip()

        if not text:
            return

        facts = await self.process_turn(
            text
        )

        turn_ctx.add_message(
            role="system",
            content=(
                "Current CircuitMate hardware state:\n"
                f"{json.dumps(facts, ensure_ascii=False)}\n"
                "Use these facts as the source of truth "
                "for the next response. "
                "If a correction was detected, "
                "use the corrected value."
            ),
        )

        await self.update_chat_ctx(
            turn_ctx
        )


# ============================================================
# LIVEKIT SERVER
# ============================================================

server = AgentServer()


# ============================================================
# LIVEKIT RTC SESSION
# ============================================================

@server.rtc_session(
    agent_name=AGENT_NAME
)
async def entrypoint(ctx: JobContext):

    ctx.log_context_fields = {
        "room": ctx.room.name
    }

    print(
        f"[CircuitMate] Starting session "
        f"in room: {ctx.room.name}"
    )

    # --------------------------------------------------------
    # Create AgentSession
    # --------------------------------------------------------

    session = AgentSession(

        stt=deepgram.STT(
            model=DEEPGRAM_MODEL,
            language=DEEPGRAM_LANGUAGE,
            interim_results=True,
            smart_format=True,
        ),

        llm=inference.LLM(
            model=LLM_MODEL
        ),

        tts=rime.TTS(
            model=RIME_MODEL,
            speaker=RIME_SPEAKER,
        ),
    )

    # ========================================================
    # TRANSCRIPTION EVENT
    # ========================================================

    @session.on("user_input_transcribed")
    def on_transcript(event):

        print(
            "[CircuitMate] STT EVENT:",
            repr(event.transcript),
            "FINAL=",
            event.is_final,
        )

        asyncio.create_task(
            emit_transcript(
                ctx,
                event.transcript,
                event.is_final,
            )
        )

    # ========================================================
    # AGENT STATE EVENT
    # ========================================================

    @session.on("agent_state_changed")
    def on_agent_state(event):

        print(
            "[CircuitMate] Agent state:",
            event.new_state,
        )

        asyncio.create_task(
            emit_agent_state(
                ctx,
                event.new_state,
            )
        )

    # ========================================================
    # CONVERSATION ITEM EVENT
    # ========================================================
    #
    # IMPORTANT:
    # Not every LiveKit conversation item has
    # a "role".
    #
    # For example:
    # AgentHandoff
    #
    # Therefore we MUST NOT directly use:
    #
    #     item.role
    #
    # ========================================================

    @session.on("conversation_item_added")
    def on_conversation_item(event):

        item = event.item

        # Safely get attributes.
        role = getattr(
            item,
            "role",
            None,
        )

        text = getattr(
            item,
            "text_content",
            None,
        )

        print(
            "[CircuitMate] Conversation item:",
            type(item).__name__,
            "role=",
            role,
        )

        # Ignore items such as AgentHandoff
        # that don't have an assistant role.
        if role != "assistant":
            return

        if not text:
            return

        asyncio.create_task(
            emit_assistant_message(
                ctx,
                text,
            )
        )

    # ========================================================
    # CREATE AGENT
    # ========================================================

    agent = CircuitMateAgent(ctx)

    # ========================================================
    # START SESSION
    # ========================================================

    await session.start(
        agent=agent,
        room=ctx.room,
    )

    await ctx.connect()

    print(
        "[CircuitMate] Session connected successfully"
    )


# ============================================================
# SEND TRANSCRIPT TO FRONTEND
# ============================================================

async def emit_transcript(
    ctx,
    text: str,
    is_final: bool,
):

    try:

        await ctx.room.local_participant.publish_data(
            json.dumps(
                {
                    "type": (
                        "transcript.final"
                        if is_final
                        else "transcript.partial"
                    ),
                    "text": text,
                }
            ),
            reliable=True,
            topic="circuitmate",
        )

    except Exception as e:

        print(
            "[CircuitMate] Transcript emit failed:",
            type(e).__name__,
            str(e),
        )


# ============================================================
# SEND AGENT STATE TO FRONTEND
# ============================================================

async def emit_agent_state(
    ctx,
    state: str,
):

    try:

        await ctx.room.local_participant.publish_data(
            json.dumps(
                {
                    "type": "agent.state",
                    "state": state,
                }
            ),
            reliable=False,
            topic="circuitmate",
        )

    except Exception as e:

        print(
            "[CircuitMate] Agent state emit failed:",
            type(e).__name__,
            str(e),
        )


# ============================================================
# SEND ASSISTANT MESSAGE TO FRONTEND
# ============================================================

async def emit_assistant_message(
    ctx,
    text: str,
):

    try:

        await ctx.room.local_participant.publish_data(
            json.dumps(
                {
                    "type": "assistant.message",
                    "text": text,
                }
            ),
            reliable=True,
            topic="circuitmate",
        )

    except Exception as e:

        print(
            "[CircuitMate] Assistant message emit failed:",
            type(e).__name__,
            str(e),
        )
if __name__ == "__main__":
    cli.run_app(server)