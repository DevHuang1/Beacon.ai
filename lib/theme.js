export const C = {
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
};

export const S = {
  sm: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)",
  md: "0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
  lg: "0 10px 25px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.05)",
  glow: (color) => `0 4px 20px ${color}25, 0 1px 3px ${color}15`,
  inner: "inset 0 1px 0 rgba(255,255,255,0.8)",
};

export const fontDisplay = "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
export const fontBody = "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
export const fontMono = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";

export const TOKENS = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { sm: 6, md: 8, lg: 12, xl: 16 },
  sizes: { leftNav: 240, leftNavCollapsed: 76, rightRail: 320, topBar: 64, touch: 44 },
  type: { base: 16, h1: 32, h2: 22, h3: 18, label: 14, small: 13, micro: 11 },
};

export default { C, S, TOKENS, fontDisplay, fontBody, fontMono };

