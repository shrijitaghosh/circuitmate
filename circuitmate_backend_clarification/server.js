const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------------------------------------------------------------
   CircuitMate — clarification resolver backend
   ---------------------------------------------------------------------
   Speech capture + speech-to-text happens CLIENT-SIDE (Web Speech API,
   or your Rime STT integration) — a server has no access to the user's
   mic. This backend receives the *final transcript* the client already
   produced and decides, safely, what (if anything) to confirm.

   Frontend wiring: replace MockAPI.resolveClarification() in
   clarification.jsx with a call to POST /api/clarification/resolve,
   passing the transcript your STT layer produced. See the bottom of
   this file for the exact fetch snippet.
------------------------------------------------------------------------ */

const CONFIDENCE_THRESHOLD = 0.75;

// Words that signal the speaker hesitated, self-corrected, or was unsure —
// each one lowers confidence, since it means the transcript is less likely
// to represent a single, deliberate value.
const HEDGE_WORDS = [
  "wait", "um", "uh", "actually", "or", "maybe", "possibly",
  "i think", "not sure", "hmm", "sorry",
];

function extractGpioMentions(transcript) {
  // Matches "GPIO 13", "gpio13", "GPIO #13", etc.
  const matches = [...transcript.matchAll(/gpio\s*#?\s*(\d{1,2})/gi)];
  return matches.map((m) => `GPIO ${m[1]}`);
}

function computeConfidence(transcript, mentions) {
  let confidence = 0.95;
  const lower = transcript.toLowerCase();

  HEDGE_WORDS.forEach((w) => {
    if (lower.includes(w)) confidence -= 0.08;
  });

  const distinctValues = new Set(mentions);
  if (distinctValues.size > 1) {
    // Multiple different pin numbers mentioned in one utterance — the
    // speaker was correcting themselves. Each extra distinct value
    // makes the "true" intent murkier.
    confidence -= 0.15 * (distinctValues.size - 1);
  }
  if (mentions.length === 0) confidence -= 0.5;

  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
}

function normalizePinValue(raw) {
  const trimmed = raw.trim();
  return /^gpio/i.test(trimmed) ? trimmed.toUpperCase() : `GPIO ${trimmed}`;
}

/**
 * POST /api/clarification/resolve
 * body: { transcript: string, previousValue?: string }
 *
 * Resolves a finished voice transcript into a confirmed value, or
 * explains why it couldn't. Mirrors MockAPI.resolveClarification but
 * driven by the real transcript instead of a canned result.
 */
app.post("/api/clarification/resolve", (req, res) => {
  const { transcript, previousValue } = req.body || {};

  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "transcript (string) is required" });
  }

  const mentions = extractGpioMentions(transcript);
  const confidence = computeConfidence(transcript, mentions);
  // If the speaker mentioned more than one pin, assume the last one is
  // the self-corrected, intended value ("GPIO 13... wait, GPIO 30").
  const detectedValue = mentions.length ? mentions[mentions.length - 1] : null;
  const safeToApply = confidence >= CONFIDENCE_THRESHOLD && !!detectedValue;

  let confirmedValue = null;
  let assistantReply;

  if (safeToApply) {
    confirmedValue = detectedValue;
    assistantReply = previousValue
      ? `Confirmed — ${confirmedValue} is now the active pin. (Previously ${previousValue}.)`
      : `Confirmed — ${confirmedValue} is now the active pin.`;
  } else if (detectedValue) {
    assistantReply = `I heard ${detectedValue}, but I'm only ${Math.round(
      confidence * 100
    )}% confident. Can you confirm which pin you meant, or enter it manually?`;
  } else {
    assistantReply = "I couldn't make out a GPIO number in what you said. Could you repeat just the number, or enter it manually?";
  }

  res.json({
    transcript,
    mentions,
    detectedValue,
    confidence,
    threshold: CONFIDENCE_THRESHOLD,
    safeToApply,
    confirmedValue,
    assistantReply,
  });
});

/**
 * POST /api/clarification/manual
 * body: { value: string }
 *
 * Backs the "Enter manually" path — normalizes free text into a
 * GPIO value and confirms it directly (manual entry is inherently
 * high-confidence, so no threshold check).
 */
app.post("/api/clarification/manual", (req, res) => {
  const { value } = req.body || {};
  if (!value || typeof value !== "string" || !value.trim()) {
    return res.status(400).json({ error: "value (non-empty string) is required" });
  }

  const confirmedValue = normalizePinValue(value);
  res.json({
    confirmedValue,
    assistantReply: `Confirmed manually — ${confirmedValue} is now the active pin.`,
  });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`CircuitMate clarification backend listening on :${PORT}`);
});

module.exports = app;
