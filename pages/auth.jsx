import React, { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "../lib/supabase-client";
import { GlobalStyle } from "../components";
import theme, { fontDisplay, fontMono } from "../lib/theme";

const { C } = theme;

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    } else {
      const options = {};
      if (username && username.trim().length >= 2) {
        const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (clean.length >= 2) options.data = { username: clean, display_name: clean };
      }
      const { error } = await supabase.auth.signUp({ email, password, options });
      if (error) setError(error.message);
      else setError("Account created! Check your email for the confirmation link.");
    }

    setLoading(false);
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
