export const THEME_KEY = "beacon_ai_theme";

export const themes = {
  light: {
    bg: "#F4F7FB",
    panel: "#FFFFFF",
    panel2: "#F8FAFC",
    panel3: "#EDF2F7",
    line: "#E2E8F0",
    lineSoft: "#F1F5F9",
    text: "#0F172A",
    textDim: "#475569",
    textFaint: "#64748B",
    red: "#DC2626",
    redDim: "#FEF2F2",
    redGlow: "rgba(220, 38, 38, 0.12)",
    amber: "#D97706",
    amberDim: "#FFFBEB",
    amberGlow: "rgba(217, 119, 6, 0.12)",
    teal: "#0D9488",
    tealDim: "#F0FDF4",
    tealGlow: "rgba(13, 148, 136, 0.12)",
    blue: "#2563EB",
    blueDim: "#EFF6FF",
    blueGlow: "rgba(37, 99, 235, 0.12)",
    purple: "#7C3AED",
    purpleDim: "#F5F3FF",
  },
  dark: {
    bg: "#0B1220",
    panel: "#111A2C",
    panel2: "#16223A",
    panel3: "#1E2C47",
    line: "#26334F",
    lineSoft: "#1B2740",
    text: "#E6EDF7",
    textDim: "#9FB0C7",
    textFaint: "#7285A0",
    red: "#F87171",
    redDim: "rgba(248, 113, 113, 0.14)",
    redGlow: "rgba(248, 113, 113, 0.2)",
    amber: "#FBBF24",
    amberDim: "rgba(251, 191, 36, 0.14)",
    amberGlow: "rgba(251, 191, 36, 0.2)",
    teal: "#2DD4BF",
    tealDim: "rgba(45, 212, 191, 0.14)",
    tealGlow: "rgba(45, 212, 191, 0.2)",
    blue: "#60A5FA",
    blueDim: "rgba(96, 165, 250, 0.16)",
    blueGlow: "rgba(96, 165, 250, 0.22)",
    purple: "#A78BFA",
    purpleDim: "rgba(167, 139, 250, 0.14)",
  },
};

export const shadows = {
  light: {
    sm: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)",
    md: "0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
    lg: "0 10px 25px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.05)",
    glow: (color) => `0 4px 20px ${color}25, 0 1px 3px ${color}15`,
    inner: "inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  dark: {
    sm: "0 1px 3px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.35)",
    md: "0 4px 14px rgba(0, 0, 0, 0.45), 0 1px 4px rgba(0, 0, 0, 0.3)",
    lg: "0 12px 32px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35)",
    glow: (color) => `0 4px 22px ${color}2e, 0 1px 4px ${color}1a`,
    inner: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },
};

// Mutable singletons so components that destructure `C` / `S` at module
// scope (e.g. `const { C, S } = theme`) still follow the active theme.
export const C = { ...themes.light };
export const S = { ...shadows.light };

export function applyPalette(mode) {
  const c = themes[mode] || themes.light;
  const s = shadows[mode] || shadows.light;
  for (const key in themes.light) C[key] = c[key];
  for (const key in shadows.light) S[key] = s[key];
}

export const TOKENS = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { sm: 6, md: 8, lg: 12, xl: 16 },
  sizes: { leftNav: 240, leftNavCollapsed: 76, rightRail: 320, topBar: 64, touch: 44 },
  type: { base: 16, h1: 32, h2: 22, h3: 18, label: 14, small: 13, micro: 11 },
};

export const fontDisplay = "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
export const fontBody = "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
export const fontMono = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";

export default { C, S, TOKENS, fontDisplay, fontBody, fontMono, themes, shadows, applyPalette, THEME_KEY };
