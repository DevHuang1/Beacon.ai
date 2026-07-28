import React from "react";
import { C, S, fontBody, fontDisplay, fontMono } from "../lib/theme";

const css = `
:root {
  --bg: ${C.bg};
  --panel: ${C.panel};
  --panel2: ${C.panel2};
  --panel3: ${C.panel3};
  --line: ${C.line};
  --line-soft: ${C.lineSoft};
  --text: ${C.text};
  --text-dim: ${C.textDim};
  --text-faint: ${C.textFaint};
  --red: ${C.red};
  --amber: ${C.amber};
  --teal: ${C.teal};
  --blue: ${C.blue};
  --focus: ${C.blue};
  --base-size: 15px;
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
}
#__next { height: 100%; }

::selection { background: ${C.blue}44; color: ${C.text}; }

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
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
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

.leaflet-control-zoom a {
  width: 40px !important; height: 40px !important;
  line-height: 40px !important; border-radius: 8px !important;
  font-size: 18px !important; background: #FFFFFF !important;
  color: #0F172A !important; border: 1px solid #E2E8F0 !important;
  box-shadow: ${S.sm} !important;
}
.leaflet-control-zoom a:hover { background: #F8FAFC !important; color: #2563EB !important; }
.leaflet-control-zoom { border: none !important; }
.leaflet-control-attribution { display: none !important; }
.leaflet-popup-content-wrapper {
  background: #FFFFFF !important; color: #0F172A !important;
  border: 1px solid #E2E8F0 !important; border-radius: 12px !important;
  box-shadow: ${S.md} !important;
}
.leaflet-popup-tip { background: #FFFFFF !important; border: 1px solid #E2E8F0 !important; }
.leaflet-popup-close-button { color: #64748B !important; }
`;

export function GlobalStyle() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
