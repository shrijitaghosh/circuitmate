from __future__ import annotations

import re
from typing import Any

from ..domain.trouble_shooting import (
    DebugState,
    DiagnosticTest,
    Session,
)


class TroubleshootingService:

    # ---------------------------------------------------------
    # MAIN ENTRY POINT
    # ---------------------------------------------------------

    def process_message(
        self,
        session: Session,
        message: str,
    ) -> dict[str, Any]:

        message = message.strip()

        if not message:
            return self._response(
                session,
                "I didn't catch that. Please tell me what you're troubleshooting."
            )

        # -----------------------------------------------------
        # 1. Detect corrections first
        # -----------------------------------------------------

        correction = self.detect_correction(message)

        if correction:
            self.apply_correction(
                session,
                correction["key"],
                correction["new_value"],
            )

            response = (
                f"Got it. I'll use {correction['new_value']} "
                f"instead of {correction['old_value']}."
            )

            session.add_turn(message, response)

            return self._response(
                session,
                response,
                extra={
                    "correction": correction,
                },
            )

        # -----------------------------------------------------
        # 2. Extract facts
        # -----------------------------------------------------

        extracted_facts = self.extract_facts(message)

        for key, value in extracted_facts.items():
            session.update_fact(key, value)

        # -----------------------------------------------------
        # 3. State machine
        # -----------------------------------------------------

        if session.state == DebugState.INITIAL:
            return self._handle_initial(session, message)

        if session.state == DebugState.IDENTIFY_HARDWARE:
            return self._handle_hardware(session, message)

        if session.state == DebugState.IDENTIFY_PROBLEM:
            return self._handle_problem(session, message)

        if session.state == DebugState.COLLECT_FACTS:
            return self._handle_facts(session, message)

        if session.state == DebugState.HYPOTHESIS:
            return self._handle_hypothesis(session)

        if session.state == DebugState.DIAGNOSTIC_TEST:
            return self._handle_diagnostic_test(session)

        if session.state == DebugState.RESULT:
            return self._handle_result(session, message)

        if session.state == DebugState.NEXT_TEST:
            return self._handle_next_test(session)

        if session.state == DebugState.RESOLUTION:
            return self._handle_resolution(session)

        return self._response(
            session,
            "Let's continue troubleshooting."
        )

    # ---------------------------------------------------------
    # INITIAL
    # ---------------------------------------------------------

    def _handle_initial(
        self,
        session: Session,
        message: str,
    ):
        if session.hardware:
            session.state = DebugState.IDENTIFY_PROBLEM

            response = (
                f"You're using {session.hardware}. "
                "What problem are you experiencing?"
            )

        else:
            session.state = DebugState.IDENTIFY_HARDWARE

            response = (
                "Sure. Let's troubleshoot it step by step. "
                "What hardware or board are you using?"
            )

        session.add_turn(message, response)

        return self._response(session, response)

    # ---------------------------------------------------------
    # IDENTIFY HARDWARE
    # ---------------------------------------------------------

    def _handle_hardware(
        self,
        session: Session,
        message: str,
    ):
        if not session.hardware:
            hardware = self.detect_hardware(message)

            if hardware:
                session.hardware = hardware

        if session.hardware:
            session.state = DebugState.IDENTIFY_PROBLEM

            response = (
                f"Got it. You're using {session.hardware}. "
                "What exactly isn't working?"
            )
        else:
            response = (
                "Which board or hardware are you using? "
                "For example, Arduino Uno, ESP32, ESP8266, or Raspberry Pi."
            )

        session.add_turn(message, response)

        return self._response(session, response)

    # ---------------------------------------------------------
    # IDENTIFY PROBLEM
    # ---------------------------------------------------------

    def _handle_problem(
        self,
        session: Session,
        message: str,
    ):
        if not session.problem:
            session.problem = self.detect_problem(message)

        if session.problem:
            session.state = DebugState.COLLECT_FACTS

            response = (
                f"Understood. The problem is: {session.problem}. "
                "Now I need a few details about your wiring and setup."
            )
        else:
            response = (
                "Tell me what you're observing. "
                "For example, the LED is not turning on, "
                "the sensor gives no reading, or the motor isn't moving."
            )

        session.add_turn(message, response)

        return self._response(session, response)

    # ---------------------------------------------------------
    # COLLECT FACTS
    # ---------------------------------------------------------

    def _handle_facts(
        self,
        session: Session,
        message: str,
    ):
        missing = self.get_missing_facts(session)

        if missing:
            question = self.question_for_fact(missing[0])

            response = question

        else:
            session.state = DebugState.HYPOTHESIS

            response = (
                "I have enough information. "
                "I'll analyze the most likely causes next."
            )

        session.add_turn(message, response)

        if session.state == DebugState.HYPOTHESIS:
            self.generate_hypotheses(session)

        return self._response(session, response)

    # ---------------------------------------------------------
    # HYPOTHESIS
    # ---------------------------------------------------------

    def _handle_hypothesis(
        self,
        session: Session,
    ):
        self.generate_hypotheses(session)

        session.state = DebugState.DIAGNOSTIC_TEST

        test = self.select_diagnostic_test(session)

        session.current_test = test

        response = (
            f"The most likely issue is {session.hypothesis[0]}. "
            f"Let's test that first. {test.description}"
        )

        session.add_turn("", response)

        return self._response(
            session,
            response,
            extra={
                "test": self.serialize_test(test),
            },
        )

    # ---------------------------------------------------------
    # DIAGNOSTIC TEST
    # ---------------------------------------------------------

    def _handle_diagnostic_test(
        self,
        session: Session,
    ):
        if not session.current_test:
            session.current_test = self.select_diagnostic_test(session)

        test = session.current_test

        response = (
            f"Please perform this test: {test.description} "
            f"Then tell me what you observe."
        )

        session.state = DebugState.RESULT

        session.add_turn("", response)

        return self._response(
            session,
            response,
            extra={
                "test": self.serialize_test(test),
            },
        )

    # ---------------------------------------------------------
    # RESULT
    # ---------------------------------------------------------

    def _handle_result(
        self,
        session: Session,
        message: str,
    ):
        if not session.current_test:
            session.state = DebugState.NEXT_TEST

            response = "Let's move to the next diagnostic check."

        else:
            result = self.interpret_result(message)

            session.record_test_result(
                session.current_test.id,
                result["result"],
                result["observation"],
            )

            if result["result"] == "PASS":
                response = (
                    "That test passed. "
                    "The original hypothesis is less likely."
                )

                session.hypothesis = session.hypothesis[1:]

                session.state = DebugState.NEXT_TEST

            elif result["result"] == "FAIL":
                response = (
                    "That result points toward the suspected issue. "
                    f"{session.current_test.failure_meaning}"
                )

                session.state = DebugState.RESOLUTION

            else:
                response = (
                    "I'm not sure whether that test passed or failed. "
                    "Please tell me exactly what you observed."
                )

        session.add_turn(message, response)

        return self._response(session, response)

    # ---------------------------------------------------------
    # NEXT TEST
    # ---------------------------------------------------------

    def _handle_next_test(
        self,
        session: Session,
    ):
        if not session.hypothesis:
            session.state = DebugState.RESOLUTION

            response = (
                "We've ruled out the main suspected causes. "
                "Let's apply the most appropriate fix."
            )

            session.add_turn("", response)

            return self._response(session, response)

        test = self.select_diagnostic_test(session)

        session.current_test = test
        session.state = DebugState.DIAGNOSTIC_TEST

        response = (
            f"Let's check another possibility. "
            f"{test.description}"
        )

        session.add_turn("", response)

        return self._response(
            session,
            response,
            extra={
                "test": self.serialize_test(test),
            },
        )

    # ---------------------------------------------------------
    # RESOLUTION
    # ---------------------------------------------------------

    def _handle_resolution(
        self,
        session: Session,
    ):
        fix = self.get_resolution(session)

        response = (
            f"I think we found the issue. {fix} "
            "After making the change, test the hardware again."
        )

        session.add_turn("", response)

        return self._response(session, response)

    # =========================================================
    # CORRECTION ENGINE
    # =========================================================

    def detect_correction(
        self,
        message: str,
    ) -> dict[str, Any] | None:

        patterns = [

            # GPIO
            (
                r"(?:gpio\s*)?(\d+)\s*(?:\.\.\.|,)?\s*"
                r"(?:actually|no|sorry|rather)\s*"
                r"(?:gpio\s*)?(\d+)",
                "gpio",
            ),

            # Voltage
            (
                r"(\d+(?:\.\d+)?)\s*v\s*"
                r"(?:\.\.\.|,)?\s*"
                r"(?:actually|no|sorry|rather)\s*"
                r"(\d+(?:\.\d+)?)\s*v",
                "voltage",
            ),

            # Resistance
            (
                r"(\d+)\s*(?:ohm|Ω)\s*"
                r"(?:\.\.\.|,)?\s*"
                r"(?:actually|no|sorry|rather)\s*"
                r"(\d+)\s*(?:ohm|Ω)",
                "resistance",
            ),

            # D pins
            (
                r"(d\d+)\s*(?:\.\.\.|,)?\s*"
                r"(?:actually|no|sorry|rather)\s*"
                r"(d\d+)",
                "digital_pin",
            ),
        ]

        lower = message.lower()

        for pattern, key in patterns:
            match = re.search(pattern, lower)

            if match:
                old_value = match.group(1)
                new_value = match.group(2)

                return {
                    "key": key,
                    "old_value": old_value,
                    "new_value": new_value,
                }

        # Generic correction:
        generic = re.search(
            r"(?:actually|no,?\s*actually|sorry,?\s*)"
            r"(.+)",
            lower,
        )

        if generic:
            correction_text = generic.group(1).strip()

            return {
                "key": "correction",
                "old_value": None,
                "new_value": correction_text,
            }

        return None

    def apply_correction(
        self,
        session: Session,
        key: str,
        new_value: Any,
    ):
        session.update_fact(key, new_value)

        # A correction invalidates any diagnostic work
        # based on the previous value.

        session.increment_generation()

        session.current_test = None

        if session.state in [
            DebugState.HYPOTHESIS,
            DebugState.DIAGNOSTIC_TEST,
            DebugState.RESULT,
            DebugState.NEXT_TEST,
        ]:
            session.state = DebugState.COLLECT_FACTS

    # =========================================================
    # FACT EXTRACTION
    # =========================================================

    def extract_facts(
        self,
        message: str,
    ) -> dict[str, Any]:

        facts = {}

        lower = message.lower()

        gpio = re.search(
            r"(?:gpio|pin)\s*(\d+)",
            lower,
        )

        if gpio:
            facts["gpio"] = int(gpio.group(1))

        voltage = re.search(
            r"(\d+(?:\.\d+)?)\s*v",
            lower,
        )

        if voltage:
            facts["voltage"] = float(voltage.group(1))

        resistance = re.search(
            r"(\d+)\s*(?:ohm|Ω)",
            lower,
        )

        if resistance:
            facts["resistance"] = int(resistance.group(1))

        return facts

    # =========================================================
    # HARDWARE DETECTION
    # =========================================================

    def detect_hardware(
        self,
        message: str,
    ) -> str | None:

        lower = message.lower()

        hardware = {
            "esp32": "ESP32",
            "esp8266": "ESP8266",
            "arduino uno": "Arduino Uno",
            "arduino nano": "Arduino Nano",
            "arduino mega": "Arduino Mega",
            "raspberry pi": "Raspberry Pi",
        }

        for keyword, name in hardware.items():
            if keyword in lower:
                return name

        return None

    # =========================================================
    # PROBLEM DETECTION
    # =========================================================

    def detect_problem(
        self,
        message: str,
    ) -> str | None:

        lower = message.lower()

        if "led" in lower and (
            "not working" in lower
            or "not turning" in lower
            or "doesn't turn" in lower
            or "won't turn" in lower
        ):
            return "LED is not turning on"

        if "sensor" in lower and (
            "no reading" in lower
            or "not reading" in lower
            or "not working" in lower
        ):
            return "Sensor is not providing a valid reading"

        if "motor" in lower and (
            "not moving" in lower
            or "not working" in lower
        ):
            return "Motor is not moving"

        if "wifi" in lower and (
            "not connecting" in lower
            or "doesn't connect" in lower
        ):
            return "Wi-Fi is not connecting"

        if (
            "not working" in lower
            or "doesn't work" in lower
            or "isn't working" in lower
        ):
            return message

        return None

    # =========================================================
    # FACT REQUIREMENTS
    # =========================================================

    def get_missing_facts(
        self,
        session: Session,
    ) -> list[str]:

        if not session.hardware:
            return ["hardware"]

        if not session.problem:
            return ["problem"]

        problem = session.problem.lower()

        if "led" in problem:
            required = [
                "gpio",
                "voltage",
                "resistance",
            ]

            return [
                fact
                for fact in required
                if fact not in session.facts
            ]

        return []

    def question_for_fact(
        self,
        fact: str,
    ) -> str:

        questions = {
            "hardware": "What board are you using?",
            "problem": "What exactly isn't working?",
            "gpio": "Which GPIO pin is the LED connected to?",
            "voltage": "What voltage are you using for the LED circuit?",
            "resistance": "What resistor value are you using?",
        }

        return questions.get(
            fact,
            f"Can you provide the {fact}?"
        )

    # =========================================================
    # HYPOTHESIS
    # =========================================================

    def generate_hypotheses(
        self,
        session: Session,
    ):

        hypotheses = []

        problem = (
            session.problem.lower()
            if session.problem
            else ""
        )

        if "led" in problem:
            gpio = session.facts.get("gpio")

            if gpio is not None:
                hypotheses.append(
                    f"GPIO {gpio} may not be configured correctly"
                )

            hypotheses.append(
                "LED polarity may be reversed"
            )

            hypotheses.append(
                "The resistor or wiring may be incorrect"
            )

            hypotheses.append(
                "The LED may be damaged"
            )

        elif "sensor" in problem:
            hypotheses.extend(
                [
                    "Sensor power connection may be incorrect",
                    "Sensor wiring may be incorrect",
                    "The sensor may not be initialized correctly",
                ]
            )

        elif "motor" in problem:
            hypotheses.extend(
                [
                    "Motor may not be receiving sufficient power",
                    "Motor driver wiring may be incorrect",
                    "The control GPIO may be incorrect",
                ]
            )

        else:
            hypotheses.append(
                "There may be a wiring, power, or configuration issue"
            )

        session.hypothesis = hypotheses

    # =========================================================
    # DIAGNOSTIC TESTS
    # =========================================================

    def select_diagnostic_test(
        self,
        session: Session,
    ) -> DiagnosticTest:

        problem = (
            session.problem.lower()
            if session.problem
            else ""
        )

        if "led" in problem:

            gpio = session.facts.get(
                "gpio",
                "the configured GPIO",
            )

            return DiagnosticTest(
                id="led_gpio_test",
                name="GPIO output test",
                description=(
                    f"Set GPIO {gpio} to HIGH and measure "
                    "whether the LED turns on."
                ),
                expected_result=(
                    "The LED should turn on."
                ),
                failure_meaning=(
                    "This suggests a GPIO configuration, "
                    "wiring, polarity, or LED problem."
                ),
            )

        return DiagnosticTest(
            id="basic_power_test",
            name="Power test",
            description=(
                "Check that the hardware is receiving "
                "the expected power and ground connections."
            ),
            expected_result=(
                "Power and ground should be present."
            ),
            failure_meaning=(
                "The hardware may not be powered correctly."
            ),
        )

    # =========================================================
    # RESULT INTERPRETATION
    # =========================================================

    def interpret_result(
        self,
        message: str,
    ) -> dict[str, str]:

        lower = message.lower()

        pass_words = [
            "worked",
            "works",
            "working",
            "turned on",
            "turns on",
            "yes",
            "success",
            "passed",
            "correct",
        ]

        fail_words = [
            "failed",
            "doesn't",
            "does not",
            "didn't",
            "not working",
            "still off",
            "still not",
            "no",
            "nothing",
            "failed",
        ]

        if any(word in lower for word in pass_words):
            return {
                "result": "PASS",
                "observation": message,
            }

        if any(word in lower for word in fail_words):
            return {
                "result": "FAIL",
                "observation": message,
            }

        return {
            "result": "UNKNOWN",
            "observation": message,
        }

    # =========================================================
    # RESOLUTION
    # =========================================================

    def get_resolution(
        self,
        session: Session,
    ) -> str:

        problem = (
            session.problem.lower()
            if session.problem
            else ""
        )

        if "led" in problem:

            gpio = session.facts.get(
                "gpio",
                "the correct GPIO",
            )

            return (
                f"Verify that the LED anode is connected "
                f"through the resistor to GPIO {gpio}, "
                "the cathode is connected to ground, "
                "and the GPIO is configured as OUTPUT."
            )

        if "sensor" in problem:
            return (
                "Verify the sensor's power, ground, "
                "signal wiring, and initialization code."
            )

        if "motor" in problem:
            return (
                "Verify the motor driver's power supply, "
                "ground, control pins, and enable pin."
            )

        return (
            "Check the power supply, ground connection, "
            "wiring, and software configuration."
        )

    # =========================================================
    # HELPERS
    # =========================================================

    def serialize_test(
        self,
        test: DiagnosticTest,
    ):
        return {
            "id": test.id,
            "name": test.name,
            "description": test.description,
            "expectedResult": test.expected_result,
            "failureMeaning": test.failure_meaning,
        }

    def _response(
        self,
        session: Session,
        message: str,
        extra: dict[str, Any] | None = None,
    ):
        result = {
            "ok": True,
            "sessionId": session.id,
            "state": session.state.value,
            "response": message,
            "hardware": session.hardware,
            "problem": session.problem,
            "facts": session.facts,
            "hypothesis": session.hypothesis,
            "generation": session.generation,
        }

        if session.current_test:
            result["currentTest"] = self.serialize_test(
                session.current_test
            )

        if extra:
            result.update(extra)

        return result


troubleshooting_service = TroubleshootingService()