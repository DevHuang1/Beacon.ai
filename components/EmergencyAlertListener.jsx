import React, { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../lib/theme";
import { AlertTriangle, X, CheckCircle2, ShieldCheck } from "lucide-react";
import Button from "./Button";

const SEEN_ALERT_KEY = "beacon_last_seen_alert_id";
const SEEN_ACK_KEY = "beacon_seen_ack_ids";

function loadKey(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveKey(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function loadAckIds() {
  const raw = loadKey(SEEN_ACK_KEY, "[]");
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function saveAckIds(set) {
  saveKey(SEEN_ACK_KEY, JSON.stringify(Array.from(set)));
}

/**
 * Polls the alerts API for two things:
 *  1. New emergency alerts addressed to the current user -> large red popup.
 *  2. Alerts the current user sent that the recipient acknowledged -> "I am
 *     safe" popup back to the alerter.
 */
export default function EmergencyAlertListener() {
  const [loaded, setLoaded] = useState(false);
  const [incoming, setIncoming] = useState(null);
  const [safe, setSafe] = useState(null);
  const seenIncomingRef = useRef(null);
  const seenAckRef = useRef(null);

  useEffect(() => {
    seenIncomingRef.current = loadKey(SEEN_ALERT_KEY, null);
    seenAckRef.current = loadAckIds();
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const pollIncoming = async () => {
      try {
        const res = await fetch("/api/profiles/alert");
        const d = await res.json();
        if (d?.success !== true || !Array.isArray(d.data) || d.data.length === 0) return;
        const newest = d.data[0];
        if (newest.id === seenIncomingRef.current) return;
        if (seenIncomingRef.current == null) {
          seenIncomingRef.current = newest.id;
          saveKey(SEEN_ALERT_KEY, newest.id);
          return;
        }
        seenIncomingRef.current = newest.id;
        saveKey(SEEN_ALERT_KEY, newest.id);
        setIncoming({
          id: newest.id,
          sender_name: newest.sender_name || "A family member",
          message: newest.message,
        });
      } catch {}
    };

    const pollAcks = async () => {
      try {
        const res = await fetch("/api/profiles/alert?sent=1");
        const d = await res.json();
        if (d?.success !== true || !Array.isArray(d.data) || d.data.length === 0) return;
        const fresh = d.data.filter((a) => !seenAckRef.current.has(a.id));
        if (fresh.length === 0) return;
        fresh.forEach((a) => seenAckRef.current.add(a.id));
        saveAckIds(seenAckRef.current);
        setSafe({
          id: fresh[0].id,
          recipient_name: fresh[0].recipient_name || "A family member",
          message: fresh[0].message,
        });
      } catch {}
    };

    pollIncoming();
    pollAcks();
    const iv = setInterval(() => {
      pollIncoming();
      pollAcks();
    }, 5000);
    return () => clearInterval(iv);
  }, [loaded]);

  const acknowledge = useCallback(async (alertId) => {
    try {
      await fetch("/api/profiles/acknowledge-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId }),
      });
    } catch {}
    setIncoming(null);
  }, []);

  const backdrop = {
    position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  };

  return (
    <>
      {incoming && (
        <div style={backdrop}>
          <div style={{
            width: "100%", maxWidth: 720, background: C.panel,
            border: `3px solid ${C.red}`, borderRadius: 20, padding: "36px 40px",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6)", animation: "fadeInUp 0.25s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.red, fontWeight: 900, fontSize: 24 }}>
                <AlertTriangle size={32} /> EMERGENCY ALERT
              </div>
              <button onClick={() => setIncoming(null)} aria-label="Dismiss alert" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textDim }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ fontSize: 15, color: C.textDim, marginBottom: 10 }}>
              From <strong style={{ color: C.text }}>{incoming.sender_name}</strong>
            </div>
            <div style={{ fontSize: 18, color: C.text, lineHeight: 1.7, marginBottom: 28, whiteSpace: "pre-line" }}>
              {incoming.message}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="success" onClick={() => acknowledge(incoming.id)} style={{ flex: 1, minWidth: 200, padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 800 }}>
                <ShieldCheck size={20} /> I&apos;m safe
              </Button>
              <Button variant="secondary" onClick={() => setIncoming(null)} style={{ padding: "14px 24px", fontSize: 14, fontWeight: 700 }}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {safe && (
        <div style={backdrop}>
          <div style={{
            width: "100%", maxWidth: 720, background: C.panel,
            border: `3px solid ${C.teal}`, borderRadius: 20, padding: "36px 40px",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6)", animation: "fadeInUp 0.25s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.teal, fontWeight: 900, fontSize: 24 }}>
                <CheckCircle2 size={32} /> I&apos;M SAFE
              </div>
              <button onClick={() => setSafe(null)} aria-label="Dismiss" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textDim }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ fontSize: 18, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>
              <strong style={{ color: C.teal }}>{safe.recipient_name}</strong> responded{" "}
              <strong>&quot;I&apos;m safe&quot;</strong> to your emergency alert.
            </div>
            <div style={{ fontSize: 14, color: C.textDim, whiteSpace: "pre-line", marginBottom: 24, padding: "12px 16px", background: `${C.teal}10`, borderRadius: 10, border: `1px solid ${C.teal}33` }}>
              {safe.message}
            </div>
            <Button variant="success" onClick={() => setSafe(null)} style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 800 }}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
