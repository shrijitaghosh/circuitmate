import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createSession, getHealth, sessionWebSocketPath, createPcmMicrophone, playBase64Audio } from "./backend.jsx";


const TICK_COUNT = 40;

export default function CircuitMateLanding() {
  const [listening, setListening] = useState(false);
  const [activeTicks, setActiveTicks] = useState(() => new Array(TICK_COUNT).fill(false));
  const tickIntervalRef = useRef(null);
  const listenTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const microphoneRef = useRef(null);
  const audioRef = useRef(null);
  const sessionRef = useRef(null);
  const [connection, setConnection] = useState("Connecting…");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [facts, setFacts] = useState({});
  const [error, setError] = useState("");

  const startListening = useCallback(async () => {
    try {
      setError("");
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) throw new Error("Backend WebSocket is not ready");
      setListening(true);
      setTranscript("");
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = setInterval(() => setActiveTicks(() => new Array(TICK_COUNT).fill(false).map(() => Math.random() > 0.72)), 160);
      socketRef.current.send(JSON.stringify({ type: "turn.start", turnId: crypto.randomUUID() }));
      microphoneRef.current = await createPcmMicrophone((chunk) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(chunk);
      });
    } catch (err) {
      setListening(false); setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!listening) return;
    await microphoneRef.current?.stop(); microphoneRef.current = null;
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "turn.commit" }));
    setListening(false);
  }, [listening]);

  const interrupt = useCallback(async () => {
    await microphoneRef.current?.stop(); microphoneRef.current = null;
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "interrupt", reason: "user" }));
    audioRef.current?.pause(); audioRef.current = null; setListening(false);
  }, []);

  useEffect(() => {
    if (!listening) {
      clearInterval(tickIntervalRef.current);
      setActiveTicks(new Array(TICK_COUNT).fill(false));
    }
  }, [listening]);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const health = await getHealth();
        if (disposed) return;
        setConnection(health.ok ? "Backend connected" : "Backend unavailable");
        const session = await createSession(); sessionRef.current = session;
        const socket = new WebSocket(sessionWebSocketPath(session)); socketRef.current = socket;
        socket.onopen = () => setConnection("Ready");
        socket.onerror = () => { setConnection("Backend error"); setError("Could not connect to the backend WebSocket"); };
        socket.onclose = () => setConnection("Disconnected");
        socket.onmessage = event => {
          const message = JSON.parse(event.data);
          if (message.type === "transcript.partial" || message.type === "transcript.final") setTranscript(message.text || message.normalizedText || "");
          if (message.type === "assistant.delta") setResponse(message.text || "");
          if (message.type === "facts.updated") setFacts(message.facts || {});
          if (message.type === "tts.audio") audioRef.current = playBase64Audio(message.audioBase64, message.contentType);
          if (message.type === "error") setError(message.message || "Backend error");
        };
      } catch (err) { if (!disposed) { setConnection("Backend unavailable"); setError(err instanceof Error ? err.message : String(err)); } }
    })();
    return () => { disposed = true; void microphoneRef.current?.stop(); socketRef.current?.close(); audioRef.current?.pause(); };
  }, []);

  return (
    <div className="cm-root">
      <style>{`
        .cm-root{
          --bg: #090d0b;
          --bg-alt: #0d1310;
          --panel: #0f1613;
          --panel-hi: #121a16;
          --border: rgba(140, 214, 178, 0.14);
          --border-hi: rgba(140, 214, 178, 0.30);
          --text-1: #e8f2ec;
          --text-2: #9fb3aa;
          --text-3: #647169;
          --accent: #5eebae;
          --accent-soft: rgba(94, 235, 174, 0.14);
          --accent-glow: rgba(94, 235, 174, 0.55);
          --copper: #d99a5b;
          --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --font-mono: 'IBM Plex Mono', 'SF Mono', monospace;

          background: var(--bg);
          color: var(--text-1);
          font-family: var(--font-sans);
          line-height: 1.5;
          overflow-x: hidden;
          position: relative;
          min-height: 100vh;
        }

        .cm-root *{ box-sizing: border-box; }

        .cm-root::before{
          content:"";
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 64px 64px;
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, black 0%, transparent 75%);
          mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, black 0%, transparent 75%);
        }

        .cm-root a{ color: inherit; text-decoration: none; }
        .cm-root button{ font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }

        .cm-wrap{
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 40px;
          position: relative;
          z-index: 1;
        }

        /* NAV */
        .cm-nav{
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(14px);
          background: rgba(9, 13, 11, 0.72);
          border-bottom: 1px solid var(--border);
        }

        .cm-nav-inner{
          max-width: 1180px;
          margin: 0 auto;
          padding: 18px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .cm-brand{
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 16.5px;
          letter-spacing: 0.01em;
        }

        .cm-brand-mark{ width: 30px; height: 30px; flex-shrink: 0; }

        .cm-nav-links{
          display: flex;
          align-items: center;
          gap: 36px;
          font-size: 14px;
          color: var(--text-2);
        }

        .cm-nav-links a{
          position: relative;
          padding: 4px 0;
          transition: color 0.15s ease;
        }
        .cm-nav-links a:hover{ color: var(--text-1); }
        .cm-nav-links a::after{
          content:"";
          position:absolute;
          left:0; right:0; bottom:-2px;
          height:1px;
          background: var(--accent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.2s ease;
        }
        .cm-nav-links a:hover::after{ transform: scaleX(1); }

        .cm-status-pill{
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 12.5px;
          color: var(--text-2);
          padding: 7px 13px;
          border: 1px solid var(--border);
          border-radius: 100px;
          background: var(--panel);
          white-space: nowrap;
        }

        .cm-dot{
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px 1px var(--accent-glow);
          flex-shrink: 0;
        }
        .cm-dot.cm-pulse{ animation: cm-dotpulse 2.2s ease-in-out infinite; }

        @keyframes cm-dotpulse{
          0%, 100%{ opacity: 1; box-shadow: 0 0 8px 1px var(--accent-glow); }
          50%{ opacity: 0.55; box-shadow: 0 0 3px 0px var(--accent-glow); }
        }

        /* HERO */
        .cm-hero{ padding: 96px 0 84px; position: relative; }

        .cm-hero-grid{
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 56px;
          align-items: center;
        }

        .cm-eyebrow-line{
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-mono);
          font-size: 12.5px;
          color: var(--accent);
          margin-bottom: 22px;
        }
        .cm-eyebrow-line .cm-tick-mark{ width: 18px; height: 1px; background: var(--accent); }

        .cm-root h1{
          font-size: 52px;
          font-weight: 600;
          line-height: 1.1;
          letter-spacing: -0.015em;
          max-width: 620px;
          color: var(--text-1);
          margin: 0;
        }

        .cm-sub{
          margin-top: 22px;
          font-size: 17px;
          color: var(--text-2);
          max-width: 480px;
          line-height: 1.6;
        }

        .cm-cta-row{
          margin-top: 36px;
          display: flex;
          align-items: center;
          gap: 22px;
          flex-wrap: wrap;
        }

        .cm-btn-primary{
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--accent);
          color: #06110c;
          font-weight: 600;
          font-size: 15px;
          padding: 14px 26px;
          border-radius: 10px;
          box-shadow: 0 0 0 1px rgba(94,235,174,0.4), 0 8px 28px -8px var(--accent-glow);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cm-btn-primary:hover{
          transform: translateY(-1px);
          box-shadow: 0 0 0 1px rgba(94,235,174,0.55), 0 10px 32px -6px var(--accent-glow);
        }
        .cm-btn-primary:active{ transform: translateY(0); }

        .cm-meta-line{
          margin-top: 26px;
          font-family: var(--font-mono);
          font-size: 12.5px;
          color: var(--text-3);
          letter-spacing: 0.01em;
        }

        /* MIC VISUAL */
        .cm-mic-stage{
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 20px 0;
        }

        .cm-mic-field{
          position: relative;
          width: 340px;
          height: 340px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cm-ring{ position: absolute; border-radius: 50%; border: 1px solid var(--border); }
        .cm-ring--outer{ width: 340px; height: 340px; }
        .cm-ring--mid{ width: 270px; height: 270px; border-color: var(--border-hi); }

        .cm-ring-glow{
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
          animation: cm-breathe 3.4s ease-in-out infinite;
        }
        @keyframes cm-breathe{
          0%, 100%{ transform: scale(0.94); opacity: 0.7; }
          50%{ transform: scale(1.04); opacity: 1; }
        }

        .cm-tick-ring{ position: absolute; width: 340px; height: 340px; }
        .cm-tick-ring .cm-t{
          position: absolute;
          width: 2px;
          height: 8px;
          background: var(--text-3);
          left: 50%;
          top: 0;
          transform-origin: 1px 170px;
          border-radius: 1px;
          transition: background 0.4s ease, height 0.4s ease;
        }
        .cm-tick-ring .cm-t.cm-active{ background: var(--accent); height: 13px; box-shadow: 0 0 6px var(--accent-glow); }

        .cm-mic-core{
          position: relative;
          width: 168px;
          height: 168px;
          border-radius: 50%;
          background: linear-gradient(180deg, var(--panel-hi), var(--panel));
          border: 1px solid var(--border-hi);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03), 0 20px 50px -15px rgba(0,0,0,0.7);
          z-index: 2;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .cm-mic-core.cm-listening{
          border-color: var(--accent);
          box-shadow: 0 0 0 1px rgba(94,235,174,0.5), 0 0 40px -4px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .cm-mic-core svg{ width: 52px; height: 52px; }

        .cm-mic-label{
          margin-top: 26px;
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-2);
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .cm-mic-hint{ margin-top: 6px; font-size: 12px; color: var(--text-3); }

        /* FEATURES */
        .cm-section{ padding: 60px 0; }

        .cm-section-head{
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 32px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 20px;
        }

        .cm-section-head h2{ font-size: 22px; font-weight: 600; margin: 0; }
        .cm-section-head span{ font-family: var(--font-mono); font-size: 12px; color: var(--text-3); }

        .cm-cards{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

        .cm-card{
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 28px 26px;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .cm-card:hover{ border-color: var(--border-hi); transform: translateY(-2px); }

        .cm-card-icon{
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--accent-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .cm-card-icon svg{ width: 20px; height: 20px; stroke: var(--accent); }

        .cm-card h3{ font-size: 16px; font-weight: 600; margin-bottom: 8px; margin-top: 0; }
        .cm-card p{ font-size: 14px; color: var(--text-2); line-height: 1.55; margin: 0; }

        /* STATUS PANEL */
        .cm-status-panel{
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 26px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }

        .cm-status-panel-left{ display: flex; align-items: center; gap: 18px; }

        .cm-status-icon{
          width: 46px;
          height: 46px;
          border-radius: 10px;
          border: 1px solid var(--border-hi);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--panel-hi);
          flex-shrink: 0;
        }
        .cm-status-icon svg{ width: 22px; height: 22px; stroke: var(--accent); }

        .cm-status-label{ font-family: var(--font-mono); font-size: 11.5px; color: var(--text-3); margin-bottom: 5px; }

        .cm-status-value{ display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; }

        .cm-status-sub{ font-family: var(--font-mono); font-size: 12.5px; color: var(--text-2); text-align: right; }

        .cm-bars{ display: flex; align-items: flex-end; gap: 3px; height: 20px; }
        .cm-bars i{
          width: 3px;
          background: var(--accent);
          border-radius: 2px;
          opacity: 0.85;
          animation: cm-barwave 1.4s ease-in-out infinite;
          display: block;
        }
        .cm-bars i:nth-child(1){ height: 40%; animation-delay: 0s; }
        .cm-bars i:nth-child(2){ height: 90%; animation-delay: 0.15s; }
        .cm-bars i:nth-child(3){ height: 60%; animation-delay: 0.3s; }
        .cm-bars i:nth-child(4){ height: 100%; animation-delay: 0.45s; }
        .cm-bars i:nth-child(5){ height: 50%; animation-delay: 0.6s; }
        @keyframes cm-barwave{
          0%, 100%{ transform: scaleY(0.6); }
          50%{ transform: scaleY(1); }
        }

        /* FOOTER */
        .cm-footer{ border-top: 1px solid var(--border); padding: 28px 0 40px; }

        .cm-footer-inner{
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .cm-footer-text{ font-family: var(--font-mono); font-size: 12px; color: var(--text-3); }

        /* RESPONSIVE */
        @media (max-width: 980px){
          .cm-wrap{ padding: 0 28px; }
          .cm-nav-inner{ padding: 16px 28px; }
          .cm-nav-links{ display: none; }
          .cm-hero-grid{ grid-template-columns: 1fr; gap: 60px; }
          .cm-hero{ padding: 56px 0 60px; text-align: left; }
          .cm-root h1{ font-size: 40px; max-width: none; }
          .cm-sub{ max-width: none; }
          .cm-mic-stage{ order: -1; }
          .cm-cards{ grid-template-columns: 1fr; }
          .cm-status-panel{ flex-direction: column; align-items: flex-start; }
          .cm-status-sub{ text-align: left; }
        }

        @media (max-width: 520px){
          .cm-wrap{ padding: 0 20px; }
          .cm-nav-inner{ padding: 14px 20px; }
          .cm-root h1{ font-size: 32px; }
          .cm-mic-field, .cm-ring--outer, .cm-ring-glow, .cm-tick-ring{ width: 260px; height: 260px; }
          .cm-ring--mid{ width: 200px; height: 200px; }
          .cm-mic-core{ width: 130px; height: 130px; }
          .cm-tick-ring .cm-t{ transform-origin: 1px 130px; }
          .cm-status-pill .cm-pill-text{ display: none; }
        }

        @media (prefers-reduced-motion: reduce){
          .cm-root *{ animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition: none !important; }
        }
      `}</style>

      <nav className="cm-nav">
  <div className="cm-nav-inner">

    {/* BRAND */}
    <div className="cm-brand">
      <svg className="cm-brand-mark" viewBox="0 0 32 32" fill="none">
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="7"
          stroke="#5eebae"
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        <circle cx="10" cy="10" r="2.2" fill="#5eebae" />
        <circle
          cx="22"
          cy="22"
          r="2.2"
          fill="#5eebae"
          fillOpacity="0.5"
        />
        <path
          d="M10 12.2V16.5C10 17.6 10.9 18.5 12 18.5H16.5"
          stroke="#5eebae"
          strokeWidth="1.4"
          fill="none"
        />
        <path
          d="M16.5 18.5H20C21.1 18.5 22 17.6 22 16.5V19.8"
          stroke="#5eebae"
          strokeOpacity="0.5"
          strokeWidth="1.4"
          fill="none"
        />
        <circle
          cx="16.5"
          cy="18.5"
          r="1.4"
          fill="#e8f2ec"
        />
      </svg>

      <span>CircuitMate</span>
    </div>

    {/* NAV LINKS */}
    <div className="cm-nav-links">
      <a href="#hardware">Hardware</a>
      <a href="#diagnostics">Diagnostics</a>
      <a href="#results">Results</a>
    </div>

    {/* AUTH + STATUS */}
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

      <Link
        to="/auth"
        style={{
          padding: "8px 16px",
          border: "1px solid var(--border-hi)",
          borderRadius: "8px",
          fontSize: "13px",
          color: "var(--text-1)",
          background: "var(--panel)",
        }}
      >
        Login
      </Link>

      <Link
        to="/auth"
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: "600",
          color: "#06110c",
          background: "var(--accent)",
        }}
      >
        Sign Up
      </Link>

      <div className="cm-status-pill">
        <span className="cm-dot cm-pulse"></span>
        <span className="cm-pill-text">{connection}</span>
      </div>

    </div>

  </div>
