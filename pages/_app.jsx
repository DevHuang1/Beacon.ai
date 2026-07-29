import React from "react";
import { useRouter } from "next/router";
import { GlobalStyle } from "../components";
import { AuthProvider, useAuth } from "../components/AuthProvider";

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
        background: "#F4F7FB",
        fontFamily: "monospace",
        color: "#64748B",
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
    <AuthProvider>
      <GlobalStyle />
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );
}
