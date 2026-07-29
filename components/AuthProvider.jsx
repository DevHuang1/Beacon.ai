import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "../lib/supabase-client";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading } },
    children
  );
}

export const useAuth = () => useContext(AuthContext);
