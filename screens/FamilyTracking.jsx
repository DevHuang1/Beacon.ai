import React, { useState } from "react";
import { PageHeader, Panel, Badge, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import SvgOverlayContent from "../components/SvgOverlayContent";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Navigation,
  Battery,
  MapPin,
  Clock,
  Radio,
  Send,
  Heart,
  CheckCircle2,
  PhoneCall,
  Share2,
  Zap,
} from "lucide-react";
import { C, fontDisplay, fontMono } from "../lib/theme";

const INITIAL_MEMBERS = [
  {
    id: "m1",
    name: "Sarah Chen",
    role: "Daughter (16)",
    status: "safe",
    statusText: "Reached Shelter",
    shelter: "Civic Community Center Shelter",
    dist: "1.2 km away",
    battery: 88,
    lastPing: "2 mins ago",
    coords: [40.806, -124.161],
    phone: "(555) 234-5678",
  },
  {
    id: "m2",
    name: "Mark Chen",
    role: "Spouse",
    status: "in_transit",
    statusText: "Evacuating Zone B",
    shelter: "Heading to High School Gym",
    dist: "2.8 km away",
    battery: 64,
    lastPing: " Just now",
    coords: [40.798, -124.155],
    phone: "(555) 345-6789",
  },
  {
    id: "m3",
    name: "Elena Chen",
    role: "Grandmother",
    status: "safe",
    statusText: "Safe at Home",
    shelter: "Second Floor Annex (Elevated)",
    dist: "0.5 km away",
    battery: 95,
    lastPing: "5 mins ago",
    coords: [40.803, -124.165],
    phone: "(555) 876-5432",
  },
  {
    id: "m4",
    name: "Liam Chen",
    role: "Son (12)",
    status: "warning",
    statusText: "Near Flood Risk Zone",
    shelter: "Assisted Transport Dispatched",
    dist: "3.4 km away",
    battery: 29,
    lastPing: "1 min ago",
    coords: [40.791, -124.172],
    phone: "(555) 456-7890",
  },
];