</nav>

      <main className="cm-wrap">
        <section className="cm-hero">
          <div className="cm-hero-grid">
            <div>
              <div className="cm-eyebrow-line"><span className="cm-tick-mark"></span>Voice-first hardware diagnostics</div>
              <h1>Hands-free hardware troubleshooting</h1>
              <p className="cm-sub">Diagnose Arduino and ESP32 problems through natural voice interaction — without stopping to type.</p>
              <div className="cm-cta-row">
                <button className="cm-btn-primary" onClick={listening ? stopListening : startListening}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" stroke="#06110c" strokeWidth="1.8"/><path d="M19 11a7 7 0 01-14 0M12 18v3" stroke="#06110c" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Start Troubleshooting
                </button>
              </div>
              <div className="cm-meta-line">Voice-powered • Arduino &amp; ESP32 • Real-time diagnostics</div>
            </div>

            <div className="cm-mic-stage">
              <div className="cm-mic-field">
                <div className="cm-ring-glow"></div>
                <div className="cm-ring cm-ring--outer"></div>
                <div className="cm-ring cm-ring--mid"></div>
                <div className="cm-tick-ring">
                  {activeTicks.map((active, i) => (
                    <div
                      key={i}
                      className={`cm-t${active ? " cm-active" : ""}`}
                      style={{ transform: `rotate(${(360 / TICK_COUNT) * i}deg)` }}
                    />
                  ))}
                </div>
                <Link
  to="/auth"
  className="cm-btn-primary"
