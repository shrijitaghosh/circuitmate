import { useEffect, useState } from "react";
import { getDebugResults } from "./backend.js";

/* =========================================================================
   MOCK RESULTS DATA
   ---------------------------------------------------------------------
   Placeholder data shaped the way a real results API would return it.
   When the testing backend is ready, replace this object with the
   result of a fetch() call (e.g. `const RESULTS = await fetch('/api/
   results').then(r => r.json())`) that resolves to the same shape —
   the render logic below does not need to change.
   ========================================================================= */

const RESULTS = {
  metrics: {
    correctionAccuracy: { value: 94, unit: "%", sub: "Correctly detected corrections" },
    testsCompleted: { value: 50, sub: "Voice correction scenarios" },
    successRate: { value: "46 / 50", sub: "Successful tests" },
    avgLatency: { value: 420, unit: " ms", sub: "Speech → response" },
  },

  accuracy: { correct: 47, incorrect: 3 },

  breakdown: {
    totalTests: 50,
    successful: 47,
    failed: 3,
    correctionDetected: 48,
    falseCorrections: 1,
    lowConfidenceCases: 4,
  },

  latency: { average: 420, best: 280, worst: 780 },

  voiceEngine: {
    provider: "Rime",
    status: "Operational",
    successfulResponses: "48/50",
    ttsFailures: 2,
  },

  testCases: [
    { id: 1, spoken: ["GPIO 13", "… wait, GPIO 12"], expected: "12", detected: "12", result: "pass" },
    { id: 2, spoken: ["Use pin 5", "… actually pin 6"], expected: "6", detected: "6", result: "pass" },
    { id: 3, spoken: ["GPIO 18", "… sorry, GPIO 19"], expected: "19", detected: "18", result: "fail" },
    { id: 4, spoken: ["Pin 7", "… no, pin 8"], expected: "8", detected: "8", result: "pass" },
    { id: 5, spoken: ["GPIO 21", "… maybe GPIO 22?"], expected: "22", detected: "22", result: "low" },
  ],
};

const RESULT_META = {
  pass: { label: "✓ PASS", cls: "pass" },
  fail: { label: "✗ FAIL", cls: "fail" },
  low: { label: "⚠ LOW CONF.", cls: "low" },
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "pass", label: "Passed" },
  { key: "fail", label: "Failed" },
  { key: "low", label: "Low Confidence" },
];

