<h1>CircuitMate</h1>
Troubleshooting hardware projects can be frustrating for students and beginners. While working with Arduino, ESP32, sensors, LEDs, motors, and breadboards, users often have to stop their work, pick up a phone or laptop, type their problem into an AI assistant, read the response, and return to the circuit.

Existing AI assistants can also struggle with technical speech, incomplete information, pauses, and self-corrections such as “Connect it to GPIO 13… wait, actually GPIO 12.”

CircuitMate addresses this gap with a voice-first, hands-free conversational debugger for physical electronics, allowing users to troubleshoot circuits through natural spoken interaction while keeping their hands on the hardware.

RIME Voice Evidence
1. Hard Voice Claim
The system uses RIME as the text-to-speech (TTS) provider to generate spoken responses from the assistant.
2. Acceptance Test
Given: A interactive question regarding hardware from the user. When: The response is sent to the RIME TTS provider. Then: RIME should successfully generate playable speech audio from the supplied text and voice.

Acceptance criteria:

RIME request is successfully completed.
Audio is returned/generated.
Generated audio can be played successfully.
The process can be repeated using the same procedure.
. Procedure
1. **User Authentication**
   User registers/logs in through the React frontend using JWT-based authentication.

2. **Start Troubleshooting Session**
   A unique troubleshooting session is created through the FastAPI backend.

3. **Identify Hardware & Problem**
   CircuitMate identifies the hardware (e.g., ESP32) and the reported problem.

4. **Collect Technical Information**
   The assistant collects required facts such as GPIO, voltage, resistance, etc.

5. **Voice Interaction**
   The user communicates naturally through voice using the realtime LiveKit-based voice pipeline.

6. **Detect Technical Corrections**
   CircuitMate detects corrections such as:
   *“GPIO 13… actually GPIO 12.”*

7. **Update Troubleshooting State**
   The corrected value replaces the previous value, while the existing session and conversation context are preserved.

8. **Invalidate Stale Diagnostic Work**
   Diagnostic work based on the old information is discarded/invalidated so outdated results are not used.

9. **Run Diagnostic Tests**
   The assistant generates troubleshooting tests, receives the user's results, and updates the diagnosis.

10. **Resolve the Problem**
    The troubleshooting state progresses until the cause is identified and a solution is provided.

11. **Generate Final Evidence**
    The Success/Results screen displays the problem, correction, confidence, diagnostic steps, resolution, and voice-system information.

### Core Flow

**Login → Session → Identify Hardware → Identify Problem → Collect Facts → Detect Correction → Update State → Diagnostic Test → Result → Resolution → Success/Results**

4. Result

TTS Endpoint Test
You
01:00:47
keeps starting randomly. What will be causing it?
CircuitMate
01:01:04
Switching to the ESP32. To start, are you powering it via USB or an external power supply?

“My Arduino has power, but my LED isn't blinking. Give me three possible causes and explain what I should check for each one.”
CircuitMate
01:05:51
Since you have power, check these three things: 1. **LED Polarity**: Is the LED backwards? Ensure the long leg (anode) is connected to the pin and the short leg (cathode) to ground. 2. **Pin Mismatch**: Does the pin number in your code match the physical pin you're plugged into? 3. **Wiring Connection**: Are any jumper wires loose or plugged into the wrong row of the breadboard?

Repeatability Test
You
01:08:16
What is an Arduino?
CircuitMate
01:08:38
An Arduino is an open-source electronics platform. It consists of a physical programmable circuit board (microcontroller) and software (IDE) that lets you write code to control things like LEDs, motors, and sensors.

You
01:08:16
Then what is an Arduino?
CircuitMate
01:09:13
In simpler terms, it's a small computer that you can program to interact with the physical world. You tell it what to do using code, and it can read inputs (like a button press) and control outputs (like turning on a light).
You
01:16:00
What is your motivation to help  a hardware people?
CircuitMate
01:16:45
My motivation is to remove the frustration from the "trial and error" phase of engineering. Hardware can be tedious—hunting for a single loose wire or a flipped LED—so I'm here to handle the tracking and diagnostic logic, letting you focus on the creative part of building your project!

Functional: yes
Repeatability: yes
Latency: very quick
Completeness: yes
Pronunciation: yes
Robustness: all short, long and medium question
Domain coverage:work for both hardware and generic questions
5. Limitations
No physical hardware access — CircuitMate cannot directly inspect the user's actual circuit, wiring, sensors, voltage, or board. It relies on the user's description. 
Trial-and-error troubleshooting — CircuitMate suggests and tests likely causes sequentially based on the user's symptoms. Since it cannot physically inspect or measure the hardware, the troubleshooting process may require trying multiple possible solutions before identifying the actual fault. 

6. Final Verdict
Notes:
CircuitMate successfully demonstrates a functional voice-based AI troubleshooting assistant for everything . It can understand user queries, provide relevant troubleshooting guidance, and communicate responses through voice. While it currently relies on a trial-and-error approach and cannot physically inspect hardware, it significantly reduces the difficulty of diagnosing common hardware problems through accessible, hands-free assistance.
Here is the working link of our website:
https://circuitmate-1lpx9dzk1-circuit-mate.vercel.app
