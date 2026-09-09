import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Mic, Keyboard, ArrowRight, ShieldCheck, Check, RotateCcw } from "lucide-react";

/* ---------------------------------------------------------------------
   Design tokens — shared with the CircuitMate dashboard / landing page
   so this clarification screen reads as part of the same product.
--------------------------------------------------------------------- */
const C = {
  bg: "#090d0b",
  bgAlt: "#0d1310",
  panel: "#0f1613",
  panelHi: "#131c17",
  border: "rgba(140,214,178,0.14)",
  borderHi: "rgba(140,214,178,0.30)",
  text1: "#e8f2ec",
  text2: "#9fb3aa",
  text3: "#647169",
  accent: "#5eebae",
  accentSoft: "rgba(94,235,174,0.14)",
  accentGlow: "rgba(94,235,174,0.5)",
  copper: "#d99a5b",
  copperSoft: "rgba(217,154,91,0.14)",
  copperGlow: "rgba(217,154,91,0.5)",
};

const FONT_SANS = "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'SF Mono', monospace";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

/* ---------------------------------------------------------------------
   Mock backend layer — same shape a real API response would have.
   Swap the bodies of these two functions for real requests when
   Member 1's backend is ready; the state machine below stays the same.
--------------------------------------------------------------------- */
const MockAPI = {
  async recognizeClarificationSpeech(onPartial) {
    await wait(500);
    onPartial("GPIO 13");
    await wait(700);
    onPartial("GPIO 13… definitely GPIO 13.");
    await wait(500);
    return "GPIO 13… definitely GPIO 13.";
  },
  async resolveClarification() {
    await wait(1000);
    return {
      confirmedValue: "GPIO 13",
      confidence: 0.98,
      assistantReply: "Confirmed — GPIO 13 stays the active pin. Nothing was changed automatically.",
    };
  },
};

