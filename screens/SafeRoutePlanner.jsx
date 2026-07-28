import React, { useState } from "react";
import { PageHeader, Panel, Button, Badge } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import {
  Search, LocateFixed, MapPin, Route, ArrowRight, ShieldCheck, AlertOctagon,
  Sparkles, CheckCircle2, Navigation, Eye, AlertTriangle, Layers
} from "lucide-react";
import { C, S, fontMono, fontDisplay } from "../lib/theme";

export default function SafeRoutePlanner() {
  const [start, setStart] = useState("Current GPS Location (40.802°N, 124.163°W)");
  const [dest, setDest] = useState("Eureka High School Emergency Shelter");
  const [avoidFloods, setAvoidFloods] = useState(true);
  const [avoidLandslides, setAvoidLandslides] = useState(true);
  const [selectedRouteOption, setSelectedRouteOption] = useState("safe");
  const [searched, setSearched] = useState(true);

  const routeOptions = [
    {
      id: "safe",
      name: "AI Safe Evacuation Route",
      badge: "RECOMMENDED",
      tone: "safe",
      distance: "2.8 km",
      duration: "9 mins",
      safetyScore: "98% SAFE",
      hazardsBypassed: ["Avoids Flooded Creek Crossing at 5th St", "Bypasses Unstable Slope on Hillside Dr"],
      pathColor: C.teal,
      notes: "Elevated path along Ridge Parkway with emergency lighting & cell coverage",
    },
    {
      id: "standard",
      name: "Standard GPS Direct Route",
      badge: "DANGEROUS",
      tone: "critical",
      distance: "2.1 km",
      duration: "6 mins",
      safetyScore: "35% RISK",
      hazardsBypassed: [],
      pathColor: C.red,
      notes: "⚠️ Standard GPS directs through active 0.6m deep flood water on Main St",
    },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <PageHeader
        icon={Route}
        title="Safe Route Optimization Engine"
        subtitle="Generates evacuation routes by combining GeoAI hazard maps, USGS gauges, and real-time road closures"
        tone="info"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel title="Route Parameters">
            <form aria-label="Safe route form" onSubmit={(e) => { e.preventDefault(); setSearched(true); }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ position: "relative" }}>
                  <LocateFixed size={16} color={C.teal} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} aria-hidden />
                  <label htmlFor="start" className="mono" style={{ display: "none" }}>Start</label>
                  <input
                    id="start" value={start} onChange={(e) => setStart(e.target.value)}
                    placeholder="Start location" aria-label="Start location"
                    style={{
                      width: "100%", background: C.panel2, border: `1px solid ${C.line}`,
                      borderRadius: 10, padding: "12px 16px 12px 40px", color: C.text, fontSize: 13,
                    }}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <MapPin size={16} color={C.red} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} aria-hidden />
                  <label htmlFor="dest" className="mono" style={{ display: "none" }}>Destination</label>
                  <input
                    id="dest" value={dest} onChange={(e) => setDest(e.target.value)}
                    placeholder="Destination" aria-label="Destination"
                    style={{
                      width: "100%", background: C.panel2, border: `1px solid ${C.line}`,
                      borderRadius: 10, padding: "12px 16px 12px 40px", color: C.text, fontSize: 13,
                    }}
                  />
                </div>

                {/* Hazard Avoidance Filters */}
                <div style={{ padding: 12, background: C.panel2, borderRadius: 10, border: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 12, fontFamily: fontMono, color: C.textFaint, textTransform: "uppercase", marginBottom: 8 }}>
                    Hazard Avoidance Filters
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text, cursor: "pointer" }}>
                      <input type="checkbox" checked={avoidFloods} onChange={(e) => setAvoidFloods(e.target.checked)} style={{ accentColor: C.teal }} />
                      Bypass Flood Inundation Zones
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text, cursor: "pointer" }}>
                      <input type="checkbox" checked={avoidLandslides} onChange={(e) => setAvoidLandslides(e.target.checked)} style={{ accentColor: C.teal }} />
                      Avoid Unstable Slope & Landslide Slopes
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Button type="submit" ariaLabel="Find safe route" style={{ flex: 1, padding: "12px 20px", fontWeight: 700 }}>
                    <Sparkles size={16} /> Recalculate AI Safe Route
                  </Button>
                </div>
              </div>
            </form>
          </Panel>

          {/* Route Comparison Options */}
          {searched && (
            <Panel title="Route Comparison" role="region" aria-live="polite">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {routeOptions.map((opt) => {
                  const isSel = selectedRouteOption === opt.id;
                  const isSafe = opt.id === "safe";

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedRouteOption(opt.id)}
                      role="button" tabIndex={0}
                      style={{
                        background: isSel ? (isSafe ? C.tealDim : C.redDim) : C.panel2,
                        border: `1.5px solid ${isSel ? (isSafe ? C.teal : C.red) : C.line}`,
                        borderRadius: 12,
                        padding: 14,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{opt.name}</span>
                        <Badge tone={opt.tone}>{opt.badge}</Badge>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 13, fontFamily: fontMono }}>
                        <span style={{ color: opt.pathColor, fontWeight: 700 }}>{opt.distance} &middot; {opt.duration}</span>
                        <span style={{ color: isSafe ? C.teal : C.red, fontWeight: 700 }}>{opt.safetyScore}</span>
                      </div>

                      <div style={{ fontSize: 12, color: C.textDim, marginTop: 8, lineHeight: 1.4 }}>
                        {opt.notes}
                      </div>

                      {opt.hazardsBypassed.length > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.lineSoft}` }}>
                          {opt.hazardsBypassed.map((h, i) => (
                            <div key={i} style={{ fontSize: 11, color: C.teal, display: "flex", alignItems: "center", gap: 4 }}>
                              <ShieldCheck size={12} /> {h}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>

        {/* Map & Turn-by-Turn Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
            <MapFrame height={400}>
              <rect x="0" y="0" width="100%" height="100%" fill="#E2E8F0" />
              {/* Draw danger zone hazard polygon */}
              <polygon points="120,180 240,160 220,260 110,240" fill={`${C.red}33`} stroke={C.red} strokeDasharray="4 4" strokeWidth="2" />
              <text x="170" y="215" fontFamily={fontMono} fontSize="11" fill={C.red} fontWeight="700" textAnchor="middle">
                DANGER: FLOOD ZONE (0.6m)
              </text>

              {/* Standard Route (Red - through hazard) */}
              <path d="M 60,300 L 170,215 L 340,90" fill="none" stroke={selectedRouteOption === "standard" ? C.red : `${C.red}44`} strokeWidth={selectedRouteOption === "standard" ? "5" : "2.5"} strokeDasharray={selectedRouteOption === "standard" ? undefined : "4 4"} />

              {/* AI Safe Route (Teal - bypassing hazard) */}
              <path d="M 60,300 L 80,120 L 220,70 L 340,90" fill="none" stroke={selectedRouteOption === "safe" ? C.teal : `${C.teal}44`} strokeWidth={selectedRouteOption === "safe" ? "5" : "2.5"} />

              {/* Waypoint Markers */}
              <circle cx="60" cy="300" r="8" fill={C.teal} />
              <text x="60" y="322" fontFamily={fontMono} fontSize="10" fill={C.text} textAnchor="middle">START</text>

              <circle cx="340" cy="90" r="8" fill={C.amber} />
              <text x="340" y="75" fontFamily={fontMono} fontSize="10" fill={C.amber} textAnchor="middle">SHELTER</text>
            </MapFrame>

            <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.line}`, background: C.panel2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.text }}>
                <Navigation size={16} color={C.teal} />
                <span>Active Route: <strong>{selectedRouteOption === "safe" ? "AI Safe Evacuation Route" : "Standard Direct Route"}</strong></span>
              </div>
              <Button variant="success" style={{ padding: "8px 16px", fontWeight: 700 }} onClick={() => alert("Navigation started! Audio guidance enabled.")}>
                Start Turn-by-Turn GPS
              </Button>
            </div>
          </Panel>

          {/* Turn-by-Turn Steps */}
          <Panel title="Turn-by-Turn Evacuation Steps">
            <div className="scrollbar" style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { step: "1", text: "Head north on Ridge Parkway away from low-lying valley", dist: "0.8 km", note: "Elevated path" },
                { step: "2", text: "Turn right onto Highland Blvd (Avoid 5th St Bridge)", dist: "1.2 km", note: "Bypasses flood zone" },
                { step: "3", text: "Continue straight on Crestview Ave directly to High School Gym", dist: "0.8 km", note: "Shelter entrance ahead" },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: C.panel2, borderRadius: 8, border: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: C.tealGlow, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, fontFamily: fontMono }}>
                      {s.step}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.text}</div>
                      <div style={{ fontSize: 11, color: C.textFaint }}>{s.note}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: fontMono, color: C.textDim, fontWeight: 700 }}>{s.dist}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

