import React from "react";
import theme, { fontDisplay, fontBody, fontMono } from "../lib/theme";
const C = theme.C;
const S = theme.S;

export function Badge({ tone = "info", children, size = "sm" }) {
  const map = {
    critical: { bg: C.redDim, fg: C.red, glow: C.redGlow },
    warning: { bg: C.amberDim, fg: C.amber, glow: C.amberGlow },
    safe: { bg: C.tealDim, fg: C.teal, glow: C.tealGlow },
    info: { bg: C.blueDim, fg: C.blue, glow: C.blueGlow },
  };
  const t = map[tone] || map.info;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: t.bg,
        color: t.fg,
        fontFamily: fontMono,
        fontSize: size === "sm" ? 11 : 13,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: size === "sm" ? "5px 10px" : "7px 14px",
        borderRadius: 6,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {children}
    </span>
  );
}

export function PageHeader({ icon: Icon, title, subtitle, tone = "info" }) {
  const toneColor = { critical: C.red, warning: C.amber, safe: C.teal, info: C.blue }[tone];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${toneColor}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 0 20px ${toneColor}22`,
        }}>
        <Icon size={22} color={toneColor} strokeWidth={2.2} />
      </div>
      <div>
        <h1
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 30,
            color: C.text,
            margin: 0,
            letterSpacing: "0.005em",
            lineHeight: 1.05,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 16, color: C.textDim, margin: "6px 0 0", fontWeight: 400 }}>{subtitle}</p>
      </div>
    </div>
  );
}

export function Panel({ children, style, title, action }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        padding: 18,
        boxShadow: S.sm,
        ...style,
      }}
    >
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div
            style={{
              fontFamily: fontMono,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.textFaint,
              fontWeight: 600,
            }}>
            {title}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      aria-pressed={checked}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: checked ? C.blue : C.line,
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s ease",
        cursor: "pointer",
        boxShadow: checked ? S.glow(C.blue) : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 24 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s ease",
          boxShadow: S.sm,
        }}
      />
    </button>
  );
}
