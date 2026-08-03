import React from "react";
import theme from "../lib/theme";
const { C, S } = theme;

export default function Button({ variant = "primary", size = "md", children, onClick, ariaLabel, style, type = "button", ...props }) {
  const base = {
    minHeight: 44,
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.15s ease",
    lineHeight: 1.2,
  };

  const variants = {
    primary: { background: C.blue, color: "#FFFFFF", border: "none", boxShadow: S.sm },
    secondary: { background: C.panel2, color: C.text, border: `1px solid ${C.line}`, boxShadow: S.sm },
    ghost: { background: "transparent", color: C.textDim, border: "none" },
    danger: { background: C.red, color: "#FFFFFF", border: "none", boxShadow: S.sm },
    success: { background: C.teal, color: "#FFFFFF", border: "none", boxShadow: S.sm },
    warning: { background: "#D97706", color: "#FFFFFF", border: "none", boxShadow: S.sm },
  };

  const v = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{ ...base, ...v, ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
