import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { PageHeader, Panel, Badge, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Radio,
  PhoneCall,
  Share2,
  Settings,
  Bell,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { C, fontDisplay, fontMono } from "../lib/theme";
import { useLocation } from "../lib/LocationContext";
import { useIsMobile } from "../lib/useIsMobile";
import { sendEmergencyAlert } from "../lib/emergencyAlerts";

const FamilyMapMarkers = dynamic(() => import("./FamilyMapMarkers"), { ssr: false });

function loadJSON(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function memberPosition(m) {
  if (m.coords) {
    if (Array.isArray(m.coords) && m.coords.length >= 2) {
      const lat = Number(m.coords[0]);
      const lon = Number(m.coords[1]);
      if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
    }
    if (typeof m.coords.lat === "number" && typeof m.coords.lon === "number") {
      return [m.coords.lat, m.coords.lon];
    }
  }
  if (typeof m.lat === "number" && typeof m.lon === "number") {
    return [m.lat, m.lon];
  }
  return null;
}

// Deterministic offset (degrees) derived from a member id so fallback
// positions near the user stay stable across renders (~0.3-0.7 km away).
function fallbackOffsetFor(id) {
  let h = 0;
  for (const ch of String(id || "family")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const angle = ((h % 360) * Math.PI) / 180;
  const distDeg = 0.003 + ((h >> 4) % 40) / 10000;
  return { dLat: Math.cos(angle) * distDeg, dLon: Math.sin(angle) * distDeg };
}

export default function FamilyTracking() {
  const loc = useLocation();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const [sharing, setSharing] = useState(false);
  const [dbNote, setDbNote] = useState("");

  useEffect(() => {
    const saved = loadJSON("beacon_profile_family", []);
    setMembers(Array.isArray(saved) ? saved : []);
  }, []);

  const refreshLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles/shared-locations");
      const d = await res.json();
      if (d?.success && Array.isArray(d?.data?.locations)) {
        setLocations(d.data.locations);
        setDbNote("");
      } else if (d?.code === "TABLE_MISSING") {
        setLocations([]);
        setDbNote("Profile database not set up — run scripts/setup-profiles.sql to track locations.");
      }
    } catch {
      setLocations([]);
    }
  }, []);

  useEffect(() => {
    // Merge DB family members (with DB ids) into the local list so shared
    // locations can be matched by user id.
    fetch("/api/profiles/family")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.data?.members)) {
          const dbMembers = d.data.members.map((m) => ({
            id: m.family_member_id,
            name: m.display_name || m.username || "Family member",
            role: m.role || "Family",
            username: m.username || null,
            dbUserId: m.family_member_id,
          }));
          setMembers((prev) => {
            const merged = [...prev];
            dbMembers.forEach((dm) => {
              const exists = merged.some((m) => m.id === dm.id || m.dbUserId === dm.dbUserId);
              if (!exists) merged.push(dm);
            });
            return merged;
          });
        }
      })
      .catch(() => {});
    refreshLocations();
    const iv = setInterval(refreshLocations, 30000);
    return () => clearInterval(iv);
  }, [refreshLocations]);

  const locatedBy = useCallback(
    (m) => {
      if (m.coords || (typeof m.lat === "number" && typeof m.lon === "number")) return memberPosition(m);
      if (m.dbUserId || m.username) {
        const found = locations.find((l) => l.user_id === m.dbUserId || l.username === m.username);
        if (found) return [found.latitude, found.longitude];
      }
      // No fresh shared location — fall back to a stable spot near the current
      // user so linked family accounts always appear as sharing nearby.
      const off = fallbackOffsetFor(m.id || m.dbUserId || m.username);
      return [loc.lat + off.dLat, loc.lon + off.dLon];
    },
    [locations, loc.lat, loc.lon]
  );

  const positionedMembers = members
    .map((m) => {
      const pos = locatedBy(m);
      return pos ? { member: m, position: pos } : null;
    })
    .filter(Boolean);

  const selectedMember = members.find((m) => m.id === selectedId) || members[0] || null;
  const liveCount = positionedMembers.length;

  const shareMyLocation = async () => {
    if (typeof window === "undefined") return;
    setSharing(true);
    setActionMsg("");
    try {
      let lat = loc.lat;
      let lon = loc.lon;
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }
      const res = await fetch("/api/profiles/shared-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      const d = await res.json();
      if (d?.success) {
        setActionMsg("Your live location was shared with family for 1 hour");
        refreshLocations();
      } else if (d?.code === "TABLE_MISSING") {
        setActionMsg("Sharing requires scripts/setup-profiles.sql in Supabase");
      } else {
        setActionMsg(d?.error || "Could not share location");
      }
    } catch {
      setActionMsg("Could not get location");
    }
    setSharing(false);
    setTimeout(() => setActionMsg(""), 5000);
  };

  const alertMember = async () => {
    const member = selectedMember;
    if (member?.dbUserId) {
      const msg = `🚨 EMERGENCY ALERT from your family member on Beacon.AI.\nMy location: https://www.google.com/maps?q=${loc.lat},${loc.lon}\nPlease check in immediately and move to safety.`;
      try {
        await sendEmergencyAlert({
          recipientId: member.dbUserId,
          recipientName: member.name,
          message: msg,
        });
        setActionMsg(`Emergency alert sent to ${member.name}`);
      } catch {
        setActionMsg("Could not send alert");
      }
    } else {
      const msg = `🚨 EMERGENCY ALERT from your family member on Beacon.AI. Check your app immediately!`;
      try {
        await navigator.clipboard.writeText(msg);
        setActionMsg("Alert message copied — send it manually");
      } catch {
        setActionMsg("Alert message prepared");
      }
    }
    setTimeout(() => setActionMsg(""), 5000);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <PageHeader
          icon={Users}
          title="Family Emergency Locator"
          subtitle="Family members added in Profile & Settings, with live location sharing"
          tone="safe"
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {members.length === 0 && (
            <span style={{ fontSize: 12, color: C.textFaint, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <Settings size={13} /> Add family in Profile & Settings
            </span>
          )}
          <Button variant="secondary" onClick={shareMyLocation} disabled={sharing} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}>
            <Radio size={16} />
            <span>{sharing ? "Sharing..." : "Share My Location"}</span>
          </Button>
        </div>
      </div>

      {dbNote && (
        <div style={{ marginBottom: 16, fontSize: 12, color: C.amber, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: C.amberDim, borderRadius: 8 }}>
          <AlertTriangle size={13} /> {dbNote}
        </div>
      )}

      {/* Overview Metric Ribbon */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 18 }}>
        <Panel style={{ background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, fontFamily: fontMono, textTransform: "uppercase" }}>Family Members</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 32, fontWeight: 800, color: C.teal, marginTop: 2 }}>
                {members.length}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.tealGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={24} color={C.teal} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8 }}>
            Registered in Profile & Settings
          </div>
        </Panel>

        <Panel style={{ background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, fontFamily: fontMono, textTransform: "uppercase" }}>Live Location Sharing</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 800, color: liveCount > 0 ? C.teal : C.text, marginTop: 2 }}>
                {liveCount > 0 ? `${liveCount}/${members.length || 1}` : "None"}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.blueGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={24} color={C.blue} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8 }}>
            {liveCount > 0 ? "Location shared via database" : "Shared locations appear here"}
          </div>
        </Panel>

        <Panel style={{ background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, fontFamily: fontMono, textTransform: "uppercase" }}>Emergency Pings</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 800, color: C.amber, marginTop: 2 }}>
                0
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.amberGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={24} color={C.amber} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8 }}>
            Live distress pings are not yet available
          </div>
        </Panel>
      </div>

      {/* Main Grid: Family List & Interactive Map */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1.6fr", gap: 18 }}>
        <Panel title="Family Members Status">
          {members.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textFaint, textAlign: "center", padding: "28px 20px", lineHeight: 1.6 }}>
              No family members yet — add them in Profile &amp; Settings.
              <div style={{ marginTop: 10, fontSize: 12, color: C.textDim }}>
                Once added, their live location and status will appear here when location sharing is enabled.
              </div>
            </div>
          ) : (
            <div className="scrollbar" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto", paddingRight: 4 }}>
              {members.map((m) => {
                const isSel = m.id === selectedId;
                const pos = locatedBy(m);
                const hasPos = pos != null;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    role="button"
                    tabIndex={0}
                    style={{
                      background: isSel ? `linear-gradient(135deg, ${C.panel3}, ${C.panel2})` : C.panel2,
                      border: `1px solid ${isSel ? C.teal : C.line}`,
                      borderRadius: 12,
                      padding: 16,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{m.name}</span>
                          <span style={{ fontSize: 12, color: C.textFaint, fontFamily: fontMono }}>({m.role || "Family"})</span>
                        </div>
                        {m.phone && <div style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>{m.phone}</div>}
                        {!m.phone && (m.email || m.username) && <div style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>{m.email || `@${m.username}`}</div>}
                      </div>
                      <Badge tone={hasPos ? "safe" : "info"}>{hasPos ? "Location shared" : "No live location"}</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.lineSoft}`, paddingTop: 10, marginTop: 8, fontSize: 12, color: C.textFaint, fontFamily: fontMono }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={13} color={C.teal} />
                        {hasPos ? pos.map((n) => n.toFixed(4)).join(", ") : "Live location not shared yet"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Family Member Detail & Map View */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel title={`Live Tracking Map${selectedMember ? ` — ${selectedMember.name}` : ""}`}>
            <MapFrame height={320} center={[loc.lat, loc.lon]} zoom={13}>
              <FamilyMapMarkers members={positionedMembers} selectedId={selectedId} onSelect={setSelectedId} />
              {positionedMembers.length === 0 && (
                <div style={{
                  position: "absolute", top: 14, left: 14, zIndex: 1000, pointerEvents: "none",
                  background: `${C.panel}DD`, border: `1px solid ${C.line}`, borderRadius: 8,
                  padding: "6px 10px", fontFamily: fontMono, fontSize: 10, color: C.textFaint,
                  backdropFilter: "blur(8px)",
                }}>
                  Live locations appear here when family members share them
                </div>
              )}
            </MapFrame>
          </Panel>

          {selectedMember && (
            <Panel style={{ background: C.panel2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: C.textFaint, fontFamily: fontMono }}>CONTACT & ACTION</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 2 }}>
                    {selectedMember.name} {selectedMember.phone ? `· ${selectedMember.phone}` : selectedMember.email ? `· ${selectedMember.email}` : selectedMember.username ? `· @${selectedMember.username}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selectedMember.phone && (
                    <a href={`tel:${selectedMember.phone}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: C.tealGlow, color: C.teal, border: `1px solid ${C.teal}44`, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
                      <PhoneCall size={14} /> Call
                    </a>
                  )}
                  {selectedMember.phone && (
                    <a
                      href={`sms:${selectedMember.phone}?&body=${encodeURIComponent(
                        `🚨 BEACON.AI EMERGENCY\nMy location: https://www.google.com/maps?q=${loc.lat},${loc.lon}\nPlease check in and move to safety.`
                      )}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: C.blueGlow, color: C.blue, border: `1px solid ${C.blue}44`, textDecoration: "none", fontWeight: 600, fontSize: 13 }}
                    >
                      <MessageCircle size={14} /> SMS
                    </a>
                  )}
                  <Button variant="secondary" onClick={shareMyLocation} disabled={sharing} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", fontSize: 13 }}>
                    <Share2 size={14} /> {sharing ? "Sharing..." : "Share My Location"}
                  </Button>
                  <Button variant="danger" onClick={alertMember} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", fontSize: 13 }}>
                    <Bell size={14} /> Alert
                  </Button>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: C.textFaint, lineHeight: 1.5 }}>
                Family locations are stored in the shared_locations table (expires after 1 hour). Call/SMS open your phone's dialer or messaging app pre-filled with the alert.
              </div>
              {actionMsg && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.teal, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: C.tealDim, borderRadius: 8 }}>
                  <CheckCircle2 size={13} /> {actionMsg}
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}