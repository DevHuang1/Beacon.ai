import React from "react";
import { useRouter } from "next/router";
import { SWRConfig } from "swr";
import { GlobalStyle } from "../components";
import { AuthProvider, useAuth } from "../components/AuthProvider";
import { LocationProvider } from "../lib/LocationContext";
import { ThemeProvider } from "../lib/ThemeContext";
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
    </ThemeProvider>
  );
}
