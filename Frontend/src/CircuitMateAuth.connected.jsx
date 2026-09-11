import React, { useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
/* =========================================================================
   Mock auth — simulates a network call with the same shape a real
   backend response would have. Swap the body of `mockAuthenticate` for a
   real fetch()/API call later; the state machine below doesn't need to
   change.
   ========================================================================= */

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8787";

async function authenticate(mode, fields) {
  const endpoint =
    mode === "create"
      ? `${API_BASE_URL}/api/auth/register`
      : `${API_BASE_URL}/api/auth/login`;

  const payload =
    mode === "create"
      ? {
          fullName: fields.fullName.trim(),
          email: fields.email.trim(),
          password: fields.password,
        }
      : {
          email: fields.email.trim(),
          password: fields.password,
        };

  // Basic client-side validation for account creation.
  if (mode === "create" && fields.password !== fields.confirmPassword) {
    return {
      ok: false,
      message: "Passwords do not match.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      message:
        data.detail ||
        data.message ||
        "Authentication failed",
    };
  }

  // The backend must return a JWT in access_token.
  if (!data.access_token) {
    console.error("Authentication response is missing access_token:", data);
    return {
      ok: false,
      message: "Authentication succeeded, but no access token was returned.",
    };
  }

  // Store the authenticated session exactly once.
  localStorage.setItem("circuitmate_token", data.access_token);
  localStorage.setItem("circuitmate_user", JSON.stringify(data.user));

  return {
    ok: true,
    access_token: data.access_token,
    message: data.message,
    user: data.user,
  };
}

const initialFields = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};