>
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z"
      stroke="#06110c"
      strokeWidth="1.8"
    />
    <path
      d="M19 11a7 7 0 01-14 0M12 18v3"
      stroke="#06110c"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>

  Start Troubleshooting
</Link>

              </div>
              <div className="cm-mic-label">
                <span className={`cm-dot${!listening ? " cm-pulse" : ""}`}></span>
                <span>{listening ? "Listening… tap to send" : connection}</span>
              </div>
              <div className="cm-mic-hint">{listening ? "Tap to stop and send" : "Tap to speak"}</div>
            </div>
          </div>
        </section>

        <section className="cm-section" id="hardware">
          <div className="cm-section-head">
            <h2>Built for the way engineers actually debug</h2>
            <span>Core capabilities</span>
          </div>
          <div className="cm-cards">
            <div className="cm-card">
              <div className="cm-card-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v4M9 22h6"/></svg>
              </div>
              <h3>Speak naturally</h3>
              <p>Explain your hardware problem without typing.</p>
            </div>
            <div className="cm-card">
              <div className="cm-card-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>
              </div>
              <h3>Hardware aware</h3>
              <p>Designed for Arduino and ESP32 troubleshooting.</p>
            </div>
            <div className="cm-card">
              <div className="cm-card-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round"><path d="M3 12a9 9 0 0115.5-6.3L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 01-15.5 6.3L3 16M3 21v-5h5"/></svg>
              </div>
              <h3>Understands corrections</h3>
              <p>Detects when you correct technical values while speaking.</p>
            </div>
          </div>
        </section>

        <section className="cm-section" id="live-debug" style={{ paddingTop: 0 }}>
          <div className="cm-status-panel" style={{ alignItems: "flex-start" }}>
            <div style={{ minWidth: "min(100%, 420px)" }}>
              <div className="cm-status-label">Live transcript</div>
              <div style={{ color: "var(--text-1)", minHeight: 24 }}>{transcript || "Waiting for speech…"}</div>
              <div className="cm-status-label" style={{ marginTop: 16 }}>Assistant</div>
              <div style={{ color: "var(--text-2)", minHeight: 42 }}>{response || "Your diagnosis will appear here."}</div>
              {Object.keys(facts).length > 0 && <div className="cm-meta-line">Resolved facts: {JSON.stringify(facts)}</div>}
            </div>
            <button className="cm-btn-primary" onClick={interrupt}>Stop response</button>
          </div>
        </section>

        <section className="cm-section" id="diagnostics">
          <div className="cm-status-panel">
            <div className="cm-status-panel-left">
              <div className="cm-status-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round"><path d="M4 12h3l2-7 4 14 2-7h5"/></svg>
              </div>
              <div>
                <div className="cm-status-label">Voice engine</div>
                <div className="cm-status-value"><span className="cm-dot cm-pulse"></span>{connection}</div>
              </div>
            </div>
            <div className="cm-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <div className="cm-status-sub">{error || (response ? "Response ready" : "Speak a hardware problem")}</div>
          </div>
        </section>
      </main>

      <footer className="cm-footer" id="results">
        <div className="cm-wrap cm-footer-inner">
          <span className="cm-footer-text">CircuitMate • Voice Hardware Troubleshooter</span>
          <span className="cm-footer-text">v0.1 — hackathon build</span>
        </div>
      </footer>
    </div>
  );
}
