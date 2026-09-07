# Wiring clarification.jsx to the real backend

`recognizeClarificationSpeech` has to stay client-side — a server can't
access the user's mic. Use the Web Speech API (or your Rime STT SDK) to
capture audio and produce a transcript, then send that transcript to the
backend for the confidence/resolution decision.

Replace the `MockAPI` object in `clarification.jsx` with:

```js
const API_BASE = "http://localhost:8787"; // or your deployed URL

const API = {
  async recognizeClarificationSpeech(onPartial) {
    return new Promise((resolve, reject) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error("Speech recognition not supported in this browser"));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += chunk;
          else interim += chunk;
        }
        onPartial(finalTranscript + interim);
      };

      recognition.onerror = (event) => reject(new Error(event.error));
      recognition.onend = () => resolve(finalTranscript.trim());

      recognition.start();
    });
  },

  async resolveClarification(transcript, previousValue) {
    const res = await fetch(`${API_BASE}/api/clarification/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, previousValue }),
    });
    if (!res.ok) throw new Error("Failed to resolve clarification");
    const data = await res.json();

    // Shape matches what runClarifyByVoice() expects:
    return {
      confirmedValue: data.confirmedValue, // may be null if unresolved
      confidence: data.confidence,
      assistantReply: data.assistantReply,
      safeToApply: data.safeToApply,
    };
  },
};
```

Then in `runClarifyByVoice()`, pass the transcript through and branch on
`safeToApply` instead of assuming the mock always resolves:

```js
async function runClarifyByVoice() {
  if (voiceState !== "idle" || manualOpen) return;
  setLiveTranscript("");
  setVoiceState("listening");

  const transcript = await API.recognizeClarificationSpeech((partial) =>
    setLiveTranscript(partial)
  );

  setVoiceState("processing");
  const result = await API.resolveClarification(transcript, confirmedValue);

  if (result.safeToApply) {
    setConfirmedValue(result.confirmedValue);
    setAssistantFollowup(result.assistantReply);
    setResolved(true);
    setVoiceState("resolved");
    await wait(3200);
    setVoiceState("idle");
  } else {
    // Low confidence — surface the assistant's follow-up question but
    // don't mark anything resolved, and drop back to idle so the user
    // can retry by voice or switch to manual entry.
    setAssistantFollowup(result.assistantReply);
    setVoiceState("idle");
  }
}
```

For manual entry, swap `submitManualValue()`'s local formatting logic for
a call to `POST /api/clarification/manual` so normalization stays
consistent with the server (in case you later add pin-range validation,
aliasing, etc. server-side).

## Running the backend

```bash
npm install
npm start
```

Runs on `:8787` by default (`PORT` env var to change it). CORS is open —
lock `allowed_origins` down before deploying.