export default function ClarificationScreen() {
  const [voiceState, setVoiceState] = useState("idle"); // idle | listening | processing | resolved
  const [liveTranscript, setLiveTranscript] = useState("");
  const [resolved, setResolved] = useState(false);
  const [confirmedValue, setConfirmedValue] = useState(null);
  const [assistantFollowup, setAssistantFollowup] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [activeTicks, setActiveTicks] = useState(() => new Array(36).fill(false));
  const tickTimerRef = useRef(null);

  useEffect(() => {
    const id = "circuitmate-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
      document.head.appendChild(link);
    }
    return () => clearInterval(tickTimerRef.current);
  }, []);

  useEffect(() => {
    clearInterval(tickTimerRef.current);
    if (voiceState === "listening" || voiceState === "resolved") {
      tickTimerRef.current = setInterval(() => {
        setActiveTicks((prev) => prev.map(() => Math.random() > 0.72));
      }, 150);
    } else {
      setActiveTicks(new Array(36).fill(false));
    }
    return () => clearInterval(tickTimerRef.current);
  }, [voiceState]);

  async function runClarifyByVoice() {
    if (voiceState !== "idle" || manualOpen) return;
    setLiveTranscript("");
    setVoiceState("listening");

    await MockAPI.recognizeClarificationSpeech((partial) => setLiveTranscript(partial));

    setVoiceState("processing");
    const result = await MockAPI.resolveClarification();

    setConfirmedValue(result.confirmedValue);
    setAssistantFollowup(result.assistantReply);
    setResolved(true);
    setVoiceState("resolved");

    await wait(3200);
    setVoiceState("idle");
  }

  function submitManualValue() {
    const value = manualValue.trim();
    if (!value) return;
    setConfirmedValue(value.toUpperCase().startsWith("GPIO") ? value.toUpperCase() : `GPIO ${value}`);
    setAssistantFollowup(`Confirmed manually — ${value.toUpperCase().startsWith("GPIO") ? value.toUpperCase() : `GPIO ${value}`} is now the active pin.`);
    setResolved(true);
    setManualOpen(false);
    setManualValue("");
  }

  function resetDemo() {
    setResolved(false);
    setConfirmedValue(null);
    setAssistantFollowup(null);
    setLiveTranscript("");
    setVoiceState("idle");
  }

  const micStateCopy = {
    idle: { title: "Clarify by voice", sub: "Tap to answer" },
    listening: { title: "Listening…", sub: "Say the pin you meant" },
    processing: { title: "Processing…", sub: "Checking confidence" },
    resolved: { title: "Confirmed", sub: "Value updated safely" },
  }[voiceState];

  return (
    <>
      <style>{`
        @keyframes cm-dotpulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes cm-breathe { 0%,100%{transform:scale(0.97); opacity:0.7} 50%{transform:scale(1.05); opacity:1} }
        @keyframes cm-rotate { to{ transform: rotate(360deg); } }
        @keyframes cm-flash {
          0%{ box-shadow: 0 0 0 1px rgba(217,154,91,0.08), 0 0 0 0 rgba(217,154,91,0.0); }
          30%{ box-shadow: 0 0 0 1px rgba(217,154,91,0.5), 0 0 40px 4px rgba(217,154,91,0.4); }
          100%{ box-shadow: 0 0 0 1px rgba(217,154,91,0.08), 0 24px 60px -24px rgba(217,154,91,0.3); }
        }
        @keyframes cm-flash-green {
          0%{ box-shadow: 0 0 0 1px rgba(94,235,174,0.1), 0 0 0 0 rgba(94,235,174,0.0); }
          30%{ box-shadow: 0 0 0 1px rgba(94,235,174,0.5), 0 0 40px 4px rgba(94,235,174,0.4); }
          100%{ box-shadow: 0 0 0 1px rgba(94,235,174,0.15), 0 24px 60px -24px rgba(94,235,174,0.3); }
        }
        .cm-flash-amber { animation: cm-flash 1000ms ease; }
        .cm-flash-green { animation: cm-flash-green 1000ms ease; }
        .cm-bg-grid::before{
          content:"";
          position:fixed; inset:0;
          background-image:
            linear-gradient(${C.border} 1px, transparent 1px),
            linear-gradient(90deg, ${C.border} 1px, transparent 1px);
          background-size: 56px 56px;
          opacity:0.10;
          pointer-events:none;
        }
        .cm-scope * { box-sizing: border-box; }
        .cm-scope button { font-family: ${FONT_SANS}; cursor:pointer; }
        .cm-tick { position:absolute; width:2px; height:7px; background:${C.text3}; left:50%; top:0; transform-origin: 1px 95px; border-radius:1px; transition: background 0.3s ease, height 0.3s ease; }
        .cm-tick.on-listen { background:${C.accent}; height:12px; box-shadow: 0 0 6px ${C.accentGlow}; }
        .cm-tick.on-resolve { background:${C.accent}; height:12px; box-shadow: 0 0 6px ${C.accentGlow}; }
        @media (max-width: 980px){ .cm-grid-2 { grid-template-columns: 1fr !important; } .cm-hide-mobile{ display:none !important; } }
        @media (max-width: 640px){ .cm-detail-3 { grid-template-columns: 1fr !important; } .cm-statusbar-inner{ gap:16px !important; } }
        @media (prefers-reduced-motion: reduce){ .cm-scope *{ animation-duration: 0.001ms !important; transition:none !important; } }
      `}</style>

      <div
        className="cm-scope cm-bg-grid"
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.text1,
          fontFamily: FONT_SANS,
          lineHeight: 1.5,
          position: "relative",
        }}
      >
        {/* ---------------- HEADER ---------------- */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(9,13,11,0.85)",
            backdropFilter: "blur(14px)",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "15px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 15.5 }}>
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <rect x="1" y="1" width="30" height="30" rx="7" stroke={C.accent} strokeOpacity="0.5" strokeWidth="1" />
                <circle cx="10" cy="10" r="2.2" fill={C.accent} />
                <circle cx="22" cy="22" r="2.2" fill={C.accent} fillOpacity="0.5" />
                <path d="M10 12.2V16.5C10 17.6 10.9 18.5 12 18.5H16.5" stroke={C.accent} strokeWidth="1.4" fill="none" />
                <path d="M16.5 18.5H20C21.1 18.5 22 17.6 22 16.5V19.8" stroke={C.accent} strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
                <circle cx="16.5" cy="18.5" r="1.4" fill={C.text1} />
              </svg>
              <span>CircuitMate</span>
            </div>

            <div
              className="cm-hide-mobile"
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: C.text2,
              }}
            >
              Voice Hardware Troubleshooter
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: C.text2,
                padding: "6px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 100,
                background: C.panel,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: C.accent,
                  boxShadow: `0 0 8px 1px ${C.accentGlow}`,
                  animation: "cm-dotpulse 2.2s ease-in-out infinite",
                }}
              />
              Rime Active
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 0", position: "relative", zIndex: 1 }}>
          {/* ---------------- MAIN DIAGNOSTIC PANEL ---------------- */}
          <section
            style={{
              background: `linear-gradient(180deg, rgba(217,154,91,0.06), ${C.panel} 55%)`,
              border: `1px solid rgba(217,154,91,0.35)`,
              borderRadius: 16,
              padding: "26px 28px",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: C.copperSoft,
                  border: `1px solid rgba(217,154,91,0.4)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} color={C.copper} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: C.copper,
                    marginBottom: 8,
                  }}
                >
                  Need clarification
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 10 }}>
                  I couldn&rsquo;t confidently understand your correction.
                </div>
                <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, maxWidth: 640 }}>
                  I heard something different from your previous GPIO value, but the correction confidence is too low
                  to safely update the diagnostic.
                </p>
              </div>
            </div>
          </section>

          {/* ---------------- WHAT I HEARD / PREVIOUS VALUE ---------------- */}
          <div className="cm-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* WHAT I HEARD */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
              <CardTitle>What I heard</CardTitle>
              <div
                style={{
                  background: C.bgAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  fontSize: 14.5,
                  marginBottom: 18,
                }}
              >
                GPIO 13<span style={{ color: C.text3 }}>&hellip; wait, </span>
                <span style={{ color: C.copper, fontWeight: 600 }}>GPIO 30</span>
              </div>

              <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: C.text3, marginBottom: 10 }}>
                Confidence
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ConfidenceMeter value={0.61} segments={5} color={C.copper} />
                <span style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 600, color: C.copper }}>61%</span>
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.text3, marginTop: 8 }}>
                Below the safe-update threshold
              </div>
            </div>

            {/* PREVIOUS / DETECTED COMPARISON */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
              <CardTitle>Value comparison</CardTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: C.text3, marginBottom: 6 }}>
                    Previous value
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 19, fontWeight: 600, color: C.accent }}>GPIO 13</div>
                  <div style={{ fontSize: 11.5, color: C.text3, marginTop: 4 }}>Still active</div>
                </div>
                <ArrowRight size={16} color={C.text3} />
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: C.text3, marginBottom: 6 }}>
                    Detected value
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 19, fontWeight: 600, color: C.copper }}>GPIO 30</div>
                  <div style={{ fontSize: 11.5, color: C.text3, marginTop: 4 }}>Awaiting confirmation</div>
                </div>
              </div>

              <StatusBadge resolved={resolved} confirmedValue={confirmedValue} />
            </div>
          </div>

          {/* ---------------- CLARIFICATION REQUEST + VOICE CONTROL ---------------- */}
          <section
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "30px 30px 26px",
              marginBottom: 20,
            }}
          >
            <CardTitle>Clarification request</CardTitle>

            <div
              style={{
                background: C.bgAlt,
                border: `1px solid ${C.borderHi}`,
                borderRadius: 12,
                padding: "16px 18px",
                marginBottom: 26,
                maxWidth: 640,
              }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: C.text3, marginBottom: 8 }}>
                CircuitMate
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.5 }}>
                {resolved ? assistantFollowup : "Did you mean GPIO 12, GPIO 13, or another pin?"}
              </div>
              {liveTranscript && voiceState !== "idle" && !resolved && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontFamily: FONT_MONO, fontSize: 13, color: C.text2 }}>
                  You: {liveTranscript}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <MicControl voiceState={voiceState} activeTicks={activeTicks} />

              <div style={{ textAlign: "center", marginTop: 18, marginBottom: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{micStateCopy.title}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.text3 }}>{micStateCopy.sub}</div>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  onClick={runClarifyByVoice}
                  disabled={voiceState !== "idle"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    background: voiceState === "idle" ? "transparent" : C.panelHi,
                    color: C.text1,
                    border: `1px solid ${voiceState === "idle" ? "rgba(217,154,91,0.5)" : C.border}`,
                    borderRadius: 10,
                    padding: "12px 22px",
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: voiceState === "idle" ? 1 : 0.5,
                  }}
                >
                  <Mic size={16} color={voiceState === "idle" ? C.copper : C.text3} />
                  Clarify by voice
                </button>
                <button
                  onClick={() => setManualOpen((v) => !v)}
                  disabled={voiceState !== "idle"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    background: "transparent",
                    color: C.text2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "12px 22px",
                    fontSize: 14,
                    fontWeight: 500,
                    opacity: voiceState === "idle" ? 1 : 0.5,
                  }}
                >
                  <Keyboard size={16} color={C.text2} />
                  Enter manually
                </button>
                {resolved && (
                  <button
                    onClick={resetDemo}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 9,
                      background: "transparent",
                      color: C.text3,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "12px 18px",
                      fontSize: 13,
                    }}
                  >
                    <RotateCcw size={14} color={C.text3} />
                    Reset demo
                  </button>
                )}
              </div>

              {manualOpen && (
                <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
                  <input
                    autoFocus
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitManualValue()}
                    placeholder="e.g. GPIO 13"
                    style={{
                      background: C.bgAlt,
                      border: `1px solid ${C.borderHi}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: C.text1,
                      fontFamily: FONT_MONO,
                      fontSize: 13,
                      outline: "none",
                      width: 180,
                    }}
                  />
                  <button
                    onClick={submitManualValue}
                    style={{
                      background: C.accentSoft,
                      color: C.accent,
                      border: `1px solid rgba(94,235,174,0.4)`,
                      borderRadius: 8,
                      padding: "10px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Confirm value
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ---------------- SAFETY MESSAGE ---------------- */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: FONT_MONO,
              fontSize: 12,
              color: C.text3,
              padding: "14px 4px",
              marginBottom: 8,
            }}
          >
            <ShieldCheck size={15} color={C.text3} />
            CircuitMate avoids guessing technical values when speech confidence is low.
          </div>
        </main>

        {/* ---------------- BOTTOM STATUS BAR ---------------- */}
        <footer style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, background: C.bgAlt }}>
          <div
            className="cm-statusbar-inner"
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "14px 32px",
              display: "flex",
              flexWrap: "wrap",
              gap: 30,
              fontFamily: FONT_MONO,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.text3 }}>Rime</span>
              <span style={{ color: C.accent }}>Active &#10003;</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.text3 }}>Speech recognition</span>
              <span style={{ color: C.accent }}>Connected &#10003;</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.text3 }}>Backend</span>
              <span style={{ color: C.text2 }}>Mock Mode</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------
   Small presentational helpers