export default function CircuitMateAuth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin"); // signin | create
  const [fields, setFields] = useState(initialFields);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [authState, setAuthState] = useState("idle"); // idle | authenticating | success | error
  const [authError, setAuthError] = useState("");
  const successTimeoutRef = useRef(null);

  const updateField = (key) => (e) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const switchTab = useCallback((next) => {
    setTab(next);
    setAuthState("idle");
    setAuthError("");
    setFields(initialFields);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (authState === "authenticating") return;

      setAuthState("authenticating");
      setAuthError("");

      try {
        const result = await authenticate(tab, fields);

        console.log("Authentication result:", result);

        if (result.ok) {
          setAuthState("success");

          // authenticate() already saved the JWT and user.
          // Navigate only after authentication has succeeded.
          navigate("/dashboard", { replace: true });
        } else {
          setAuthError(
            result.message || "Please check your email and password."
          );
          setAuthState("error");
        }
      } catch (error) {
        console.error("Authentication error:", error);

        setAuthError(
          error.message || "Unable to connect to the server."
        );
        setAuthState("error");
      }
    },
    [authState, tab, fields, navigate]
  );

  const isSignIn = tab === "signin";
  const isAuthenticating = authState === "authenticating";
  const isSuccess = authState === "success";

  return (
    <div className="cma-root">
      <style>{`
        .cma-root{
          --cma-bg: #090d0b;
          --cma-bg-alt: #0d1310;
          --cma-panel: #0f1613;
          --cma-panel-hi: #131c17;
          --cma-border: rgba(140, 214, 178, 0.14);
          --cma-border-hi: rgba(140, 214, 178, 0.30);
          --cma-text-1: #e8f2ec;
          --cma-text-2: #9fb3aa;
          --cma-text-3: #647169;
          --cma-accent: #5eebae;
          --cma-accent-soft: rgba(94, 235, 174, 0.14);
          --cma-accent-glow: rgba(94, 235, 174, 0.5);
          --cma-copper: #d99a5b;
          --cma-copper-soft: rgba(217, 154, 91, 0.14);
          --cma-danger: #e2705f;
          --cma-danger-soft: rgba(226, 112, 95, 0.12);
          --cma-font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --cma-font-mono: 'IBM Plex Mono', 'SF Mono', monospace;

          background: var(--cma-bg);
          color: var(--cma-text-1);
          font-family: var(--cma-font-sans);
          line-height: 1.5;
          min-height: 100vh;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          overflow: hidden;
        }
        .cma-root *{ box-sizing: border-box; }

        .cma-root::before{
          content:"";
          position: fixed; inset: 0;
          background-image:
            linear-gradient(var(--cma-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--cma-border) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.12;
          pointer-events: none;
          mask-image: radial-gradient(ellipse 65% 55% at 50% 40%, black 0%, transparent 78%);
          -webkit-mask-image: radial-gradient(ellipse 65% 55% at 50% 40%, black 0%, transparent 78%);
        }

        .cma-root button{ font-family: inherit; cursor: pointer; }
        .cma-root a{ color: inherit; text-decoration: none; }
        .cma-root input{ font-family: inherit; }

        .cma-dot{
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--cma-accent);
          box-shadow: 0 0 8px 1px var(--cma-accent-glow);
          display: inline-block; flex-shrink: 0;
        }
        .cma-dot.cma-pulse{ animation: cma-dotpulse 2.2s ease-in-out infinite; }
        @keyframes cma-dotpulse{ 0%,100%{opacity:1} 50%{opacity:0.55} }

        /* CARD */
        .cma-card{
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: var(--cma-panel);
          border: 1px solid var(--cma-border);
          border-radius: 18px;
          padding: 34px 32px 28px;
          box-shadow: 0 30px 80px -30px rgba(0,0,0,0.6);
        }

        /* LOGO SECTION */
        .cma-logo-wrap{ display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 26px; }
        .cma-logo-icon{ width: 40px; height: 40px; margin-bottom: 12px; }
        .cma-logo-name{ font-size: 18px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 6px; }
        .cma-logo-sub{ font-size: 13px; color: var(--cma-text-2); margin-bottom: 12px; }
        .cma-logo-status{
          display: flex; align-items: center; gap: 7px;
          font-family: var(--cma-font-mono); font-size: 11.5px; color: var(--cma-text-2);
          padding: 5px 12px; border: 1px solid var(--cma-border); border-radius: 100px;
          background: var(--cma-bg-alt);
        }

        /* TABS */
        .cma-tabs{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 4px;
          background: var(--cma-bg-alt);
          border: 1px solid var(--cma-border);
          border-radius: 11px;
          margin-bottom: 26px;
        }
        .cma-tab{
          padding: 9px 0;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--cma-text-3);
          background: transparent;
          border: none;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cma-tab.cma-tab-active{
          background: var(--cma-panel-hi);
          color: var(--cma-text-1);
          box-shadow: 0 0 0 1px var(--cma-border-hi);
        }

        /* HEADINGS */
        .cma-heading{ font-size: 20px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 6px; }
        .cma-subheading{ font-size: 13.5px; color: var(--cma-text-2); margin-bottom: 24px; line-height: 1.55; }

        /* FORM */
        .cma-field{ margin-bottom: 16px; }
        .cma-label{
          display: block;
          font-family: var(--cma-font-mono);
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--cma-text-3);
          margin-bottom: 8px;
        }
        .cma-input-wrap{ position: relative; }
        .cma-input{
          width: 100%;
          background: var(--cma-bg-alt);
          border: 1px solid var(--cma-border);
          color: var(--cma-text-1);
          font-size: 14px;
          border-radius: 10px;
          padding: 12px 14px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .cma-input::placeholder{ color: var(--cma-text-3); }
        .cma-input:focus{
          outline: none;
          border-color: var(--cma-accent);
          box-shadow: 0 0 0 3px var(--cma-accent-soft);
        }
        .cma-input.cma-with-icon{ padding-right: 42px; }

        .cma-eye-btn{
          position: absolute;
          right: 6px; top: 50%; transform: translateY(-50%);
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 7px;
          color: var(--cma-text-3);
          background: transparent;
          border: none;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .cma-eye-btn:hover{ color: var(--cma-text-1); background: var(--cma-panel-hi); }
        .cma-eye-btn svg{ width: 17px; height: 17px; }

        .cma-forgot-row{ display: flex; justify-content: flex-end; margin-bottom: 22px; margin-top: -6px; }
        .cma-forgot-link{ font-size: 12.5px; color: var(--cma-text-2); transition: color 0.15s ease; }
        .cma-forgot-link:hover{ color: var(--cma-accent); }

        /* BUTTONS */
        .cma-btn-primary{
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: var(--cma-accent);
          color: #06110c;
          font-weight: 600;
          font-size: 14.5px;
          padding: 13px 0;
          border-radius: 10px;
          border: none;
          box-shadow: 0 0 0 1px rgba(94,235,174,0.35), 0 10px 26px -10px var(--cma-accent-glow);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .cma-btn-primary:hover:not(:disabled){ transform: translateY(-1px); }
        .cma-btn-primary:disabled{ opacity: 0.85; cursor: default; }

        .cma-spinner{
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(6,17,12,0.25);
          border-top-color: #06110c;
          animation: cma-spin 700ms linear infinite;
          flex-shrink: 0;
        }
        @keyframes cma-spin{ to{ transform: rotate(360deg); } }

        .cma-divider{
          display: flex; align-items: center; gap: 14px;
          margin: 22px 0;
          font-family: var(--cma-font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--cma-text-3);
        }
        .cma-divider::before, .cma-divider::after{
          content: ""; flex: 1; height: 1px; background: var(--cma-border);
        }

        .cma-btn-secondary{
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: var(--cma-bg-alt);
          color: var(--cma-text-1);
          font-weight: 500;
          font-size: 14px;
          padding: 12px 0;
          border-radius: 10px;
          border: 1px solid var(--cma-border);
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .cma-btn-secondary:hover{ border-color: var(--cma-border-hi); background: var(--cma-panel-hi); }
        .cma-btn-secondary svg{ width: 17px; height: 17px; flex-shrink: 0; }

        /* SWITCH ROW */
        .cma-switch-row{ text-align: center; margin-top: 22px; font-size: 13px; color: var(--cma-text-2); }
        .cma-switch-link{ color: var(--cma-accent); font-weight: 500; }
        .cma-switch-link:hover{ text-decoration: underline; }

        /* STATUS CARDS */
        .cma-status-card{
          border-radius: 12px;
          padding: 22px 20px;
          text-align: center;
          margin-bottom: 6px;
        }
        .cma-status-success{
          background: linear-gradient(180deg, rgba(94,235,174,0.1), var(--cma-panel) 70%);
          border: 1px solid rgba(94,235,174,0.4);
        }
        .cma-status-success .cma-status-icon{
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--cma-accent-soft);
          border: 1px solid rgba(94,235,174,0.4);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px;
        }
        .cma-status-success .cma-status-icon svg{ width: 19px; height: 19px; stroke: var(--cma-accent); }
        .cma-status-title{ font-size: 15.5px; font-weight: 600; margin-bottom: 4px; }
        .cma-status-sub{ font-size: 13px; color: var(--cma-text-2); }

        .cma-error-card{
          display: flex; align-items: flex-start; gap: 12px;
          background: var(--cma-danger-soft);
          border: 1px solid rgba(226,112,95,0.35);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }
        .cma-error-icon{ font-size: 15px; line-height: 1; flex-shrink: 0; margin-top: 1px; }
        .cma-error-title{ font-size: 13.5px; font-weight: 600; color: var(--cma-danger); margin-bottom: 3px; }
        .cma-error-sub{ font-size: 12.5px; color: var(--cma-text-2); line-height: 1.5; }

        /* RIME STATUS */
        .cma-rime-status{
          margin-top: 26px;
          padding-top: 18px;
          border-top: 1px solid var(--cma-border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .cma-rime-label{
          font-family: var(--cma-font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--cma-text-3);
        }
        .cma-rime-value{
          display: flex; align-items: center; gap: 7px;
          font-family: var(--cma-font-mono); font-size: 12px; color: var(--cma-text-2);
        }

        /* FOOTER */
        .cma-footer{ text-align: center; margin-top: 22px; }
        .cma-footer-text{ font-family: var(--cma-font-mono); font-size: 11.5px; color: var(--cma-text-3); margin-bottom: 8px; }
        .cma-footer-links{ display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 12px; color: var(--cma-text-3); }
        .cma-footer-links a:hover{ color: var(--cma-text-1); }

        @media (max-width: 480px){
          .cma-root{ padding: 24px 14px; align-items: flex-start; }
          .cma-card{ padding: 28px 20px 24px; border-radius: 14px; }
        }

        @media (prefers-reduced-motion: reduce){
          .cma-root *{ animation-duration: 0.001ms !important; transition: none !important; }
        }
      `}</style>

      <div className="cma-card">

        {/* LOGO */}
        <div className="cma-logo-wrap">
          <svg className="cma-logo-icon" viewBox="0 0 32 32" fill="none">
            <rect x="1" y="1" width="30" height="30" rx="8" stroke="#5eebae" strokeOpacity="0.5" strokeWidth="1"/>
            <circle cx="10" cy="10" r="2.2" fill="#5eebae"/>
            <circle cx="22" cy="22" r="2.2" fill="#5eebae" fillOpacity="0.5"/>
            <path d="M10 12.2V16.5C10 17.6 10.9 18.5 12 18.5H16.5" stroke="#5eebae" strokeWidth="1.4" fill="none"/>
            <path d="M16.5 18.5H20C21.1 18.5 22 17.6 22 16.5V19.8" stroke="#5eebae" strokeOpacity="0.5" strokeWidth="1.4" fill="none"/>
            <circle cx="16.5" cy="18.5" r="1.4" fill="#e8f2ec"/>
          </svg>
          <div className="cma-logo-name">CircuitMate</div>
          <div className="cma-logo-sub">Hands-free hardware troubleshooting</div>
          <div className="cma-logo-status"><span className="cma-dot cma-pulse"></span>System Ready</div>
        </div>

        {/* TABS */}
        <div className="cma-tabs">
          <button
            type="button"
            className={`cma-tab${isSignIn ? " cma-tab-active" : ""}`}
            onClick={() => switchTab("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`cma-tab${!isSignIn ? " cma-tab-active" : ""}`}
            onClick={() => switchTab("create")}
          >
            Create Account
          </button>
        </div>

        {/* SUCCESS STATE */}
        {isSuccess ? (
          <div className="cma-status-card cma-status-success">
            <div className="cma-status-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <div className="cma-status-title">Authentication successful</div>
            <div className="cma-status-sub">Welcome to CircuitMate.</div>
          </div>
        ) : (
          <>
            {isSignIn ? (
              <>
                <div className="cma-heading">Welcome back</div>
                <div className="cma-subheading">Continue troubleshooting your hardware with CircuitMate.</div>
              </>
            ) : (
              <>
                <div className="cma-heading">Create your CircuitMate account</div>
                <div className="cma-subheading">Set up your workspace for voice-powered hardware diagnostics.</div>
              </>
            )}

            {authState === "error" && (
              <div className="cma-error-card">
                <span className="cma-error-icon">⚠️</span>
                <div>
                  <div className="cma-error-title">Authentication failed</div>
                  <div className="cma-error-sub">{authError || "Please check your email and password and try again."}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isSignIn && (
                <div className="cma-field">
                  <label className="cma-label" htmlFor="cma-fullname">Full Name</label>
                  <div className="cma-input-wrap">
                    <input
                      id="cma-fullname"
                      className="cma-input"
                      type="text"
                      placeholder="Enter your full name"
                      value={fields.fullName}
                      onChange={updateField("fullName")}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="cma-field">
                <label className="cma-label" htmlFor="cma-email">Email</label>
                <div className="cma-input-wrap">
                  <input
                    id="cma-email"
                    className="cma-input"
                    type="email"
                    placeholder="Enter your email"
                    value={fields.email}
                    onChange={updateField("email")}
                    required
                  />
                </div>
              </div>

              <div className="cma-field">
                <label className="cma-label" htmlFor="cma-password">Password</label>
                <div className="cma-input-wrap">
                  <input
                    id="cma-password"
                    className="cma-input cma-with-icon"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={fields.password}
                    onChange={updateField("password")}
                    required
                  />
                  <button
                    type="button"
                    className="cma-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.24A9.7 9.7 0 0112 4c5 0 9 4 10.5 8-.5 1.4-1.3 2.7-2.3 3.8M6.4 6.4C4.4 7.7 2.9 9.6 1.5 12c1.5 4 5.5 8 10.5 8 1.2 0 2.4-.2 3.5-.6"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 12S5.5 4 12 4s10.5 8 10.5 8-4 8-10.5 8S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {!isSignIn && (
                <div className="cma-field">
                  <label className="cma-label" htmlFor="cma-confirm">Confirm Password</label>
                  <div className="cma-input-wrap">
                    <input
                      id="cma-confirm"
                      className="cma-input cma-with-icon"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={fields.confirmPassword}
                      onChange={updateField("confirmPassword")}
                      required
                    />
                    <button
                      type="button"
                      className="cma-eye-btn"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.24A9.7 9.7 0 0112 4c5 0 9 4 10.5 8-.5 1.4-1.3 2.7-2.3 3.8M6.4 6.4C4.4 7.7 2.9 9.6 1.5 12c1.5 4 5.5 8 10.5 8 1.2 0 2.4-.2 3.5-.6"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 12S5.5 4 12 4s10.5 8 10.5 8-4 8-10.5 8S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {isSignIn && (
                <div className="cma-forgot-row">
                  <a href="#" className="cma-forgot-link">Forgot password?</a>
                </div>
              )}

              <button type="submit" className="cma-btn-primary" disabled={isAuthenticating} style={!isSignIn ? { marginTop: 4 } : undefined}>
                {isAuthenticating ? (
                  <>
                    <span className="cma-spinner"></span>
                    Authenticating...
                  </>
                ) : isSignIn ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {isSignIn && (
              <>
                <div className="cma-divider">OR</div>
                <button type="button" className="cma-btn-secondary">
                  <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 01-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.93l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0012 24z"/><path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 014.9 12c0-.79.14-1.56.39-2.28v-3.1H1.28A12 12 0 000 12c0 1.94.46 3.77 1.28 5.38l4.01-3.1z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 001.28 6.62l4.01 3.1C6.23 6.9 8.88 4.75 12 4.75z"/></svg>
                  Continue with Google
                </button>
              </>
            )}

            <div className="cma-switch-row">
              {isSignIn ? (
                <>Don't have an account? <a href="#" className="cma-switch-link" onClick={(e) => { e.preventDefault(); switchTab("create"); }}>Create Account</a></>
              ) : (
                <>Already have an account? <a href="#" className="cma-switch-link" onClick={(e) => { e.preventDefault(); switchTab("signin"); }}>Sign In</a></>
              )}
            </div>
          </>
        )}

        {/* RIME STATUS */}
        <div className="cma-rime-status">
          <span className="cma-rime-label">Voice Engine</span>
          <span className="cma-rime-value"><span className="cma-dot cma-pulse"></span>Rime Ready</span>
        </div>
      </div>

      <div className="cma-footer" style={{ position: "absolute", bottom: 24, left: 0, right: 0 }}>
        <div className="cma-footer-text">CircuitMate • Voice Hardware Troubleshooter</div>
        <div className="cma-footer-links">
          <a href="#">Privacy</a>
          <span>·</span>
          <a href="#">Terms</a>
        </div>
      </div>
    </div>
  );
}
