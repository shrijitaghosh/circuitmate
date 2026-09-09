import React, { useState, useRef, useCallback, useEffect } from "react";

const TICKS = 36;

/* =========================================================================
   Mock API — simulates network calls with the same shape a real backend
   response would have. When the real backend is ready, replace the bodies
   of these functions with real fetch(...) calls that resolve to the same
   shape, and the rest of this component does not need to change.
   ========================================================================= */

const MockAPI = {
  async recognizeSpeech(onPartial) {
    await wait(650);
    onPartial("GPIO 13");
    await wait(900);
    onPartial("GPIO 13… wait, GPIO 12.");
    await wait(500);
    return "GPIO 13… wait, GPIO 12.";
  },

  async detectCorrection() {
    await wait(1100);
    return {
      originalValue: "GPIO 13",
      correctedValue: "GPIO 12",
      confidence: 0.94,
      assistantReply: "Got it. I'll verify GPIO 12 instead.",
      currentStepDetail: "Verify GPIO configuration",
    };
  },
};

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

const STATE_COPY = {
  idle: { title: "Tap to speak", sub: "Ready" },
  listening: { title: "Listening…", sub: "Listening for input" },
  processing: { title: "Processing…", sub: "Analyzing speech…" },
  speaking: { title: "Assistant speaking…", sub: "Responding" },
};