--------------------------------------------------------------------- */

function CardTitle({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: C.text3,
        marginBottom: 18,
      }}
    >
      <span style={{ width: 12, height: 1, background: C.copper, display: "inline-block" }} />
      {children}
    </div>
  );
}

function ConfidenceMeter({ value, segments = 5, color }) {
  const lit = Math.round(value * segments);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 8 + i * 4,
            borderRadius: 2,
            background: i < lit ? color : "rgba(140,214,178,0.08)",
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function StatusBadge({ resolved, confirmedValue }) {
  if (resolved) {
    return (
      <div
        className="cm-flash-green"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontFamily: FONT_MONO,
          fontSize: 12,
          padding: "7px 13px",
          borderRadius: 100,
          background: C.accentSoft,
          color: C.accent,
          border: "1px solid rgba(94,235,174,0.4)",
        }}
      >
        <Check size={13} />
        Confirmed &middot; {confirmedValue} active
      </div>
    );
  }
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: FONT_MONO,
        fontSize: 12,
        padding: "7px 13px",
        borderRadius: 100,
        background: C.copperSoft,
        color: C.copper,
        border: "1px solid rgba(217,154,91,0.4)",
      }}
    >
      <AlertTriangle size={13} />
      Unconfirmed — no value applied
    </div>
  );
}