export default function FamilyTracking() {
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [selectedId, setSelectedId] = useState("m1");
  const [pingSent, setPingSent] = useState(false);
  const [myStatus, setMyStatus] = useState("safe");

  const selectedMember = members.find((m) => m.id === selectedId) || members[0];

  const handleSendPing = () => {
    setPingSent(true);
    setTimeout(() => setPingSent(false), 3000);
  };

  const handleToggleMyStatus = () => {
    setMyStatus((prev) => (prev === "safe" ? "in_transit" : prev === "in_transit" ? "warning" : "safe"));
  };

  const safeCount = members.filter((m) => m.status === "safe").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <PageHeader
          icon={Users}
          title="Family Emergency Locator"
          subtitle="Real-time check-ins, shelter verification, and distress pings for your family"
          tone="safe"
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button
            variant={myStatus === "safe" ? "success" : myStatus === "warning" ? "danger" : "secondary"}
            onClick={handleToggleMyStatus}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}
          >
            <CheckCircle2 size={16} />
            <span>My Status: <strong>{myStatus.toUpperCase()}</strong></span>
          </Button>

          <Button variant="primary" onClick={handleSendPing} disabled={pingSent} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}>
            <Radio size={16} className={pingSent ? "animate-spin" : ""} />
            <span>{pingSent ? "Ping Broadcasted!" : "Request Location Ping"}</span>
          </Button>
        </div>
      </div>

      {/* Overview Metric Ribbon */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 18 }}>
        <Panel style={{ background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, fontFamily: fontMono, textTransform: "uppercase" }}>Family Safety Level</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 32, fontWeight: 800, color: C.teal, marginTop: 2 }}>
                {safeCount}/{members.length} SAFE
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.tealGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={24} color={C.teal} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8 }}>
            3 verified at shelters or safe elevated points
          </div>
        </Panel>

        <Panel style={{ background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, fontFamily: fontMono, textTransform: "uppercase" }}>Nearest Shelter Target</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 800, color: C.text, marginTop: 2 }}>
                Civic Gym (1.2 km)
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.blueGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={24} color={C.blue} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8 }}>
            Designated family rendezvous zone
          </div>
        </Panel>

        <Panel style={{ background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, fontFamily: fontMono, textTransform: "uppercase" }}>Pings & Battery Sync</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 800, color: C.amber, marginTop: 2 }}>
                1 Attention Needed
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.amberGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={24} color={C.amber} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8 }}>
            Liam: Battery 29% near flood warning area
          </div>
        </Panel>
      </div>

      {/* Main Grid: Family List & Interactive Map */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr", gap: 18 }}>
        <Panel title="Family Members Status">
          <div className="scrollbar" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto", paddingRight: 4 }}>
            {members.map((m) => {
              const isSel = m.id === selectedId;
              const tone = m.status === "safe" ? "safe" : m.status === "in_transit" ? "info" : "critical";
              const badgeColor = m.status === "safe" ? C.teal : m.status === "in_transit" ? C.blue : C.red;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  role="button"
                  tabIndex={0}
                  style={{
                    background: isSel ? `linear-gradient(135deg, ${C.panel3}, ${C.panel2})` : C.panel2,
                    border: `1px solid ${isSel ? badgeColor : C.line}`,
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
                        <span style={{ fontSize: 12, color: C.textFaint, fontFamily: fontMono }}>({m.role})</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>{m.shelter}</div>
                    </div>
                    <Badge tone={tone}>{m.statusText}</Badge>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.lineSoft}`, paddingTop: 10, marginTop: 8, fontSize: 12, color: C.textFaint, fontFamily: fontMono }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={13} color={C.teal} /> {m.dist}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Battery size={13} color={m.battery < 30 ? C.red : C.teal} /> {m.battery}%
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={13} /> {m.lastPing}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Family Member Detail & Map View */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel title={`Live Tracking Map — ${selectedMember.name}`}>
            <MapFrame height={320}>
              <SvgOverlayContent>
                <rect x="0" y="0" width="100%" height="100%" fill="#E2E8F0" />
                <circle cx="200" cy="160" r="110" fill={C.tealGlow} stroke={C.teal} strokeDasharray="4 4" strokeWidth="1.5" />
                <text x="200" y="42" fontFamily={fontMono} fontSize="11" fill={C.teal} fontWeight="800" textAnchor="middle">
                  SAFE PERIMETER (1.5 km)
                </text>

                {members.map((m, i) => {
                  const cx = 100 + i * 80;
                  const cy = 120 + (i % 2) * 80;
                  const color = m.status === "safe" ? C.teal : m.status === "in_transit" ? C.blue : C.red;
                  const isSelected = m.id === selectedId;

                  return (
                    <g key={m.id} onClick={() => setSelectedId(m.id)} style={{ cursor: "pointer" }}>
                      {isSelected && <circle cx={cx} cy={cy} r="18" fill={`${color}33`} className="animate-pulse" />}
                      <circle cx={cx} cy={cy} r="10" fill={color} stroke={C.bg} strokeWidth="3" />
                      <text x={cx} y={cy + 24} fontFamily={fontDisplay} fontSize="12" fill={C.text} fontWeight="700" textAnchor="middle">
                        {m.name.split(" ")[0]}
                      </text>
                    </g>
                  );
                })}
              </SvgOverlayContent>
            </MapFrame>
          </Panel>

          <Panel style={{ background: C.panel2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: C.textFaint, fontFamily: fontMono }}>CONTACT & ACTION</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 2 }}>
                  {selectedMember.name} &middot; {selectedMember.phone}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={`tel:${selectedMember.phone}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: C.tealGlow,
                    color: C.teal,
                    border: `1px solid ${C.teal}44`,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <PhoneCall size={14} /> Call
                </a>
                <Button variant="secondary" onClick={() => alert(`Directions requested to ${selectedMember.name}'s last known location.`)}>
                  <Navigation size={14} /> Route
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
