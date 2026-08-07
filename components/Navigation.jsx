import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { MODULES } from "../data/mockData";
import theme, { fontMono } from "../lib/theme";
import { Badge } from "./ui2";
import Button from "./Button";
import { useAuth } from "./AuthProvider";
import { useLocation } from "../lib/LocationContext";
import { useIsMobile } from "../lib/useIsMobile";
import { createClient } from "../lib/supabase-client";
import {
  AlertTriangle, MapPin, Shield, Activity, Flame, CloudRain, Navigation,
  Home, ChevronRight, TriangleAlert, Radio, Waves, Compass, Bell, X, HelpCircle, Users, LogOut, User, Settings,
} from "lucide-react";

const C = theme.C;
const S = theme.S;

function fetchWeatherAlerts(lat, lon) {
  return fetch(`/api/weather?type=alerts&lat=${lat}&lon=${lon}`).then((r) => r.json());
}

export function StatusRibbon({ activeModule }) {
  const isMobile = useIsMobile();
  const contextMap = {
    escape: { tone: "critical", text: "Disaster Escape Assistant — Live hazard routing, flood warning detection, and active shelter guidance", icon: TriangleAlert },
    route: { tone: "info", text: "Safe Route Planner — AI hazard avoidance routing bypassing flooded roads and landslides", icon: Navigation },
    shelters: { tone: "safe", text: "Shelter Finder — Real-time shelter availability, capacity meters, and ADA/pet facilities", icon: Home },
    family: { tone: "safe", text: "Family Locator — Track family member check-ins, shelter arrivals, and battery status", icon: Users },
    profile: { tone: "info", text: "Profile & Settings — Configure your default location, family members, and app preferences", icon: Settings },
    flood: { tone: "warning", text: "Smart Flood Monitoring — USGS river gauge sensors and satellite water boundary analysis", icon: Waves },
    wildfire: { tone: "critical", text: "Wildfire Risk Tracker — NASA satellite thermal hotspots and wind direction vectors", icon: Flame },
    earthquake: { tone: "info", text: "Earthquake Monitor — USGS seismic activity feed and epicenter proximity alerts", icon: Activity },
    weather: { tone: "warning", text: "Weather Radar & Alerts — NWS extreme storm warnings and rainfall forecast maps", icon: CloudRain },
  };
  const ctx = contextMap[activeModule] || contextMap.escape;
  const Icon = ctx.icon;
  const toneColor = { critical: C.red, warning: C.amber, safe: C.teal, info: C.blue }[ctx.tone];

  return (
    <div role="status" aria-live="polite" style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 22px",
      background: `linear-gradient(90deg, ${C.panel2}, ${C.panel})`,
      borderBottom: `1px solid ${C.line}`,
      gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Icon size={16} color={toneColor} strokeWidth={2.2} aria-hidden />
        <span style={{ fontSize: 14, color: C.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ctx.text}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ display: isMobile ? "none" : "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: fontMono, color: C.teal }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, animation: "blink 1.5s infinite" }} />
          GeoAI Engine Active
        </span>
      </div>
    </div>
  );
}

export function TopBar({ active, onNavigate, onOpenAlert, onToggleNav, onHelp }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const { user } = useAuth();
  const router = useRouter();
  const initials = user?.email?.charAt(0).toUpperCase() || "?";
  const loc = useLocation();
  const isMobile = useIsMobile();

  const loadAlerts = useCallback(() => {
    fetch("/api/profiles/alert")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success !== true || !Array.isArray(d.data)) return setAlertCount(0);
        setAlertCount(d.data.filter((a) => !a.acknowledged).length);
      })
      .catch(() => setAlertCount(0));
  }, []);

  useEffect(() => {
    loadAlerts();
    const iv = setInterval(loadAlerts, 10000);
    return () => clearInterval(iv);
  }, [loadAlerts]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <div style={{
      height: 62,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 22px",
      background: C.bg,
      borderBottom: `1px solid ${C.line}`,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Button variant="ghost" ariaLabel="Toggle navigation" onClick={onToggleNav} style={{ width: 40, height: 40, padding: 6 }}>
          <Radio size={18} color={C.red} strokeWidth={2.4} />
        </Button>
        <div style={{ lineHeight: 1.2, minWidth: 0 }}>
          <div style={{
            fontFamily: fontMono,
            fontWeight: 800,
            fontSize: isMobile ? 15 : 18,
            color: C.text,
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}>
            <span style={{ background: C.blue, color: "#fff", padding: "1px 7px", borderRadius: 6, fontSize: 12, fontWeight: 900, letterSpacing: "0.05em" }}>AI</span>
            {isMobile ? "BEACON" : "BEACON.AI"}
          </div>
          {!isMobile && (
            <div className="meta" style={{
              letterSpacing: "0.02em",
              fontSize: 12,
              color: C.textDim,
              fontWeight: 600,
            }}>
              Emergency Escape & Hazard Intelligence
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 10 }}>
        {onHelp && (
          <Button variant="ghost" ariaLabel="Show tutorial" onClick={onHelp} style={{ width: 36, height: 36, padding: 6 }}>
            <HelpCircle size={18} color={C.textFaint} />
          </Button>
        )}
        <div className="mono meta" aria-hidden style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: C.panel2, borderRadius: 8, border: `1px solid ${C.line}` }}>
          <Compass size={14} color={loc.gpsStatus === "live" ? C.teal : C.textFaint} />
          <span style={{ color: C.text, fontWeight: 600 }}>{loc.coords}</span>
          {loc.gpsStatus === "live" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal }} />}
        </div>
        <Button variant="danger" ariaLabel="Open alerts" onClick={() => { onOpenAlert(); loadAlerts(); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "8px 10px" : "8px 14px", fontWeight: 700 }}>
          <Bell size={15} strokeWidth={2.4} aria-hidden />
          {!isMobile && <span aria-hidden>Active Alerts</span>}
          <span aria-live="polite" style={{
            background: "#fff",
            color: C.red,
            fontFamily: fontMono,
            fontWeight: 800,
            fontSize: 12,
            borderRadius: 10,
            padding: "1px 8px",
            marginLeft: 2,
          }}>{alertCount}</span>
        </Button>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="User menu"
            style={{
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.line}`,
              background: C.blue, color: "#fff", fontWeight: 800, fontSize: 14,
              fontFamily: fontMono, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            {initials}
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute", right: 0, top: "100%", marginTop: 8,
                background: C.panel, border: `1px solid ${C.line}`,
                borderRadius: 12, boxShadow: theme.S.lg, padding: 8,
                minWidth: 180, zIndex: 1000,
              }}
            >
              <div style={{ padding: "8px 12px", fontSize: 13, color: C.textDim, borderBottom: `1px solid ${C.lineSoft}`, marginBottom: 4 }}>
                {user?.email}
              </div>
              <button
                onClick={() => { setMenuOpen(false); if (onNavigate) onNavigate("profile"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 12px", borderRadius: 8, border: "none",
                  background: "none", color: C.text, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Settings size={14} /> Profile & Settings
              </button>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 12px", borderRadius: 8, border: "none",
                  background: "none", color: C.red, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SideNav({ active, onNavigate, collapsed, mobile = false, onClose }) {
  const primaryModules = MODULES.slice(0, 4);
  const monitoringModules = MODULES.slice(4);
  const loc = useLocation();
  const isMobile = useIsMobile();
  const showLabels = mobile ? true : !collapsed;

  const handleNav = (id) => {
    if (onNavigate) onNavigate(id);
    if (onClose) onClose();
  };

  const handleSos = async () => {
    if (typeof window === "undefined") return;
    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lon}`;
    const msg = `🚨 BEACON.AI SOS — My live location: ${mapsUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "SOS Location", text: msg });
      } else {
        await navigator.clipboard.writeText(msg);
      }
    } catch {}
  };

  const content = (
    <>
      {/* Category 1: Emergency & Assistant */}
      <div style={{
        fontFamily: fontMono,
        fontSize: 11,
        color: C.textFaint,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: showLabels ? "0 10px 6px" : "0 6px 6px",
        fontWeight: 700,
      }}>
        {showLabels ? "Emergency Navigation" : "AST"}
      </div>

      {primaryModules.map((m) => {
        const Icon = m.icon;
        const isActive = active === m.id;
        const toneColor = m.tag === "critical" ? C.red : m.tag === "warning" ? C.amber : C.teal;
        return (
          <Button
            key={m.id}
            onClick={() => handleNav(m.id)}
            title={m.label}
            ariaLabel={m.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: isActive ? C.tealDim : "transparent",
              border: `1px solid ${isActive ? C.teal : "transparent"}`,
              color: isActive ? C.teal : C.textDim,
              borderRadius: 10,
              padding: showLabels ? "10px 12px" : "10px 8px",
              textAlign: "left",
              justifyContent: showLabels ? "flex-start" : "center",
              fontSize: 14,
              fontWeight: isActive ? 800 : 600,
              minHeight: 44,
              transition: "all 0.15s ease",
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: isActive ? `${C.teal}22` : C.panel2,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon size={16} strokeWidth={2.2} color={isActive ? C.teal : C.textFaint} aria-hidden />
            </div>
            {showLabels && <span style={{ whiteSpace: "nowrap" }}>{m.short}</span>}
          </Button>
        );
      })}

      {/* Category 2: Hazard Monitoring */}
      <div style={{
        fontFamily: fontMono,
        fontSize: 11,
        color: C.textFaint,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: showLabels ? "12px 10px 6px" : "12px 6px 6px",
        fontWeight: 700,
      }}>
        {showLabels ? "GeoAI Hazard Sensors" : "MON"}
      </div>

      {monitoringModules.map((m) => {
        const Icon = m.icon;
        const isActive = active === m.id;
        const toneColor = m.tag === "critical" ? C.red : m.tag === "warning" ? C.amber : C.blue;
        return (
          <Button
            key={m.id}
            onClick={() => handleNav(m.id)}
            title={m.label}
            ariaLabel={m.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: isActive ? C.blueDim : "transparent",
              border: `1px solid ${isActive ? C.blue : "transparent"}`,
              color: isActive ? C.blue : C.textDim,
              borderRadius: 10,
              padding: showLabels ? "10px 12px" : "10px 8px",
              textAlign: "left",
              justifyContent: showLabels ? "flex-start" : "center",
              fontSize: 14,
              fontWeight: isActive ? 800 : 600,
              minHeight: 44,
              transition: "all 0.15s ease",
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: isActive ? `${C.blue}22` : C.panel2,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon size={16} strokeWidth={2.2} color={isActive ? C.blue : C.textFaint} aria-hidden />
            </div>
            {showLabels && <span style={{ whiteSpace: "nowrap" }}>{m.short}</span>}
          </Button>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* Profile & Settings */}
      <Button
        onClick={() => handleNav("profile")}
        ariaLabel="Profile and settings"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: active === "profile" ? C.blueDim : "transparent",
          border: `1px solid ${active === "profile" ? C.blue : "transparent"}`,
          color: active === "profile" ? C.blue : C.textDim,
          borderRadius: 10,
          padding: showLabels ? "10px 12px" : "10px 8px",
          textAlign: "left",
          justifyContent: showLabels ? "flex-start" : "center",
          fontSize: 14,
          fontWeight: active === "profile" ? 800 : 600,
          minHeight: 44,
          transition: "all 0.15s ease",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: active === "profile" ? `${C.blue}22` : C.panel2,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Settings size={16} strokeWidth={2.2} color={active === "profile" ? C.blue : C.textFaint} aria-hidden />
        </div>
        {showLabels && <span style={{ whiteSpace: "nowrap" }}>Settings</span>}
      </Button>

      {showLabels && (
        <div style={{
          margin: "12px 0 0",
          padding: "12px",
          borderRadius: 12,
          background: C.redDim,
          border: `1px solid ${C.red}44`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Radio size={16} color={C.red} className="animate-pulse" aria-hidden />
            <span style={{ fontSize: 13, fontWeight: 800, color: C.red }}>SOS Emergency</span>
          </div>
          <p style={{ fontSize: 11, color: C.textDim, margin: 0, lineHeight: 1.3 }}>
            Share your live location via your device share sheet or clipboard.
          </p>
          <Button
            variant="danger"
            onClick={handleSos}
            style={{ width: "100%", padding: "8px 12px", fontSize: 12, fontWeight: 800 }}
          >
            Share SOS Location
          </Button>
        </div>
      )}
    </>
  );

  if (mobile) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Navigation menu" style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex" }}>
        <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)" }} />
        <aside style={{
          position: "relative",
          width: "min(300px, 84vw)",
          height: "100%",
          background: C.panel,
          borderRight: `1px solid ${C.line}`,
          display: "flex",
          flexDirection: "column",
          padding: "16px 10px",
          gap: 6,
          overflowY: "auto",
          animation: "slideInRight 0.25s ease",
        }}>
          {content}
        </aside>
      </div>
    );
  }

  return (
    <nav aria-label="Primary modules" style={{
      width: collapsed ? theme.TOKENS.sizes.leftNavCollapsed : theme.TOKENS.sizes.leftNav,
      flexShrink: 0,
      background: C.panel,
      borderRight: `1px solid ${C.line}`,
      display: "flex",
      flexDirection: "column",
      padding: "16px 10px",
      gap: 6,
      transition: "width 0.2s ease",
      boxShadow: S.sm,
    }}>
      {content}
    </nav>
  );
}

export function AlertDrawer({ open, onClose }) {
  const loc = useLocation();
  const isMobile = useIsMobile();
  const [alerts, setAlerts] = useState([]);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const emergencyReq = fetch("/api/profiles/alert")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success === true && Array.isArray(d.data)) {
          return d.data.filter((a) => !a.acknowledged).map((a) => ({
            id: a.id,
            type: "emergency",
            headline: `🚨 Emergency alert from ${a.sender_name || "a family member"}`,
            areaDesc: a.message,
            severity: "severe",
            created_at: a.created_at,
          }));
        }
        return [];
      })
      .catch(() => []);

    const weatherReq = fetchWeatherAlerts(loc.lat, loc.lon)
      .then((d) => {
        if (d?.success) return (d.alerts || []).map((a) => ({ ...a, type: "weather" }));
        return [];
      })
      .catch(() => []);

    Promise.all([emergencyReq, weatherReq])
      .then(([em, w]) => {
        setAlerts(em);
        setWeatherAlerts(w);
        setError(null);
      })
      .catch(() => {
        setAlerts([]);
        setWeatherAlerts([]);
        setError("Failed to load alerts");
      })
      .finally(() => setLoading(false));
  }, [open, loc.lat, loc.lon]);

  if (!open) return null;

  const allAlerts = [...alerts, ...weatherAlerts];
  const toneFor = (a) => {
    if (a.type === "emergency") return "critical";
    const sev = (a.severity || "").toLowerCase();
    return sev === "extreme" || sev === "severe" ? "critical" : "warning";
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Active alerts" style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)" }} />
      <aside style={{
        position: "relative",
        width: isMobile ? "100%" : 420,
        background: C.panel,
        borderLeft: `1px solid ${C.line}`,
        height: "100%",
        padding: isMobile ? 16 : 24,
        overflowY: "auto",
        animation: "slideIn 0.2s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: fontMono, fontWeight: 700, fontSize: 18, color: C.text }}>Active alerts</h2>
          <Button variant="ghost" ariaLabel="Close alerts" onClick={onClose} style={{ padding: 6, minHeight: 40 }}>
            <X size={18} />
          </Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && (
            <div style={{ fontSize: 13, color: C.textFaint, textAlign: "center", padding: 24 }}>Loading alerts...</div>
          )}
          {!loading && allAlerts.length === 0 && (
            <div style={{ fontSize: 13, color: C.textFaint, textAlign: "center", padding: 24, lineHeight: 1.6 }}>
              {error || "No active alerts for your area."}
            </div>
          )}
          {allAlerts.map((a, i) => {
            const tone = toneFor(a);
            const tc = tone === "critical" ? C.red : C.amber;
            return (
              <div key={a.id || `alert-${i}`} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                background: C.panel2, border: `1px solid ${a.type === "emergency" ? C.red + "44" : C.line}`, borderRadius: 12,
                padding: 16,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${tc}22`, display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={18} color={tc} aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: C.text, fontWeight: 600, lineHeight: 1.4 }}>{a.headline || a.type || "Weather alert"}</div>
                  {a.areaDesc && <div className="mono meta" style={{ marginTop: 6 }}>{a.areaDesc}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