function MicControl({ voiceState, activeTicks }) {
  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing";
  const isResolved = voiceState === "resolved";
  const glowColor = isResolved ? C.accent : isListening ? C.accent : isProcessing ? C.text2 : C.copper;
  const glow = isResolved || isListening ? C.accentGlow : C.copperGlow;

  return (
    <div style={{ position: "relative", width: 168, height: 168, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          width: 168,
          height: 168,
          borderRadius: "50%",
          border: `1px solid ${C.border}`,
          animation: isListening || isResolved ? "cm-breathe 1.4s ease-in-out infinite" : "none",
        }}
      />
      <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", border: `1px solid ${C.borderHi}` }} />

      <div style={{ position: "absolute", width: 168, height: 168 }}>
        {activeTicks.map((on, i) => (
          <div
            key={i}
            className={`cm-tick ${on ? (isResolved ? "on-resolve" : "on-listen") : ""}`}
            style={{ transform: `rotate(${(360 / activeTicks.length) * i}deg)`, transformOrigin: "1px 84px" }}
          />
        ))}
      </div>

      {isProcessing && (
        <div
          style={{
            position: "absolute",
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: C.text2,
            borderRightColor: C.text2,
            animation: "cm-rotate 900ms linear infinite",
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: `linear-gradient(180deg, ${C.panelHi}, ${C.panel})`,
          border: `1px solid ${isListening || isResolved ? C.accent : isProcessing ? C.borderHi : C.copper}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isListening || isResolved || voiceState === "idle" ? `0 0 0 1px rgba(0,0,0,0.3), 0 0 30px -6px ${glow}` : "none",
        }}
      >
        {isResolved ? <Check size={26} color={C.accent} /> : <Mic size={26} color={glowColor} />}
      </div>
    </div>
  );
}
