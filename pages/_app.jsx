import React from "react";
import { useRouter } from "next/router";
import { SWRConfig } from "swr";
import { GlobalStyle } from "../components";
import { AuthProvider, useAuth } from "../components/AuthProvider";
import { LocationProvider } from "../lib/LocationContext";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { swrConfig } from "../lib/swr";

function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user && router.pathname !== "/auth") {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  if (loading && router.pathname !== "/auth") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "monospace",
        color: "var(--text-faint)",
        fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  return children;
}

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AppShell Component={Component} pageProps={pageProps} />
    </ThemeProvider>
  );
}

// Subscribes to the theme so the whole tree it constructs re-renders whenever
// the mode flips. React would otherwise bail out of re-rendering children that
// were passed through as stable props, leaving components that read the shared
// C/S color singletons with stale colors until some other re-render occurs.
function AppShell({ Component, pageProps }) {
  useTheme();
  return (
    <AuthProvider>
      <GlobalStyle />
      <LocationProvider>
        <AuthGuard>
          <SWRConfig value={swrConfig}>
            <Component {...pageProps} />
          </SWRConfig>
        </AuthGuard>
      </LocationProvider>
    </AuthProvider>
  );
}