export default function CircuitMateDashboard() {
  const [voiceState, setVoiceStateRaw] = useState("idle");
  const [subText, setSubText] = useState(STATE_COPY.idle.sub);
  const [tickMode, setTickMode] = useState("off"); // off | listen | speak
  const [activeTicks, setActiveTicks] = useState(() => new Array(TICKS).fill(null));

  const [userText, setUserText] = useState("GPIO 13");
  const [userCorrectionSuffix, setUserCorrectionSuffix] = useState("");
  const [userTs, setUserTs] = useState("09:42:11");
  const [assistantPending, setAssistantPending] = useState(true);
  const [assistantText, setAssistantText] = useState("Got it. I'll verify GPIO 12 instead.");
  const [assistantTs, setAssistantTs] = useState("—");

  const [currentGpio, setCurrentGpio] = useState("GPIO 13");
  const [problemBadgeText, setProblemBadgeText] = useState("Diagnosing");
  const [latency, setLatency] = useState("420 ms");
  const [correctionFlash, setCorrectionFlash] = useState(false);
  const [iconSpin, setIconSpin] = useState(false);

  const tickIntervalRef = useRef(null);
  const stateRef = useRef("idle");

  const setVoiceState = useCallback((next, sub) => {
    stateRef.current = next;
    setVoiceStateRaw(next);
    setSubText(sub || STATE_COPY[next].sub);
    setTickMode(next === "listening" ? "listen" : next === "speaking" ? "speak" : "off");
  }, []);

  // drive the tick-ring animation based on tickMode
  useEffect(() => {
    clearInterval(tickIntervalRef.current);
    if (tickMode === "off") {
      setActiveTicks(new Array(TICKS).fill(null));
      return;
    }
    const cls = tickMode === "listen" ? "listen" : "speak";
    tickIntervalRef.current = setInterval(() => {
      setActiveTicks(
        new Array(TICKS).fill(null).map(() => (Math.random() > 0.7 ? cls : null))
      );
    }, 150);
    return () => clearInterval(tickIntervalRef.current);
  }, [tickMode]);

  useEffect(() => () => clearInterval(tickIntervalRef.current), []);

  const runVoiceCycle = useCallback(async () => {
    if (stateRef.current !== "idle") return;

    setUserText("");
    setUserCorrectionSuffix("");
    setUserTs(nowTime());
    setAssistantPending(true);
    setAssistantTs("—");

    setVoiceState("listening");
    await MockAPI.recognizeSpeech((partial) => {
      if (partial.includes("wait")) {
        setUserText("GPIO 13");
        setUserCorrectionSuffix("… wait, GPIO 12.");
      } else {
        setUserText(partial);
        setUserCorrectionSuffix("");
      }
    });

    setVoiceState("processing");
    const result = await MockAPI.detectCorrection();

    setCurrentGpio(result.correctedValue);
    setProblemBadgeText("Correction applied");
    setCorrectionFlash(false);
    // restart the flash animation
    requestAnimationFrame(() => setCorrectionFlash(true));
    setIconSpin(true);
    setTimeout(() => setIconSpin(false), 900);

    setLatency(380 + Math.round(Math.random() * 80) + " ms");

    setVoiceState("speaking");
    setAssistantPending(false);
    setAssistantText(result.assistantReply);
    setAssistantTs(nowTime());

    await wait(2200);
    setVoiceState("idle", "Ready");
    setProblemBadgeText("Diagnosing");
  }, [setVoiceState]);

  const copy = STATE_COPY[voiceState];

  return (
    <div className="cmd-root">
      <style>{`
        .cmd-root{
          --bg: #090d0b;
          --bg-alt: #0d1310;
          --panel: #0f1613;
          --panel-hi: #131c17;
          --border: rgba(140, 214, 178, 0.14);
          --border-hi: rgba(140, 214, 178, 0.30);
          --text-1: #e8f2ec;
          --text-2: #9fb3aa;
          --text-3: #647169;
          --accent: #5eebae;
          --accent-soft: rgba(94, 235, 174, 0.14);
          --accent-glow: rgba(94, 235, 174, 0.5);
          --copper: #d99a5b;
          --copper-soft: rgba(217, 154, 91, 0.14);
          --copper-glow: rgba(217, 154, 91, 0.5);
          --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --font-mono: 'IBM Plex Mono', 'SF Mono', monospace;

          background: var(--bg);
          color: var(--text-1);
          font-family: var(--font-sans);
          line-height: 1.5;
          position: relative;
          min-height: 100vh;
        }
        .cmd-root *{ box-sizing: border-box; }

        .cmd-root::before{
          content:"";
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.10;
          pointer-events: none;
          z-index: 0;
        }

        .cmd-root button{ font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }

        .cmd-tick{ width: 12px; height: 1px; background: var(--accent); display: inline-block; }

        .cmd-dot{
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px 1px var(--accent-glow);
          flex-shrink: 0; display: inline-block;
        }
        .cmd-dot.cmd-pulse{ animation: cmd-dotpulse 2.2s ease-in-out infinite; }
        @keyframes cmd-dotpulse{
          0%, 100%{ opacity: 1; }
          50%{ opacity: 0.5; }
        }

        /* TOP BAR */
        .cmd-topbar{
          position: sticky; top: 0; z-index: 50;
          background: rgba(9,13,11,0.82);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }
        .cmd-topbar-inner{
          max-width: 1400px; margin: 0 auto;
          padding: 15px 36px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
        }
        .cmd-brand{ display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 15.5px; }
        .cmd-brand svg{ width: 26px; height: 26px; flex-shrink: 0; }

        .cmd-topbar-center{
          justify-self: center;
          font-family: var(--font-mono);
          font-size: 12.5px;
          letter-spacing: 0.06em;
          color: var(--text-2);
          text-transform: uppercase;
        }

        .cmd-topbar-right{ justify-self: end; display: flex; align-items: center; gap: 14px; }

        .cmd-session-tag{ font-family: var(--font-mono); font-size: 12px; color: var(--text-3); }

        .cmd-status-pill{
          display: flex; align-items: center; gap: 8px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-2);
          padding: 6px 12px;
          border: 1px solid var(--border);
          border-radius: 100px;
          background: var(--panel);
          white-space: nowrap;
        }

        /* LAYOUT */
        .cmd-dashboard{
          max-width: 1400px;
          margin: 0 auto;
          padding: 26px 36px 0;
          position: relative;
          z-index: 1;
        }

        .cmd-grid{
          display: grid;
          grid-template-columns: 2fr 3fr;
          gap: 20px;
          align-items: start;
        }

        .cmd-col{ display: flex; flex-direction: column; gap: 18px; }

        /* CARD BASE */
        .cmd-card{
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px 24px;
        }

        .cmd-card-title{
          display: flex; align-items: center; gap: 9px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--text-3);
          margin-bottom: 18px;
        }

        .cmd-card-title-row{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .cmd-card-title-row .cmd-card-title{ margin-bottom: 0; }

        .cmd-live-tag{ display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-2); }

        .cmd-badge{
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--font-mono);
          font-size: 11.5px;
          padding: 5px 11px;
          border-radius: 100px;
          border: 1px solid var(--border-hi);
          white-space: nowrap;
        }
        .cmd-badge-green{ background: var(--accent-soft); color: var(--accent); border-color: rgba(94,235,174,0.35); }
        .cmd-badge-amber{ background: var(--copper-soft); color: var(--copper); border-color: rgba(217,154,91,0.35); }

        .cmd-kv-list{ display: flex; flex-direction: column; gap: 10px; }
        .cmd-kv{ display: flex; align-items: baseline; justify-content: space-between; font-size: 13.5px; }
        .cmd-kv span:first-child{ color: var(--text-3); font-family: var(--font-mono); font-size: 12px; }
        .cmd-kv span:last-child{ color: var(--text-1); font-weight: 500; }

        /* DEVICE CARD */
        .cmd-device-head{ display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .cmd-chip-icon{
          width: 44px; height: 44px; border-radius: 10px;
          background: var(--panel-hi);
          border: 1px solid var(--border-hi);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .cmd-chip-icon svg{ width: 22px; height: 22px; stroke: var(--accent); }
        .cmd-device-name{ font-size: 16px; font-weight: 600; margin-bottom: 6px; }

        /* PROBLEM CARD */
        .cmd-problem-row{ display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .cmd-problem-text{ font-size: 19px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
        .cmd-problem-desc{ font-size: 13.5px; color: var(--text-2); line-height: 1.6; margin: 0; }

        /* STEPS */
        .cmd-steps{ list-style: none; display: flex; flex-direction: column; margin-bottom: 18px; padding: 0; }
        .cmd-step{
          position: relative;
          display: flex; align-items: center; gap: 12px;
          padding: 9px 0;
          font-size: 13.5px;
          color: var(--text-3);
        }
        .cmd-step-node{
          width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
          border: 1px solid var(--border-hi);
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-alt);
          z-index: 1;
        }
        .cmd-step::before{
          content: "";
          position: absolute;
          left: 9px; top: -50%;
          width: 1px; height: 100%;
          background: var(--border-hi);
          z-index: 0;
        }
        .cmd-step.cmd-first::before{ display: none; }

        .cmd-step.cmd-done{ color: var(--text-2); }
        .cmd-step.cmd-done .cmd-step-node{ background: var(--accent-soft); border-color: var(--accent); }
        .cmd-step.cmd-done .cmd-step-node svg{ width: 11px; height: 11px; stroke: var(--accent); }

        .cmd-step.cmd-current{ color: var(--text-1); font-weight: 500; }
        .cmd-step.cmd-current .cmd-step-node{
          background: var(--accent);
          border-color: var(--accent);
          box-shadow: 0 0 0 4px var(--accent-soft);
        }
        .cmd-inner-dot{ width: 6px; height: 6px; border-radius: 50%; background: #06110c; }

        .cmd-current-step-box{
          background: var(--bg-alt);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
        }
        .cmd-csb-label{ font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); margin-bottom: 6px; }
        .cmd-csb-text{ font-size: 14px; font-weight: 500; }
        .cmd-gpio-tag{ font-family: var(--font-mono); color: var(--accent); }

        /* DETAILS GRID */
        .cmd-details-grid{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }

        /* CONVERSATION */
        .cmd-transcript{ display: flex; flex-direction: column; gap: 14px; }
        .cmd-msg{
          border-radius: 12px;
          padding: 13px 16px;
          border: 1px solid var(--border);
          background: var(--bg-alt);
        }
        .cmd-msg-user{ border-color: var(--border-hi); }
        .cmd-msg-assistant{ background: var(--panel-hi); }
        .cmd-msg-meta{
          display: flex; align-items: center; justify-content: space-between;
          font-family: var(--font-mono); font-size: 10.5px;
          color: var(--text-3); margin-bottom: 7px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .cmd-msg-text{ font-size: 14.5px; color: var(--text-1); line-height: 1.55; }
        .cmd-correction-inline{ color: var(--copper); font-weight: 500; }
        .cmd-msg.cmd-pending{ opacity: 0.4; }

        /* CORRECTION CARD */
        .cmd-correction-card{
          position: relative;
          background: linear-gradient(180deg, rgba(217,154,91,0.08), var(--panel) 60%);
          border: 1px solid rgba(217,154,91,0.4);
          border-radius: 16px;
          padding: 26px 26px 24px;
          box-shadow: 0 0 0 1px rgba(217,154,91,0.08), 0 24px 60px -24px rgba(217,154,91,0.35);
          overflow: hidden;
        }
        .cmd-correction-card::before{
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--copper), transparent);
        }
        .cmd-correction-card.cmd-flash{ animation: cmd-correctionFlash 900ms ease; }
        @keyframes cmd-correctionFlash{
          0%{ box-shadow: 0 0 0 1px rgba(217,154,91,0.08), 0 0 0 0 rgba(217,154,91,0.6); }
          30%{ box-shadow: 0 0 0 1px rgba(217,154,91,0.5), 0 0 40px 4px rgba(217,154,91,0.45); }
          100%{ box-shadow: 0 0 0 1px rgba(217,154,91,0.08), 0 24px 60px -24px rgba(217,154,91,0.35); }
        }

        .cmd-correction-top{ display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
        .cmd-correction-icon{
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          background: var(--copper-soft);
          border: 1px solid rgba(217,154,91,0.4);
          display: flex; align-items: center; justify-content: center;
        }
        .cmd-correction-icon svg{ width: 19px; height: 19px; stroke: var(--copper); }
        .cmd-correction-icon svg.cmd-spin{ animation: cmd-spin 900ms linear; }
        @keyframes cmd-spin{ to{ transform: rotate(180deg); } }

        .cmd-correction-heading{ flex: 1; }
        .cmd-correction-title{ font-size: 15.5px; font-weight: 600; margin-bottom: 3px; }
        .cmd-correction-sub{ font-size: 12.5px; color: var(--text-2); }

        .cmd-correction-transition{
          display: flex; align-items: center; gap: 16px;
          font-family: var(--font-mono);
          margin-bottom: 22px;
          padding: 18px 20px;
          background: var(--bg-alt);
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        .cmd-value-old{ font-size: 20px; color: var(--text-3); text-decoration: line-through; text-decoration-color: rgba(159,179,170,0.5); }
        .cmd-value-new{ font-size: 22px; color: var(--copper); font-weight: 600; }
        .cmd-correction-transition svg{ width: 18px; height: 18px; stroke: var(--text-3); flex-shrink: 0; }

        .cmd-correction-detail-grid{
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 18px;
        }
        .cmd-cd-label{ font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); margin-bottom: 8px; }
        .cmd-cd-value{ font-family: var(--font-mono); font-size: 15px; font-weight: 600; }
        .cmd-cd-value.cmd-strike{ color: var(--text-3); text-decoration: line-through; }
        .cmd-cd-value.cmd-accent{ color: var(--copper); }

        .cmd-confidence-bar{
          width: 100%; height: 6px; border-radius: 4px;
          background: rgba(140,214,178,0.08);
          overflow: hidden; margin-bottom: 6px;
        }
        .cmd-confidence-fill{
          height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, var(--copper), #ecc088);
          transition: width 900ms ease;
        }
        .cmd-confidence-num{ font-family: var(--font-mono); font-size: 12.5px; color: var(--text-2); }

        .cmd-correction-explain{
          font-size: 12.5px; color: var(--text-2); line-height: 1.6;
          border-top: 1px solid var(--border);
          padding-top: 16px;
          margin: 0;
        }

        /* VOICE CONTROL PANEL */
        .cmd-voice-panel{
          margin-top: 22px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 40px 30px 34px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .cmd-vp-mic-wrap{
          position: relative;
          width: 190px; height: 190px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
        }

        .cmd-vp-ring{ position: absolute; border-radius: 50%; border: 1px solid var(--border); transition: border-color 0.3s ease; }
        .cmd-vp-ring--outer{ width: 190px; height: 190px; }
        .cmd-vp-ring--mid{ width: 148px; height: 148px; border-color: var(--border-hi); }

        .cmd-vp-tickring{ position: absolute; width: 190px; height: 190px; }
        .cmd-vp-tickring .cmd-t{
          position: absolute; width: 2px; height: 7px;
          background: var(--text-3);
          left: 50%; top: 0;
          transform-origin: 1px 95px;
          border-radius: 1px;
          transition: background 0.35s ease, height 0.35s ease;
        }
        .cmd-vp-tickring .cmd-t.cmd-active-listen{ background: var(--accent); height: 12px; box-shadow: 0 0 6px var(--accent-glow); }
        .cmd-vp-tickring .cmd-t.cmd-active-speak{ background: var(--copper); height: 12px; box-shadow: 0 0 6px var(--copper-glow); }

        .cmd-vp-mic{
          position: relative; z-index: 2;
          width: 92px; height: 92px; border-radius: 50%;
          background: linear-gradient(180deg, var(--panel-hi), var(--panel));
          border: 1px solid var(--border-hi);
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .cmd-vp-mic svg{ width: 30px; height: 30px; stroke: var(--text-1); transition: stroke 0.3s ease; }

        .cmd-voice-panel.cmd-state-listening .cmd-vp-mic{ border-color: var(--accent); box-shadow: 0 0 0 1px rgba(94,235,174,0.5), 0 0 34px -4px var(--accent-glow); }
        .cmd-voice-panel.cmd-state-listening .cmd-vp-mic svg{ stroke: var(--accent); }
        .cmd-voice-panel.cmd-state-listening .cmd-vp-ring--outer{ animation: cmd-breathe 1.6s ease-in-out infinite; }

        .cmd-voice-panel.cmd-state-speaking .cmd-vp-mic{ border-color: var(--copper); box-shadow: 0 0 0 1px rgba(217,154,91,0.5), 0 0 34px -4px var(--copper-glow); }
        .cmd-voice-panel.cmd-state-speaking .cmd-vp-mic svg{ stroke: var(--copper); }
        .cmd-voice-panel.cmd-state-speaking .cmd-vp-ring--outer{ animation: cmd-breathe 1.1s ease-in-out infinite; }

        .cmd-voice-panel.cmd-state-processing .cmd-vp-mic{ border-color: var(--text-2); }
        .cmd-voice-panel.cmd-state-processing .cmd-vp-spinner{ opacity: 1; }

        @keyframes cmd-breathe{
          0%, 100%{ transform: scale(0.97); opacity: 0.7; }
          50%{ transform: scale(1.05); opacity: 1; }
        }

        .cmd-vp-spinner{
          position: absolute; width: 108px; height: 108px; border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: var(--text-2);
          border-right-color: var(--text-2);
          opacity: 0; z-index: 2;
          animation: cmd-rotate 900ms linear infinite;
          transition: opacity 0.2s ease;
        }
        @keyframes cmd-rotate{ to{ transform: rotate(360deg); } }

        .cmd-vp-status{ text-align: center; margin-bottom: 22px; }
        .cmd-vp-state-text{ font-size: 16px; font-weight: 600; margin-bottom: 5px; }
        .cmd-vp-sub-text{ font-family: var(--font-mono); font-size: 12px; color: var(--text-3); }

        .cmd-vp-bars{ display: flex; align-items: flex-end; gap: 4px; height: 26px; }
        .cmd-vp-bars i{
          width: 3px; border-radius: 2px;
          background: var(--text-3);
          height: 30%;
          transition: background 0.3s ease;
          display: block;
        }
        .cmd-voice-panel.cmd-state-listening .cmd-vp-bars i{ background: var(--accent); animation: cmd-barwave 1s ease-in-out infinite; }
        .cmd-voice-panel.cmd-state-speaking .cmd-vp-bars i{ background: var(--copper); animation: cmd-barwave 0.7s ease-in-out infinite; }
        .cmd-vp-bars i:nth-child(1){ animation-delay: 0s; }
        .cmd-vp-bars i:nth-child(2){ animation-delay: 0.1s; }
        .cmd-vp-bars i:nth-child(3){ animation-delay: 0.2s; }
        .cmd-vp-bars i:nth-child(4){ animation-delay: 0.3s; }
        .cmd-vp-bars i:nth-child(5){ animation-delay: 0.4s; }
        .cmd-vp-bars i:nth-child(6){ animation-delay: 0.3s; }
        .cmd-vp-bars i:nth-child(7){ animation-delay: 0.2s; }
        .cmd-vp-bars i:nth-child(8){ animation-delay: 0.1s; }
        @keyframes cmd-barwave{
          0%, 100%{ height: 30%; }
          50%{ height: 100%; }
        }

        /* STATUS BAR */
        .cmd-statusbar{
          margin-top: 22px;
          border-top: 1px solid var(--border);
          background: var(--bg-alt);
        }
        .cmd-statusbar-inner{
          max-width: 1400px; margin: 0 auto;
          padding: 14px 36px;
          display: flex; flex-wrap: wrap;
          gap: 30px;
        }
        .cmd-sb-item{ display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; }
        .cmd-sb-label{ color: var(--text-3); }
        .cmd-sb-value{ color: var(--text-2); }
        .cmd-sb-value.cmd-ok{ color: var(--accent); }

        /* RESPONSIVE */
        @media (max-width: 1080px){
          .cmd-grid{ grid-template-columns: 1fr; }
          .cmd-topbar-center{ display: none; }
          .cmd-details-grid{ grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 640px){
          .cmd-dashboard{ padding: 20px 18px 0; }
          .cmd-topbar-inner{ padding: 14px 18px; grid-template-columns: 1fr auto; }
          .cmd-session-tag{ display: none; }
          .cmd-correction-detail-grid{ grid-template-columns: 1fr; gap: 14px; }
          .cmd-correction-transition{ flex-wrap: wrap; }
          .cmd-statusbar-inner{ padding: 14px 18px; gap: 16px 24px; }
        }

        @media (prefers-reduced-motion: reduce){
          .cmd-root *{ animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition: none !important; }
        }
      `}</style>

      <header className="cmd-topbar">
        <div className="cmd-topbar-inner">
          <div className="cmd-brand">
            <svg viewBox="0 0 32 32" fill="none">
              <rect x="1" y="1" width="30" height="30" rx="7" stroke="#5eebae" strokeOpacity="0.5" strokeWidth="1"/>
              <circle cx="10" cy="10" r="2.2" fill="#5eebae"/>
              <circle cx="22" cy="22" r="2.2" fill="#5eebae" fillOpacity="0.5"/>
              <path d="M10 12.2V16.5C10 17.6 10.9 18.5 12 18.5H16.5" stroke="#5eebae" strokeWidth="1.4" fill="none"/>
              <path d="M16.5 18.5H20C21.1 18.5 22 17.6 22 16.5V19.8" stroke="#5eebae" strokeOpacity="0.5" strokeWidth="1.4" fill="none"/>
              <circle cx="16.5" cy="18.5" r="1.4" fill="#e8f2ec"/>
            </svg>
            <span>CircuitMate</span>
          </div>
          <div className="cmd-topbar-center">Voice Hardware Troubleshooter</div>
          <div className="cmd-topbar-right">
            <span className="cmd-session-tag">Session #CM-2048</span>
            <span className="cmd-status-pill"><span className="cmd-dot cmd-pulse"></span>Rime Active</span>
          </div>
        </div>
      </header>

      <main className="cmd-dashboard">
        <div className="cmd-grid">

          {/* LEFT COLUMN */}
          <div className="cmd-col">

            <div className="cmd-card">
              <div className="cmd-card-title"><span className="cmd-tick"></span>Device</div>
              <div className="cmd-device-head">
                <div className="cmd-chip-icon">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>
                </div>
                <div>
                  <div className="cmd-device-name">Arduino Uno</div>
                  <div className="cmd-badge cmd-badge-green"><span className="cmd-dot"></span>Connected</div>
                </div>
              </div>
              <div className="cmd-kv-list">
                <div className="cmd-kv"><span>Board</span><span>Arduino Uno</span></div>
                <div className="cmd-kv"><span>Port</span><span>COM3</span></div>
                <div className="cmd-kv"><span>Firmware</span><span>v1.8.19</span></div>
              </div>
            </div>

            <div className="cmd-card">
              <div className="cmd-card-title"><span className="cmd-tick"></span>Current Problem</div>
              <div className="cmd-problem-row">
                <div className="cmd-problem-text">LED is not responding</div>
                <div className="cmd-badge cmd-badge-amber">{problemBadgeText}</div>
              </div>
              <p className="cmd-problem-desc">User reports that the LED connected to a GPIO pin is not responding.</p>
            </div>

            <div className="cmd-card">
              <div className="cmd-card-title"><span className="cmd-tick"></span>Troubleshooting</div>
              <ol className="cmd-steps">
                <li className="cmd-step cmd-done cmd-first">
                  <span className="cmd-step-node"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>
                  Problem identified
                </li>
                <li className="cmd-step cmd-done">
                  <span className="cmd-step-node"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>
                  Pin configuration
                </li>
                <li className="cmd-step cmd-current">
                  <span className="cmd-step-node"><span className="cmd-inner-dot"></span></span>
                  Wiring verification
                </li>
                <li className="cmd-step"><span className="cmd-step-node"></span>Power verification</li>
                <li className="cmd-step"><span className="cmd-step-node"></span>Final test</li>
              </ol>
              <div className="cmd-current-step-box">
                <div className="cmd-csb-label">Current step</div>
                <div className="cmd-csb-text">Verify GPIO configuration — <span className="cmd-gpio-tag">{currentGpio}</span></div>
              </div>
            </div>

            <div className="cmd-card">
              <div className="cmd-card-title"><span className="cmd-tick"></span>Device Details</div>
              <div className="cmd-details-grid">
                <div className="cmd-kv"><span>Board</span><span>Arduino Uno</span></div>
                <div className="cmd-kv"><span>MCU</span><span>ATmega328P</span></div>
                <div className="cmd-kv"><span>Voltage</span><span>5V</span></div>
                <div className="cmd-kv"><span>GPIO</span><span>Digital pins</span></div>
                <div className="cmd-kv"><span>Connection</span><span>USB</span></div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="cmd-col">

            <div className="cmd-card">
              <div className="cmd-card-title-row">
                <div className="cmd-card-title"><span className="cmd-tick"></span>Voice Conversation</div>
                <div className="cmd-live-tag">
                  <span className={`cmd-dot${voiceState !== "idle" ? " cmd-pulse" : ""}`}></span>
                  <span>
                    {voiceState === "listening" ? "Listening for input"
                      : voiceState === "processing" ? "Analyzing speech"
                      : voiceState === "speaking" ? "Responding"
                      : "Idle"}
                  </span>
                </div>
              </div>
              <div className="cmd-transcript">
                <div className="cmd-msg cmd-msg-user">
                  <div className="cmd-msg-meta"><span>You</span><span>{userTs}</span></div>
                  <div className="cmd-msg-text">
                    {userText}
                    {userCorrectionSuffix && <span className="cmd-correction-inline">{userCorrectionSuffix}</span>}
                  </div>
                </div>
                <div className={`cmd-msg cmd-msg-assistant${assistantPending ? " cmd-pending" : ""}`}>
                  <div className="cmd-msg-meta"><span>CircuitMate</span><span>{assistantTs}</span></div>
                  <div className="cmd-msg-text">{assistantText}</div>
                </div>
              </div>
            </div>

            <div className={`cmd-correction-card${correctionFlash ? " cmd-flash" : ""}`}>
              <div className="cmd-correction-top">
                <div className="cmd-correction-icon">
                  <svg className={iconSpin ? "cmd-spin" : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 12a9 9 0 0115.5-6.3L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 01-15.5 6.3L3 16M3 21v-5h5"/></svg>
                </div>
                <div className="cmd-correction-heading">
                  <div className="cmd-correction-title">Correction detected</div>
                  <div className="cmd-correction-sub">Self-correction identified mid-sentence</div>
                </div>
                <div className="cmd-badge cmd-badge-green">Correction accepted</div>
              </div>

              <div className="cmd-correction-transition">
                <span className="cmd-value-old">GPIO 13</span>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                <span className="cmd-value-new">GPIO 12</span>
              </div>

              <div className="cmd-correction-detail-grid">
                <div>
                  <div className="cmd-cd-label">Original value</div>
                  <div className="cmd-cd-value cmd-strike">GPIO 13</div>
                </div>
                <div>
                  <div className="cmd-cd-label">Corrected value</div>
                  <div className="cmd-cd-value cmd-accent">GPIO 12</div>
                </div>
                <div>
                  <div className="cmd-cd-label">Confidence</div>
                  <div className="cmd-confidence-bar"><div className="cmd-confidence-fill" style={{ width: "94%" }}></div></div>
                  <div className="cmd-confidence-num">94%</div>
                </div>
              </div>

              <p className="cmd-correction-explain">CircuitMate detected a self-correction in the user's speech and updated the active GPIO value.</p>
            </div>

          </div>

        </div>

        {/* VOICE CONTROL PANEL */}
        <section className={`cmd-voice-panel cmd-state-${voiceState}`}>
          <div className="cmd-vp-mic-wrap">
            <div className="cmd-vp-ring cmd-vp-ring--outer"></div>
            <div className="cmd-vp-ring cmd-vp-ring--mid"></div>
            <div className="cmd-vp-tickring">
              {activeTicks.map((mode, i) => (
                <div
                  key={i}
                  className={`cmd-t${mode === "listen" ? " cmd-active-listen" : mode === "speak" ? " cmd-active-speak" : ""}`}
                  style={{ transform: `rotate(${(360 / TICKS) * i}deg)` }}
                />
              ))}
            </div>
            <div className="cmd-vp-spinner"></div>
            <button className="cmd-vp-mic" aria-label="Toggle voice input" onClick={runVoiceCycle}>
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 11a7 7 0 0014 0"/>
                <path d="M12 18v4M9 22h6"/>
              </svg>
            </button>
          </div>
          <div className="cmd-vp-status">
            <div className="cmd-vp-state-text">{copy.title}</div>
            <div className="cmd-vp-sub-text">{subText}</div>
          </div>
          <div className="cmd-vp-bars">
            <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
        </section>
      </main>

      <footer className="cmd-statusbar">
        <div className="cmd-statusbar-inner">
          <div className="cmd-sb-item"><span className="cmd-sb-label">Voice Engine</span><span className="cmd-sb-value cmd-ok">Rime Active ✓</span></div>
          <div className="cmd-sb-item"><span className="cmd-sb-label">Speech Recognition</span><span className="cmd-sb-value cmd-ok">Connected ✓</span></div>
          <div className="cmd-sb-item"><span className="cmd-sb-label">Backend</span><span className="cmd-sb-value">Mock Mode</span></div>
          <div className="cmd-sb-item"><span className="cmd-sb-label">Latency</span><span className="cmd-sb-value">{latency}</span></div>
        </div>
      </footer>
    </div>
  );
}
