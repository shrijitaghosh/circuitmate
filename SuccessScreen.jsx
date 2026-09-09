import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Check,
  Mic,
  RotateCcw,
  ArrowRight,
  Radio,
  Cpu,
  Clock,
} from "lucide-react";

/* ---------------------------------------------------------------------
   Design tokens — shared with the rest of the CircuitMate screens
   (landing page, dashboard, clarification screen) for visual continuity.
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

const STEPS = [
  "Identified LED issue",
  "Checked GPIO configuration",
  "Detected spoken correction",
  "Updated GPIO 13 \u2192 GPIO 12",
  "Verified configuration",
  "Confirmed resolution",
];

const METRICS = [
  { label: "Duration", value: "02:41", icon: Clock },
  { label: "Correction", value: "Detected", icon: RotateCcw },
  { label: "Voice engine", value: "Rime Active", icon: Radio },
  { label: "Final status", value: "Solved", icon: CheckCircle2 },
];

export default function SuccessScreen() {
  const [mounted, setMounted] = useState(false);

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
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes cm-dotpulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes cm-settle-in {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes cm-ring-glow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
        @keyframes cm-rise {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .cm-scope * { box-sizing: border-box; }
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
        .cm-settle { animation: cm-settle-in 500ms cubic-bezier(0.2,0.7,0.3,1) both; }
        .cm-rise { animation: cm-rise 420ms ease both; }
        .cm-ring { animation: cm-ring-glow 3.2s ease-in-out infinite; }
        .cm-btn-primary:hover { transform: translateY(-1px); }
        .cm-metric:hover, .cm-card:hover { border-color: ${C.borderHi}; }
        @media (max-width: 980px){
          .cm-grid-2 { grid-template-columns: 1fr !important; }
          .cm-metrics { grid-template-columns: 1fr 1fr !important; }
          .cm-hide-mobile { display: none !important; }
        }
        @media (max-width: 560px){
          .cm-metrics { grid-template-columns: 1fr !important; }
          .cm-actions { flex-direction: column !important; }
          .cm-actions button { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce){
          .cm-scope * { animation-duration: 0.001ms !important; transition: none !important; }
        }
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
              Rime Active &#10003;
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 32px 0", position: "relative", zIndex: 1 }}>
          {/* ---------------- SUCCESS HERO ---------------- */}
          <section
            style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 44 }}
          >
            <div
              className={mounted ? "cm-settle" : ""}
              style={{ position: "relative", width: 96, height: 96, marginBottom: 26, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div
                className="cm-ring"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${C.accentSoft} 0%, transparent 72%)`,
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: C.panelHi,
                  border: `1px solid ${C.accent}`,
                  boxShadow: `0 0 0 1px rgba(94,235,174,0.35), 0 0 34px -6px ${C.accentGlow}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={34} color={C.accent} strokeWidth={2.2} />
              </div>
            </div>

            <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 10 }}>Problem Solved</h1>
            <p style={{ fontSize: 15.5, color: C.text2, marginBottom: 18, maxWidth: 420 }}>
              The LED issue was resolved successfully.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: FONT_MONO,
                  fontSize: 11.5,
                  letterSpacing: "0.08em",
                  padding: "7px 14px",
                  borderRadius: 100,
                  background: C.accentSoft,
                  color: C.accent,
                  border: "1px solid rgba(94,235,174,0.4)",
                  textTransform: "uppercase",
                }}
              >
                <CheckCircle2 size={13} />
                Diagnostic complete
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: FONT_MONO,
                  fontSize: 11.5,
                  padding: "7px 14px",
                  borderRadius: 100,
                  background: C.panel,
                  color: C.text3,
                  border: `1px solid ${C.border}`,
                }}
              >
                <Mic size={13} />
                Resolved via voice interaction
              </span>
            </div>
          </section>

          {/* ---------------- PROBLEM SUMMARY / STEPS ---------------- */}
          <div className="cm-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div className="cm-card" style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", transition: "border-color 0.2s ease" }}>
              <CardTitle>Problem</CardTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Row label="Device" value="Arduino Uno" />
                <Row label="Problem" value="LED not responding" />
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.text3, marginBottom: 6 }}>Resolution</div>
                  <div style={{ fontSize: 13.5, color: C.text1, lineHeight: 1.55 }}>
                    Incorrect GPIO reference corrected from <span style={{ fontFamily: FONT_MONO, color: C.text3 }}>GPIO 13</span> to{" "}
                    <span style={{ fontFamily: FONT_MONO, color: C.accent, fontWeight: 600 }}>GPIO 12</span>.
                  </div>
                </div>
              </div>
            </div>

            <div className="cm-card" style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", transition: "border-color 0.2s ease" }}>
              <CardTitle>Steps taken</CardTitle>
              <ol style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
                {STEPS.map((step, i) => (
                  <li
                    key={step}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 0",
                      fontSize: 13.5,
                      color: C.text2,
                    }}
                  >
                    {i !== 0 && (
                      <span style={{ position: "absolute", left: 9, top: -50 + "%", width: 1, height: "100%", background: C.borderHi, zIndex: 0 }} />
                    )}
                    <span
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: C.accentSoft,
                        border: `1px solid ${C.accent}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={11} color={C.accent} strokeWidth={3} />
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* ---------------- CORRECTION DETECTED ---------------- */}
          <section
            style={{
              position: "relative",
              background: `linear-gradient(180deg, rgba(217,154,91,0.08), ${C.panel} 60%)`,
              border: "1px solid rgba(217,154,91,0.4)",
              borderRadius: 16,
              padding: "26px 28px 24px",
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.copper}, transparent)` }} />

            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: C.copperSoft,
                  border: "1px solid rgba(217,154,91,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={19} color={C.copper} strokeWidth={1.7} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 3 }}>Correction detected</div>
                <div style={{ fontSize: 12.5, color: C.text2 }}>Self-correction identified and applied mid-session</div>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: FONT_MONO,
                  fontSize: 11.5,
                  padding: "5px 11px",
                  borderRadius: 100,
                  background: C.accentSoft,
                  color: C.accent,
                  border: "1px solid rgba(94,235,174,0.35)",
                }}
              >
                <Check size={12} />
                Accepted
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontFamily: FONT_MONO,
                padding: "18px 20px",
                background: C.bgAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 20, color: C.text3, textDecoration: "line-through", textDecorationColor: "rgba(159,179,170,0.5)" }}>
                GPIO 13
              </span>
              <ArrowRight size={18} color={C.text3} />
              <span style={{ fontSize: 22, color: C.copper, fontWeight: 600 }}>GPIO 12</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: C.text3, marginBottom: 8 }}>
                  Correction confidence
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 4, background: "rgba(140,214,178,0.08)", overflow: "hidden" }}>
                    <div style={{ width: "94%", height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.copper}, #ecc088)` }} />
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.text2 }}>94%</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: C.text3, marginBottom: 8 }}>
                  Correction status
                </div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 600, color: C.accent }}>Accepted</div>
              </div>
            </div>
          </section>

          {/* ---------------- SESSION METRICS ---------------- */}
          <div className="cm-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
            {METRICS.map((m) => (
              <div
                key={m.label}
                className="cm-metric"
                style={{
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: "18px 18px",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: C.text3 }}>
                    {m.label}
                  </span>
                  <m.icon size={14} color={C.accent} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* ---------------- VOICE SYSTEM ---------------- */}
          <div className="cm-card" style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 34, transition: "border-color 0.2s ease" }}>
            <CardTitle>Voice system</CardTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} className="cm-grid-2">
              <VoiceStat label="Rime TTS" value="Active" ok icon={Radio} />
              <VoiceStat label="Speech recognition" value="Connected" ok icon={Cpu} />
              <VoiceStat label="Average response" value="420 ms" icon={Clock} />
            </div>
          </div>

          {/* ---------------- ACTIONS ---------------- */}
          <div className="cm-actions" style={{ display: "flex", gap: 16, justifyContent: "center", paddingBottom: 48 }}>
            <button
              className="cm-btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: C.accent,
                color: "#06110c",
                fontWeight: 600,
                fontSize: 14.5,
                padding: "14px 26px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                boxShadow: `0 0 0 1px rgba(94,235,174,0.4), 0 8px 28px -8px ${C.accentGlow}`,
                transition: "transform 0.15s ease",
                fontFamily: FONT_SANS,
              }}
            >
              <Mic size={16} />
              Start New Troubleshooting
            </button>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                background: "transparent",
                color: C.text2,
                fontWeight: 500,
                fontSize: 14.5,
                padding: "14px 24px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                fontFamily: FONT_SANS,
              }}
            >
              View Results
              <ArrowRight size={15} />
            </button>
          </div>
        </main>
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
      <span style={{ width: 12, height: 1, background: C.accent, display: "inline-block" }} />
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 13.5 }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.text3 }}>{label}</span>
      <span style={{ color: C.text1, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function VoiceStat({ label, value, ok, icon: Icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: C.panelHi,
          border: `1px solid ${C.borderHi}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={15} color={ok ? C.accent : C.text2} />
      </div>
      <div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.text3, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: ok ? C.accent : C.text1 }}>
          {value}
          {ok && " \u2713"}
        </div>
      </div>
    </div>
  );
}
