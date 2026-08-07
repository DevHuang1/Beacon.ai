import React from "react";
import { themes, shadows, fontBody, fontDisplay, fontMono } from "../lib/theme";

const L = themes.light;
const D = themes.dark;
const Ls = shadows.light;
const Ds = shadows.dark;

const css = `
:root {
  --bg: ${L.bg};
  --panel: ${L.panel};
  --panel2: ${L.panel2};
  --panel3: ${L.panel3};
  --line: ${L.line};
  --line-soft: ${L.lineSoft};
  --text: ${L.text};
  --text-dim: ${L.textDim};
  --text-faint: ${L.textFaint};
  --red: ${L.red};
  --amber: ${L.amber};
  --teal: ${L.teal};
  --blue: ${L.blue};
  --purple: ${L.purple};
  --focus: ${L.blue};
  --selection-bg: ${L.blue}44;
  --shadow-sm: ${Ls.sm};
  --shadow-md: ${Ls.md};
  --shadow-lg: ${Ls.lg};
  --base-size: 15px;
}

html[data-theme="dark"] {
  --bg: ${D.bg};
  --panel: ${D.panel};
  --panel2: ${D.panel2};
  --panel3: ${D.panel3};
  --line: ${D.line};
  --line-soft: ${D.lineSoft};
  --text: ${D.text};
  --text-dim: ${D.textDim};
  --text-faint: ${D.textFaint};
  --red: ${D.red};
  --amber: ${D.amber};
  --teal: ${D.teal};
  --blue: ${D.blue};
  --purple: ${D.purple};
  --focus: ${D.blue};
  --selection-bg: ${D.blue}44;
  --shadow-sm: ${Ds.sm};
  --shadow-md: ${Ds.md};
  --shadow-lg: ${Ds.lg};
}

* { box-sizing: border-box; }

html {
  height: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
body {
  margin: 0;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: ${fontBody};
  font-size: var(--base-size);
  line-height: 1.5;
  letter-spacing: 0.008em;
  overflow-x: hidden;
  transition: background 0.3s ease, color 0.3s ease;
}
#__next { height: 100%; }

/* Theme colors crossfade with one shared duration so a light/dark toggle
   feels smooth and consistent — every surface swaps in sync. */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease,
    stroke 0.3s ease, fill 0.3s ease;
}

img, svg, canvas { max-width: 100%; }

.grid, main > * { min-width: 0; }

::selection { background: var(--selection-bg); color: var(--text); }

h1, h2, h3, h4 {
  font-family: ${fontDisplay};
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.005em;
}
h1 { font-size: 32px; line-height: 1.05; }
h2 { font-size: 22px; line-height: 1.15; }
h3 { font-size: 18px; line-height: 1.2; }
p, span, label, li { font-family: ${fontBody}; color: var(--text); line-height: 1.5; }

.skip-link {
  position: absolute; left: 8px; top: 8px;
  background: var(--panel2);
  color: var(--text);
  padding: 10px 16px;
  border-radius: 8px;
  z-index: 9999;
  transform: translateY(-140%);
  transition: transform 0.2s ease;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid var(--line);
}
.skip-link:focus {
  transform: translateY(0);
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-faint); border: 2px solid transparent; background-clip: content-box; }
.scrollbar { scrollbar-width: thin; scrollbar-color: var(--line) transparent; }

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.8; }
  70% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes slideInRight { from { transform: translateX(-24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
@keyframes markerPulse {
  0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
  70% { box-shadow: 0 0 0 20px rgba(59,130,246,0); }
  100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
}
@keyframes disasterPulse {
  0%,100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.8; }
}
@keyframes dangerExpand {
  0% { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes routeDraw {
  0% { stroke-dashoffset: 2000; }
  100% { stroke-dashoffset: 0; }
}
@keyframes fadeInUp {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes skeleton {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.skeleton {
  background: linear-gradient(90deg, var(--panel2) 25%, var(--panel3) 37%, var(--panel2) 63%);
  background-size: 200px 100%;
  animation: skeleton 1.6s ease-in-out infinite;
  border-radius: 6px;
}

:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 6px; }
:focus:not(:focus-visible) { outline: none; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

button { font-family: ${fontBody}; cursor: pointer; background: none; border: none; color: inherit; }
.btn { min-height: 44px; padding: 8px 14px; border-radius: 8px; font-weight: 600; }

.mono { font-family: ${fontMono}; }
.meta { font-size: 13px; color: var(--text-dim); letter-spacing: 0.01em; }

input, select, textarea { color: var(--text); }
select option { background: var(--panel); color: var(--text); }

.leaflet-control-zoom a {
  width: 40px !important; height: 40px !important;
  line-height: 40px !important; border-radius: 8px !important;
  font-size: 18px !important; background: var(--panel) !important;
  color: var(--text) !important; border: 1px solid var(--line) !important;
  box-shadow: var(--shadow-sm) !important;
}
.leaflet-control-zoom a:hover { background: var(--panel2) !important; color: var(--blue) !important; }
.leaflet-control-zoom { border: none !important; }
.leaflet-control-attribution { display: none !important; }
.leaflet-popup-content-wrapper {
  background: var(--panel) !important; color: var(--text) !important;
  border: 1px solid var(--line) !important; border-radius: 12px !important;
  box-shadow: var(--shadow-md) !important;
}
.leaflet-popup-tip { background: var(--panel) !important; border: 1px solid var(--line) !important; }
.leaflet-popup-close-button { color: var(--text-faint) !important; }
.leaflet-container { background: var(--bg) !important; }
`;

export function GlobalStyle() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
