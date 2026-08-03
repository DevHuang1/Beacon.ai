import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "../lib/supabase-client";
import { C } from "../lib/theme";
import { AlertTriangle, X, CheckCircle2 } from "lucide-react";
import Button from "./Button";

const CHANNEL = "beacon-family-alerts";
const EVENT = "emergency-alert";

/**
 * Listens for realtime emergency alerts targeted at the current user and shows
 * a prominent popup when one arrives — regardless of which screen is open.
 */
export default function EmergencyAlertListener() {
  const [userId, setUserId] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.id) setUserId(d.user.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(CHANNEL);
    channel
      .on("broadcast", { event: EVENT }, (payload) => {
        const p = payload?.payload || {};
        if (p.recipient_id && p.recipient_id !== userId) return;
        setAlert({ ...p, id: Date.now() });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismiss = useCallback(() => setAlert(null), []);

  if (!alert) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        maxWidth: 420, width: "100%", background: C.panel,
        border: `2px solid ${C.red}`, borderRadius: 16, padding: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)", animation: "fadeInUp 0.25s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.red, fontWeight: 800, fontSize: 16 }}>
            <AlertTriangle size={20} /> EMERGENCY ALERT
          </div>
          <button onClick={dismiss} aria-label="Dismiss alert" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textDim }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 6 }}>
          From <strong style={{ color: C.text }}>{alert.sender_name || "A family member"}</strong>
          {alert.recipient_name ? ` for ${alert.recipient_name}` : ""}
        </div>
        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 16, whiteSpace: "pre-line" }}>
          {alert.message}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="success" onClick={dismiss} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <CheckCircle2 size={15} /> I&apos;m safe / Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
}
