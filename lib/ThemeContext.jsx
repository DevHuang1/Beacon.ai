import React, { createContext, useContext, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { applyPalette, THEME_KEY } from "./theme";

const ThemeContext = createContext({ mode: "light", setMode: () => {}, toggle: () => {} });

// useLayoutEffect on the client to flip the palette before paint; plain
// useEffect on the server (where layout effects are meaningless) to avoid
// React SSR warnings.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function getSystemMode() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {}
  return "light";
}

export function ThemeProvider({ children }) {
  // Start on "light" on both server and first client render so SSR markup
  // and hydration always match; the stored/system preference is resolved in
  // a layout effect that runs before the first paint.
  const [mode, setMode] = useState("light");

  useIsomorphicLayoutEffect(() => {
    setMode(getSystemMode());
  }, []);

  useIsomorphicLayoutEffect(() => {
    applyPalette(mode);
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {}
  }, [mode]);

  // Keep the shared C/S singletons in sync during render so every child
  // reads the active palette on each render pass.
  applyPalette(mode);

  const toggle = useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
