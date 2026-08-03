import React, { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "../lib/supabase-client";
import { GlobalStyle } from "../components";
import theme, { fontDisplay, fontMono } from "../lib/theme";

const { C } = theme;

// Family test accounts (see accounts.txt) available for one-tap sign-in.
const QUICK_ACCOUNTS = [
  { name: "Sitt", role: "Admin", email: "thutasitt@gmail.com", password: "thutasitt" },
  { name: "Liam", role: "Family Admin", email: "liam.family@gmail.com", password: "LiamFamily@123" },
  { name: "Maya", role: "Family", email: "maya.family@gmail.com", password: "MayaFamily@123" },
  { name: "Noah", role: "Family", email: "noah.family@gmail.com", password: "NoahFamily@123" },
  { name: "Ava", role: "Family", email: "ava.family@gmail.com", password: "AvaFamily@123" },
];

const QUICK_KEY = "beacon_quick_accounts";

function loadQuickAccounts() {
  let remembered = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(QUICK_KEY);
      if (raw) remembered = JSON.parse(raw);
    } catch {}
  }
  const merged = [...remembered];
  QUICK_ACCOUNTS.forEach((a) => {
    if (!merged.some((m) => m.email === a.email)) merged.push(a);
  });
  return merged;
}

function rememberAccount(acct) {
  try {
    const prev = loadQuickAccounts().filter((a) => a.email !== acct.email);
    localStorage.setItem(QUICK_KEY, JSON.stringify([acct, ...prev].slice(0, 8)));
  } catch {}
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickAccount, setQuickAccount] = useState(null);
  const [quickAccounts] = useState(() => loadQuickAccounts());

  const signIn = async (em, pw) => {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
    setLoading(false);
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  };

  const quickLogin = async (acct) => {
    setQuickAccount(acct.email);
    setEmail(acct.email);
    setPassword(acct.password);
    const ok = await signIn(acct.email, acct.password);
    if (ok) {
      rememberAccount(acct);
      router.push("/");
    } else {
      setQuickAccount(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      setLoading(true);
      const ok = await signIn(email, password);
      if (ok) {
        rememberAccount({ name: email.split("@")[0], email, password });
        router.push("/");
      }
    } else {
      setLoading(true);
      const supabase = createClient();
      const options = {};
      if (username && username.trim().length >= 2) {
        const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (clean.length >= 2) options.data = { username: clean, display_name: clean };
      }
      const { error } = await supabase.auth.signUp({ email, password, options });
      setLoading(false);
      if (error) setError(error.message);
      else setError("Account created! Check your email for the confirmation link.");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    fontSize: 15,
    fontFamily: fontDisplay,
    background: C.bg,
    color: C.text,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <>
      <GlobalStyle />
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: C.panel,
            borderRadius: 16,
            border: `1px solid ${C.line}`,
            padding: 40,
            boxShadow: theme.S.lg,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                fontFamily: fontMono,
                fontWeight: 800,
                fontSize: 22,
                color: C.text,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  background: C.blue,
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                  marginRight: 8,
                }}
              >
                AI
              </span>
              BEACON.AI
            </div>
            <p style={{ color: C.textDim, fontSize: 14, margin: 0 }}>
              {mode === "login"
                ? "Sign in to your family safety network"
                : "Create an account for your family"}
            </p>
          </div>

          {mode === "login" && quickAccounts.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.textFaint,
                  fontFamily: fontMono,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                Quick sign-in
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {quickAccounts.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => quickLogin(a)}
                    disabled={loading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${C.line}`,
                      background: C.bg,
                      color: C.text,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: fontDisplay,
                      fontSize: 14,
                      transition: "all 0.15s",
                      textAlign: "left",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.background = `${C.blue}10`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.background = C.bg; }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: C.blueGlow, color: C.blue,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 800,
                        }}
                      >
                        {a.name.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <span style={{ display: "block", fontWeight: 700, fontSize: 13 }}>{a.name}</span>
                        <span style={{ display: "block", fontSize: 11, color: C.textFaint }}>{a.email}</span>
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: quickAccount === a.email ? C.blue : C.textFaint, fontWeight: 700 }}>
                      {quickAccount === a.email ? "Signing in..." : "Tap to sign in"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.textDim,
                  marginBottom: 6,
                  fontFamily: fontMono,
                }}
              >
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            {mode === "signup" && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.textDim,
                    marginBottom: 6,
                    fontFamily: fontMono,
                  }}
                >
                  USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  minLength={2}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11, color: C.textFaint, margin: "4px 0 0" }}>
                  Your family can find you by this username
                </p>
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.textDim,
                  marginBottom: 6,
                  fontFamily: fontMono,
                }}
              >
                PASSWORD
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={inputStyle}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: error.includes("Check your email")
                    ? C.tealDim
                    : C.redDim,
                  color: error.includes("Check your email") ? C.teal : C.red,
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 10,
                border: "none",
                background: loading ? C.textFaint : C.blue,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: fontDisplay,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: C.blue,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: fontDisplay,
                cursor: "pointer",
              }}
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
