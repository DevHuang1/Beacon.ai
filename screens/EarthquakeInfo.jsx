import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { PageHeader, Panel, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import { Activity, Satellite, ToggleLeft, ToggleRight, Clock, ExternalLink, CheckCircle2, Phone } from "lucide-react";
import { C, fontDisplay, fontMono } from "../lib/theme";
import { api } from "../lib/api";
import { useLocation } from "../lib/LocationContext";
import { useIsMobile } from "../lib/useIsMobile";

const QuakeMapMarkers = dynamic(() => import("./QuakeMapMarkers"), { ssr: false });

const DAMAGE_COLORS = { new_construction: C.amber, deforestation: C.red, flooding: C.blue };

export default function EarthquakeInfo() {
  const loc = useLocation();
  const isMobile = useIsMobile();
  const [minMag, setMinMag] = useState(0);
  const [tab, setTab] = useState("recent");
  const [quakes, setQuakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [damageMode, setDamageMode] = useState(false);
  const [damageData, setDamageData] = useState(null);
  const [damageLoading, setDamageLoading] = useState(false);
  const [damageError, setDamageError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.earthquake.recent(0, 24, loc.lat, loc.lon).then((res) => {
      if (res?.success) {
        setQuakes(res.data?.events || []);
        setError(null);
      } else {
        setQuakes([]);
        setError(res?.error || "Failed to load earthquake data");
      }
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [loc.lat, loc.lon]);

  useEffect(() => {
    if (!damageMode || tab !== "recent") { setDamageData(null); setDamageError(null); return; }
    setDamageLoading(true);
    setDamageError(null);
    api.geoai.change({ before: {}, after: {} }).then((res) => {
      if (res?.success) {
        setDamageData(res.data);
      } else {
        setDamageData(null);
        setDamageError(res?.error || "Damage assessment failed");
      }
    }).catch((err) => {
      setDamageData(null);
      setDamageError(err.message || "Damage assessment failed");
    }).finally(() => setDamageLoading(false));
  }, [damageMode, tab]);

  const filtered = quakes.filter((e) => e.mag >= minMag);
  const levelColor = { major: C.red, moderate: C.amber, light: C.blue };
  const levelBg = { major: C.redGlow, moderate: C.amberGlow, light: C.blueGlow };

  const damageGeo = damageMode && damageData?.type === "FeatureCollection" ? damageData : null;
  const damageStyle = (f) => ({ color: DAMAGE_COLORS[f.properties.type] || C.amber, weight: 2, fillColor: DAMAGE_COLORS[f.properties.type] || C.amber, fillOpacity: 0.15 });

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <PageHeader icon={Activity} title="Earthquake information" subtitle="Real-time seismic events from the USGS feed" tone="info" />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <Button
            variant={damageMode ? "primary" : "ghost"}
            ariaLabel="Toggle damage assessment"
            onClick={() => setDamageMode((v) => !v)}
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, gap: 6 }}
          >
            {damageMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            <Satellite size={14} />
            Damage
          </Button>
          <div style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, fontFamily: fontMono, color: C.textFaint, whiteSpace: "nowrap", marginTop: 6 }}>
            <span style={{ color: C.teal }}>&#9654;</span> Drag magnitude slider
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {["recent", "safety", "contacts"].map((t) => (
          <Button key={t} variant={tab === t ? "primary" : "ghost"} onClick={() => setTab(t)} ariaLabel={`Switch to ${t} tab`} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, textTransform: "capitalize", borderRadius: 10 }}>
            {t === "recent" ? "Recent quakes" : t === "safety" ? "Safety tips" : "Emergency contacts"}
          </Button>
        ))}
      </div>

      {tab === "recent" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.5fr", gap: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, padding: "12px 16px", background: C.panel2, borderRadius: 10, border: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 13, color: C.textDim, fontWeight: 500 }}>Min magnitude</span>
              <input type="range" min="0" max="6" step="0.5" value={minMag} onChange={(e) => setMinMag(parseFloat(e.target.value))} style={{ flex: 1, accentColor: C.blue, height: 4 }} />
              <span style={{ fontFamily: fontMono, fontSize: 15, color: C.text, fontWeight: 700, minWidth: 36, textAlign: "right" }}>{minMag.toFixed(1)}</span>
            </div>

            {error && (
              <div style={{ background: C.redDim, border: `1px solid ${C.red}55`, borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 13, color: C.red, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
                {error}
              </div>
            )}

            {damageMode && (damageLoading || damageError) && (
              <div style={{ background: C.amberDim, border: `1px solid ${C.amber}55`, borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 13, color: C.amber, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, flexShrink: 0 }} />
                {damageLoading
                  ? "Requesting satellite damage assessment..."
                  : `Damage assessment requires before/after satellite images — GeoAI service returned: ${damageError}`}
              </div>
            )}

            {damageData && (
              <div style={{ background: C.amberGlow, border: `1px solid ${C.amber}55`, borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.amber, marginBottom: 4 }}>Damage assessment</div>
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>
                  Change detected: <strong style={{ color: C.amber }}>{damageData.change_pct}%</strong> of area affected.
                  {damageData.significant && " Significant change detected."}
                </div>
                {damageData.changes?.map((c) => (
                  <div key={c.type} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textDim, marginTop: 6, padding: "4px 0", borderTop: `1px solid ${C.lineSoft}` }}>
                    <span style={{ textTransform: "capitalize" }}>{c.type.replace(/_/g, " ")}</span>
                    <span style={{ fontFamily: fontMono, color: C.text, fontWeight: 600 }}>{(c.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="scrollbar" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto", paddingRight: 6 }}>
              {loading && [1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 68, borderRadius: 10 }} />
              ))}
              {!loading && filtered.length === 0 && (
                <div style={{ color: C.textFaint, fontSize: 14, textAlign: "center", padding: 30 }}>
                  No earthquakes recorded near you in the last 24 hours.
                </div>
              )}
              {filtered.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", animation: `slideUp 0.25s ease ${i * 0.05}s both`, transition: "border-color 0.15s" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: levelBg[e.level] || C.blueGlow, color: levelColor[e.level] || C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, flexShrink: 0 }}>{e.mag}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: C.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.place}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                      <span style={{ fontFamily: fontMono, fontSize: 11, color: C.textFaint }}>Depth {e.depth}</span>
                      <span style={{ fontFamily: fontMono, fontSize: 11, color: C.textFaint, display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} />{e.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Panel style={{ padding: 0, overflow: "hidden", borderRadius: 14, position: "relative" }}>
            <MapFrame height={520} geojson={damageGeo} geoStyle={damageStyle}>
              <QuakeMapMarkers quakes={filtered} />
            </MapFrame>
            <div style={{
              position: "absolute", top: 14, left: 14, zIndex: 1000, pointerEvents: "none",
              background: `${C.panel}DD`, border: `1px solid ${C.line}`, borderRadius: 8,
              padding: "6px 10px", fontFamily: fontMono, fontSize: 10, color: C.textFaint,
              backdropFilter: "blur(8px)",
            }}>
              {damageMode ? "Damage assessment requires real geometry — none returned" : `${filtered.length} events · USGS`}
            </div>
          </Panel>
        </div>
      )}

      {tab === "safety" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {[["Drop, cover, hold on", "Get under sturdy furniture and hold on until shaking stops."],
            ["Stay away from windows", "Glass, mirrors, pictures, and heavy fixtures pose the greatest indoor risk."],
            ["If outdoors, move to open ground", "Stay clear of buildings, trees, streetlights, and utility wires."],
            ["After shaking stops", "Check for injuries. Expect aftershocks. Check gas, water, electrical lines."],
          ].map(([t, d], i) => (
            <Panel key={t} style={{ animation: `slideUp 0.3s ease ${i * 0.08}s both` }}>
              <div style={{ display: "flex", gap: 14 }}>
                <CheckCircle2 size={22} color={C.teal} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>{t}</div>
                  <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.6 }}>{d}</div>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {tab === "contacts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
          {[["Emergency services", "911", C.red], ["Regional seismic hotline", "080-455-4090", C.blue],
            ["Red Cross shelter line", "050-359-4900", C.blue], ["USGS earthquake page", "earthquake.usgs.gov", C.teal],
          ].map(([n, p, color], i) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px", animation: `slideUp 0.3s ease ${i * 0.06}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Phone size={16} color={color} />
                <span style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>{n}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: fontMono, fontSize: 14, color: C.textDim, fontWeight: 600 }}>{p}</span>
                {color === C.teal && <ExternalLink size={14} color={C.textFaint} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