export default function CircuitMateResults() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [liveResults, setLiveResults] = useState(null);

  useEffect(() => {
    const sessionId = localStorage.getItem("circuitmate_debug_session");
    if (!sessionId) return;
    getDebugResults(sessionId).then(setLiveResults).catch((error) => {
      console.warn("Using example results because the session summary is unavailable:", error);
    });
  }, []);

  const { metrics, accuracy, breakdown, latency, voiceEngine, testCases } = liveResults
    ? toDisplayResults(liveResults)
    : RESULTS;
  const accuracyTotal = accuracy.correct + accuracy.incorrect;
  const accuracyPct = accuracyTotal ? Math.round((accuracy.correct / accuracyTotal) * 100) : 0;

  const latencyBars = [
    { label: "Best", value: latency.best, color: "var(--cmr-accent)" },
    { label: "Average", value: latency.average, color: "var(--cmr-text-2)" },
    { label: "Worst", value: latency.worst, color: "var(--cmr-copper)" },
  ];
  const latencyMax = latency.worst;

  return (
    <div className="cmr-root">
      <style>{`
        .cmr-root{
          --cmr-bg: #090d0b;
          --cmr-bg-alt: #0d1310;
          --cmr-panel: #0f1613;
          --cmr-panel-hi: #131c17;
          --cmr-border: rgba(140, 214, 178, 0.14);
          --cmr-border-hi: rgba(140, 214, 178, 0.30);
          --cmr-text-1: #e8f2ec;
          --cmr-text-2: #9fb3aa;
          --cmr-text-3: #647169;
          --cmr-accent: #5eebae;
          --cmr-accent-soft: rgba(94, 235, 174, 0.14);
          --cmr-accent-glow: rgba(94, 235, 174, 0.5);
          --cmr-copper: #d99a5b;
          --cmr-copper-soft: rgba(217, 154, 91, 0.14);
          --cmr-copper-glow: rgba(217, 154, 91, 0.5);
          --cmr-danger: #e2705f;
          --cmr-danger-soft: rgba(226, 112, 95, 0.14);
          --cmr-font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --cmr-font-mono: 'IBM Plex Mono', 'SF Mono', monospace;

          background: var(--cmr-bg);
          color: var(--cmr-text-1);
          font-family: var(--cmr-font-sans);
          line-height: 1.5;
          position: relative;
          min-height: 100vh;
        }
        .cmr-root *{ box-sizing: border-box; }

        .cmr-root::before{
          content:"";
          position: fixed; inset: 0;
          background-image:
            linear-gradient(var(--cmr-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--cmr-border) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.10;
          pointer-events: none;
        }

        .cmr-root button{ font-family: inherit; cursor: pointer; }
        .cmr-root a{ color: inherit; text-decoration: none; }

        .cmr-dot{
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--cmr-accent);
          box-shadow: 0 0 8px 1px var(--cmr-accent-glow);
          display: inline-block; flex-shrink: 0;
        }
        .cmr-dot.cmr-pulse{ animation: cmr-dotpulse 2.2s ease-in-out infinite; }
        @keyframes cmr-dotpulse{ 0%,100%{opacity:1} 50%{opacity:0.5} }

        .cmr-tick{ width: 12px; height: 1px; background: var(--cmr-accent); display: inline-block; }

        /* TOP BAR */
        .cmr-topbar{
          position: sticky; top: 0; z-index: 50;
          background: rgba(9,13,11,0.85);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--cmr-border);
        }
        .cmr-topbar-inner{
          max-width: 1400px; margin: 0 auto;
          padding: 15px 36px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 20px;
        }
        .cmr-brand{ display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 15.5px; }
        .cmr-brand svg{ width: 26px; height: 26px; flex-shrink: 0; }

        .cmr-topbar-label{
          font-family: var(--cmr-font-mono); font-size: 12px; color: var(--cmr-text-3);
          padding-left: 12px; margin-left: 4px; border-left: 1px solid var(--cmr-border);
        }

        .cmr-nav{ display: flex; align-items: center; gap: 28px; font-size: 13.5px; color: var(--cmr-text-2); margin-left: auto; margin-right: 28px; }
        .cmr-nav a{ position: relative; padding: 4px 0; transition: color 0.15s ease; }
        .cmr-nav a:hover{ color: var(--cmr-text-1); }
        .cmr-nav a.cmr-active{ color: var(--cmr-accent); }
        .cmr-nav a.cmr-active::after{
          content: ""; position: absolute; left: 0; right: 0; bottom: -4px; height: 1px; background: var(--cmr-accent);
        }

        .cmr-status-pill{
          display: flex; align-items: center; gap: 8px;
          font-family: var(--cmr-font-mono); font-size: 12px; color: var(--cmr-text-2);
          padding: 6px 12px; border: 1px solid var(--cmr-border); border-radius: 100px;
          background: var(--cmr-panel); white-space: nowrap;
        }

        /* LAYOUT */
        .cmr-page{ max-width: 1400px; margin: 0 auto; padding: 34px 36px 0; position: relative; z-index: 1; }

        .cmr-page-head{ margin-bottom: 30px; }
        .cmr-page-head h1{ font-size: 27px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 8px; }
        .cmr-page-head p{ font-size: 14px; color: var(--cmr-text-2); max-width: 620px; margin: 0; }

        .cmr-card{
          background: var(--cmr-panel);
          border: 1px solid var(--cmr-border);
          border-radius: 14px;
          padding: 22px 24px;
        }

        .cmr-card-title{
          display: flex; align-items: center; gap: 9px;
          font-family: var(--cmr-font-mono); font-size: 11px; letter-spacing: 0.10em; text-transform: uppercase;
          color: var(--cmr-text-3); margin-bottom: 18px;
        }

        /* METRIC CARDS */
        .cmr-metrics{
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr;
          gap: 18px;
          margin-bottom: 22px;
        }

        .cmr-metric{
          background: var(--cmr-panel);
          border: 1px solid var(--cmr-border);
          border-radius: 14px;
          padding: 22px 24px;
        }
        .cmr-metric.cmr-emphasis{
          background: linear-gradient(180deg, rgba(94,235,174,0.08), var(--cmr-panel) 65%);
          border: 1px solid rgba(94,235,174,0.4);
          box-shadow: 0 0 0 1px rgba(94,235,174,0.06), 0 20px 50px -30px var(--cmr-accent-glow);
        }

        .cmr-metric-label{
          font-family: var(--cmr-font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--cmr-text-3); margin-bottom: 12px;
        }
        .cmr-metric.cmr-emphasis .cmr-metric-label{ color: var(--cmr-accent); }

        .cmr-metric-value{ font-size: 34px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 8px; }
        .cmr-metric.cmr-emphasis .cmr-metric-value{ color: var(--cmr-accent); font-size: 40px; }

        .cmr-metric-sub{ font-size: 12.5px; color: var(--cmr-text-2); }

        /* PERFORMANCE + LATENCY ROW */
        .cmr-row-2{ display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }

        .cmr-gauge-wrap{ display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }

        .cmr-radial-gauge{
          width: 168px; height: 168px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .cmr-radial-gauge-inner{
          width: 128px; height: 128px; border-radius: 50%;
          background: var(--cmr-panel);
          border: 1px solid var(--cmr-border);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .cmr-radial-gauge-inner .cmr-num{ font-size: 28px; font-weight: 700; color: var(--cmr-accent); }
        .cmr-radial-gauge-inner .cmr-lbl{ font-family: var(--cmr-font-mono); font-size: 10px; color: var(--cmr-text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }

        .cmr-gauge-legend{ display: flex; flex-direction: column; gap: 12px; }
        .cmr-gauge-legend-item{ display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
        .cmr-swatch{ width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .cmr-swatch.cmr-correct{ background: var(--cmr-accent); }
        .cmr-swatch.cmr-incorrect{ background: rgba(140,214,178,0.12); border: 1px solid var(--cmr-border-hi); }
        .cmr-gauge-legend-item .cmr-n{ font-family: var(--cmr-font-mono); font-weight: 600; color: var(--cmr-text-1); margin-left: auto; }

        /* latency chart */
        .cmr-latency-chart{ display: flex; align-items: flex-end; gap: 26px; height: 150px; padding: 0 6px 0; }
        .cmr-lat-bar-col{ display: flex; flex-direction: column; align-items: center; gap: 10px; flex: 1; height: 100%; justify-content: flex-end; }
        .cmr-lat-bar{ width: 40px; border-radius: 6px 6px 3px 3px; }
        .cmr-lat-bar-num{ font-family: var(--cmr-font-mono); font-size: 13px; font-weight: 600; }
        .cmr-lat-bar-label{ font-family: var(--cmr-font-mono); font-size: 10.5px; color: var(--cmr-text-3); text-transform: uppercase; letter-spacing: 0.05em; }

        .cmr-latency-summary{ display: flex; gap: 22px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--cmr-border); flex-wrap: wrap; }
        .cmr-latency-summary .cmr-item{ font-size: 12.5px; color: var(--cmr-text-2); }
        .cmr-latency-summary .cmr-item b{ color: var(--cmr-text-1); font-family: var(--cmr-font-mono); }

        /* BREAKDOWN + VOICE STATUS */
        .cmr-kv-list{ display: flex; flex-direction: column; gap: 12px; }
        .cmr-kv{ display: flex; align-items: baseline; justify-content: space-between; font-size: 13.5px; }
        .cmr-kv span:first-child{ color: var(--cmr-text-3); font-family: var(--cmr-font-mono); font-size: 12px; }
        .cmr-kv span:last-child{ color: var(--cmr-text-1); font-weight: 600; font-family: var(--cmr-font-mono); }

        .cmr-rime-status-big{
          display: flex; align-items: center; gap: 10px;
          font-size: 20px; font-weight: 700; color: var(--cmr-accent);
          margin-bottom: 20px;
        }
        .cmr-rime-status-big .cmr-dot{ width: 10px; height: 10px; }

        /* FILTERS */
        .cmr-filters{ display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .cmr-filter-btn{
          font-family: var(--cmr-font-mono); font-size: 12px;
          padding: 8px 16px; border-radius: 100px;
          border: 1px solid var(--cmr-border); background: transparent; color: var(--cmr-text-2);
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        }
        .cmr-filter-btn:hover{ border-color: var(--cmr-border-hi); color: var(--cmr-text-1); }
        .cmr-filter-btn.cmr-active{ background: var(--cmr-accent-soft); border-color: rgba(94,235,174,0.4); color: var(--cmr-accent); }

        /* TABLE */
        .cmr-table-wrap{ overflow-x: auto; }
        .cmr-root table{ width: 100%; border-collapse: collapse; min-width: 640px; }
        .cmr-root thead th{
          text-align: left; font-family: var(--cmr-font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--cmr-text-3); padding: 0 14px 12px; border-bottom: 1px solid var(--cmr-border); font-weight: 500;
        }
        .cmr-root tbody td{ padding: 14px; font-size: 13.5px; border-bottom: 1px solid var(--cmr-border); vertical-align: middle; }
        .cmr-root tbody tr:last-child td{ border-bottom: none; }
        .cmr-root tbody tr{ transition: background 0.15s ease; }
        .cmr-root tbody tr:hover{ background: var(--cmr-panel-hi); }

        .cmr-mono{ font-family: var(--cmr-font-mono); }
        .cmr-test-input{ color: var(--cmr-text-2); }
        .cmr-test-input .cmr-corr{ color: var(--cmr-copper); }

        .cmr-result-badge{
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--cmr-font-mono); font-size: 11.5px; font-weight: 600;
          padding: 5px 11px; border-radius: 100px;
        }
        .cmr-result-badge.cmr-pass{ background: var(--cmr-accent-soft); color: var(--cmr-accent); border: 1px solid rgba(94,235,174,0.35); }
        .cmr-result-badge.cmr-fail{ background: var(--cmr-danger-soft); color: var(--cmr-danger); border: 1px solid rgba(226,112,95,0.4); }
        .cmr-result-badge.cmr-low{ background: var(--cmr-copper-soft); color: var(--cmr-copper); border: 1px solid rgba(217,154,91,0.4); }

        /* FOOTER */
        .cmr-statusbar{ margin-top: 26px; border-top: 1px solid var(--cmr-border); background: var(--cmr-bg-alt); }
        .cmr-statusbar-inner{
          max-width: 1400px; margin: 0 auto; padding: 14px 36px;
          display: flex; flex-wrap: wrap; gap: 30px;
          font-family: var(--cmr-font-mono); font-size: 12px;
        }
        .cmr-sb-item{ display: flex; align-items: center; gap: 8px; }
        .cmr-sb-label{ color: var(--cmr-text-3); }
        .cmr-sb-value{ color: var(--cmr-text-2); }
        .cmr-sb-value.cmr-ok{ color: var(--cmr-accent); }

        /* RESPONSIVE */
        @media (max-width: 1180px){
          .cmr-metrics{ grid-template-columns: 1fr 1fr; }
          .cmr-row-2{ grid-template-columns: 1fr; }
        }
        @media (max-width: 900px){
          .cmr-nav{ display: none; }
          .cmr-topbar-label{ display: none; }
        }
        @media (max-width: 640px){
          .cmr-page{ padding: 24px 18px 0; }
          .cmr-metrics{ grid-template-columns: 1fr; }
          .cmr-topbar-inner{ padding: 14px 18px; }
          .cmr-statusbar-inner{ padding: 14px 18px; gap: 16px; }
          .cmr-gauge-wrap{ justify-content: center; }
          .cmr-latency-chart{ gap: 14px; }
        }

        @media (prefers-reduced-motion: reduce){
          .cmr-root *{ animation-duration: 0.001ms !important; transition: none !important; }
        }
      `}</style>

      <header className="cmr-topbar">
        <div className="cmr-topbar-inner">
          <div className="cmr-brand">
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
          <span className="cmr-topbar-label">Testing &amp; Results</span>
          <nav className="cmr-nav">
            <a href="#">Dashboard</a>
            <a href="#">Troubleshooting</a>
            <a href="#" className="cmr-active">Results</a>
          </nav>
          <span className="cmr-status-pill"><span className="cmr-dot cmr-pulse"></span>Rime Active ✓</span>
        </div>
      </header>

      <main className="cmr-page">

        <div className="cmr-page-head">
          <h1>Voice Correction Performance</h1>
          <p>Evaluation of CircuitMate's ability to detect and correctly process spoken corrections.</p>
        </div>

        {/* KEY METRICS */}
        <div className="cmr-metrics">
          <div className="cmr-metric cmr-emphasis">
            <div className="cmr-metric-label">Correction Accuracy</div>
            <div className="cmr-metric-value">{metrics.correctionAccuracy.value}{metrics.correctionAccuracy.unit}</div>
            <div className="cmr-metric-sub">{metrics.correctionAccuracy.sub}</div>
          </div>
          <div className="cmr-metric">
            <div className="cmr-metric-label">Tests Completed</div>
            <div className="cmr-metric-value">{metrics.testsCompleted.value}</div>
            <div className="cmr-metric-sub">{metrics.testsCompleted.sub}</div>
          </div>
          <div className="cmr-metric">
            <div className="cmr-metric-label">Success Rate</div>
            <div className="cmr-metric-value">{metrics.successRate.value}</div>
            <div className="cmr-metric-sub">{metrics.successRate.sub}</div>
          </div>
          <div className="cmr-metric">
            <div className="cmr-metric-label">Avg Response Latency</div>
            <div className="cmr-metric-value">{metrics.avgLatency.value}{metrics.avgLatency.unit}</div>
            <div className="cmr-metric-sub">{metrics.avgLatency.sub}</div>
          </div>
        </div>

        {/* CORRECTION PERFORMANCE + LATENCY */}
        <div className="cmr-row-2">
          <div className="cmr-card">
            <div className="cmr-card-title"><span className="cmr-tick"></span>Correction Accuracy</div>
            <div className="cmr-gauge-wrap">
              <div
                className="cmr-radial-gauge"
                style={{
                  background: `conic-gradient(var(--cmr-accent) 0% ${accuracyPct}%, rgba(140,214,178,0.08) ${accuracyPct}% 100%)`,
                }}
              >
                <div className="cmr-radial-gauge-inner">
                  <span className="cmr-num">{accuracyPct}%</span>
                  <span className="cmr-lbl">Accuracy</span>
                </div>
              </div>
              <div className="cmr-gauge-legend">
                <div className="cmr-gauge-legend-item"><span className="cmr-swatch cmr-correct"></span>Correct<span className="cmr-n">{accuracy.correct}</span></div>
                <div className="cmr-gauge-legend-item"><span className="cmr-swatch cmr-incorrect"></span>Incorrect<span className="cmr-n">{accuracy.incorrect}</span></div>
              </div>
            </div>
          </div>

          <div className="cmr-card">
            <div className="cmr-card-title"><span className="cmr-tick"></span>Response Latency</div>
            <div className="cmr-latency-chart">
              {latencyBars.map((b) => (
                <div className="cmr-lat-bar-col" key={b.label}>
                  <span className="cmr-lat-bar-num" style={{ color: b.color }}>{b.value} ms</span>
                  <div className="cmr-lat-bar" style={{ height: `${(b.value / latencyMax) * 100}%`, background: b.color }}></div>
                  <span className="cmr-lat-bar-label">{b.label}</span>
                </div>
              ))}
            </div>
            <div className="cmr-latency-summary">
              <div className="cmr-item">Average <b>{latency.average} ms</b></div>
              <div className="cmr-item">Best <b>{latency.best} ms</b></div>
              <div className="cmr-item">Worst <b>{latency.worst} ms</b></div>
            </div>
          </div>
        </div>

        {/* TEST BREAKDOWN + VOICE STATUS */}
        <div className="cmr-row-2">
          <div className="cmr-card">
            <div className="cmr-card-title"><span className="cmr-tick"></span>Test Results</div>
            <div className="cmr-kv-list">
              <div className="cmr-kv"><span>Total tests</span><span>{breakdown.totalTests}</span></div>
              <div className="cmr-kv"><span>Successful</span><span>{breakdown.successful}</span></div>
              <div className="cmr-kv"><span>Failed</span><span>{breakdown.failed}</span></div>
              <div className="cmr-kv"><span>Correction detected</span><span>{breakdown.correctionDetected}</span></div>
              <div className="cmr-kv"><span>False corrections</span><span>{breakdown.falseCorrections}</span></div>
              <div className="cmr-kv"><span>Low-confidence cases</span><span>{breakdown.lowConfidenceCases}</span></div>
            </div>
          </div>

          <div className="cmr-card">
            <div className="cmr-card-title"><span className="cmr-tick"></span>Rime TTS Status</div>
            <div className="cmr-rime-status-big"><span className="cmr-dot cmr-pulse"></span><span>ACTIVE</span></div>
            <div className="cmr-kv-list">
              <div className="cmr-kv"><span>Provider</span><span>{voiceEngine.provider}</span></div>
              <div className="cmr-kv"><span>Status</span><span>{voiceEngine.status}</span></div>
              <div className="cmr-kv"><span>Successful responses</span><span>{voiceEngine.successfulResponses}</span></div>
              <div className="cmr-kv"><span>TTS failures</span><span>{voiceEngine.ttsFailures}</span></div>
            </div>
          </div>
        </div>

        {/* TEST CASES TABLE */}
        <div className="cmr-card" style={{ marginBottom: 22 }}>
          <div className="cmr-card-title"><span className="cmr-tick"></span>Correction Test Cases</div>
          <div className="cmr-filters">
            {FILTER_OPTIONS.map((o) => (
              <button
                key={o.key}
                className={`cmr-filter-btn${o.key === activeFilter ? " cmr-active" : ""}`}
                onClick={() => setActiveFilter(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="cmr-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Spoken Input</th>
                  <th>Expected</th>
                  <th>Detected</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {testCases
                  .filter((t) => activeFilter === "all" || activeFilter === t.result)
                  .map((t) => {
                    const meta = RESULT_META[t.result];
                    return (
                      <tr key={t.id}>
                        <td className="cmr-mono">{t.id}</td>
                        <td className="cmr-test-input">"{t.spoken[0]}<span className="cmr-corr">{t.spoken[1]}</span>"</td>
                        <td className="cmr-mono">{t.expected}</td>
                        <td className="cmr-mono">{t.detected}</td>
                        <td><span className={`cmr-result-badge cmr-${meta.cls}`}>{meta.label}</span></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <footer className="cmr-statusbar">
        <div className="cmr-statusbar-inner">
          <div className="cmr-sb-item"><span className="cmr-sb-label">Speech Recognition</span><span className="cmr-sb-value cmr-ok">Connected ✓</span></div>
          <div className="cmr-sb-item"><span className="cmr-sb-label">Rime TTS</span><span className="cmr-sb-value cmr-ok">Active ✓</span></div>
          <div className="cmr-sb-item"><span className="cmr-sb-label">Backend</span><span className="cmr-sb-value">Mock / Test Mode</span></div>
        </div>
      </footer>
    </div>
  );
}

function toDisplayResults(result) {
  const summary = result.summary;
  const total = summary.totalTests;
  const passed = summary.successful;
  const failed = summary.failed;
  return {
    metrics: {
      correctionAccuracy: { value: total ? Math.round((summary.corrections / total) * 100) : 0, unit: "%", sub: "Corrections detected in this session" },
      testsCompleted: { value: total, sub: "Diagnostic tests completed" },
      successRate: { value: `${passed} / ${total}`, sub: "Successful tests" },
      avgLatency: { value: "—", unit: "", sub: "Not measured for debug sessions" },
    },
    accuracy: { correct: passed, incorrect: failed + summary.unknown },
    breakdown: { totalTests: total, successful: passed, failed, correctionDetected: summary.corrections, falseCorrections: 0, lowConfidenceCases: summary.unknown },
    latency: { average: 0, best: 0, worst: 1 },
    voiceEngine: { provider: "CircuitMate", status: result.resolved ? "Session complete" : "In progress", successfulResponses: `${passed}/${total}`, ttsFailures: 0 },
    testCases: result.testResults.map((item, index) => ({ id: index + 1, spoken: [item.observation || "Observation", ""], expected: item.testId, detected: item.result, result: item.result === "PASS" ? "pass" : item.result === "FAIL" ? "fail" : "low" })),
  };
}
