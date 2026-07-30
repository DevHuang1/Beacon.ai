import React, { useState, useEffect } from "react";
import { PageHeader, Panel, Badge, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import SvgOverlayContent from "../components/SvgOverlayContent";
import { Waves, Droplets, Gauge, TrendingUp, Satellite, ToggleLeft, ToggleRight } from "lucide-react";
import { C, S, fontDisplay, fontMono } from "../lib/theme";
import { api } from "../lib/api";
import { useLocation } from "../lib/LocationContext";

const TONE_MAP = { high: "critical", moderate: "warning", low: "safe" };

function makeFloodGeojson(waterPct, centerLat, centerLon) {
  const size = 0.04 * (waterPct / 12);
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { label: "Flood extent", water_pct: waterPct },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [centerLon - size, centerLat - size],
          [centerLon + size, centerLat - size],
          [centerLon + size * 1.2, centerLat + size * 0.5],
          [centerLon, centerLat + size * 0.8],
          [centerLon - size * 0.8, centerLat + size * 0.3],
          [centerLon - size, centerLat - size],
        ]],
      },
    }],
  };
}

export default function FloodMonitoring() {
  const loc = useLocation();
  const [gauges, setGauges] = useState(null);
  const [riskZones, setRiskZones] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [satMode, setSatMode] = useState(false);
  const [satData, setSatData] = useState(null);
  const [satLoading, setSatLoading] = useState(false);

  useEffect(() => {
    api.water.gauges().then((res) => {
      if (res?.success && res.data) {
        if (res.data.stations) setGauges(res.data.stations);
        if (res.data.risk_zones) setRiskZones(res.data.risk_zones);
        if (res.data.stats) setStats(res.data.stats);
      } else {
        setError(res?.error || "Failed to load water data");
      }
    }).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!satMode) { setSatData(null); return; }
    setSatLoading(true);
    api.geoai.waterDetect({}).then((res) => {
      if (res?.success) setSatData(res.data);
    }).catch(() => {}).finally(() => setSatLoading(false));
  }, [satMode]);

  const gaugeList = gauges || [];
  const riskList = riskZones || [];
  const hasData = gaugeList.length > 0;
  const floodGeo = satData ? makeFloodGeojson(satData.water_pct, loc.lat, loc.lon) : null;
  const floodStyle = () => ({ color: C.blue, weight: 2, fillColor: C.blue, fillOpacity: 0.15 });

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <PageHeader icon={Waves} title="Smart flood monitoring" subtitle="Real-time USGS gauge readings and satellite flood detection" tone="warning" />
        <Button
          variant={satMode ? "primary" : "ghost"}
          ariaLabel="Toggle satellite flood map"
          onClick={() => setSatMode((v) => !v)}
          style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, marginTop: 6, gap: 6 }}
        >
          {satMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          <Satellite size={14} />
          Satellite
        </Button>
      </div>

      {error && (
        <div style={{
          background: C.redDim, border: `1px solid ${C.red}55`, borderRadius: 12,
          padding: "14px 18px", marginBottom: 18, fontSize: 14, color: C.red,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {!hasData && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {hasData && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
            {gaugeList.map((c, i) => {
              const tone = TONE_MAP[c.risk] || "warning";
              const note = c.rate_mph > 0 ? `Rising ${c.rate_mph.toFixed(1)}m/hr` : "Stable";
              return (
                <Panel key={c.name} style={{ animation: `slideUp 0.3s ease ${i * 0.08}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Gauge size={18} color={tone === "critical" ? C.red : C.amber} />
                    <div style={{ fontSize: 13, color: C.textDim, fontWeight: 500 }}>{c.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily: fontDisplay, fontSize: 40, fontWeight: 800, color: C.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{c.level_m.toFixed(1)}<span style={{ fontSize: 16, color: C.textDim, fontWeight: 600 }}>m</span></span>
                    <Badge tone={tone}>{c.risk === "high" ? "High" : "Elevated"}</Badge>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: C.textFaint }}>
                    <TrendingUp size={14} color={c.rate_mph > 0 ? C.amber : C.teal} />
                    {note}
                  </div>
                </Panel>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 18 }}>
            <Panel title="Risk indicators">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {riskList.map((r) => {
                  const color = r.tone === "red" ? C.red : r.tone === "amber" ? C.amber : C.teal;
                  return (
                    <div key={r.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textDim, marginBottom: 6 }}>
                        <span>{r.name}</span>
                        <span style={{ fontFamily: fontMono, fontWeight: 700, color }}>{r.risk_pct}%</span>
                      </div>
                      <div style={{ height: 10, background: C.panel2, borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ width: `${r.risk_pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 6, transition: "width 0.6s ease", boxShadow: S.glow(color) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Statistics">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["Active stations", stats?.stations || "0", Gauge],
                  ["Flood zones", stats?.flood_zones || "0", Droplets],
                  ["Evacuations", stats?.evacuations || "0", TrendingUp],
                  ...(satData ? [["Satellite water", `${satData.water_pct}%`, Satellite]] : []),
                ].map(([k, v, Icon]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.textDim }}><Icon size={15} color={C.textFaint} />{k}</span>
                    <span style={{ fontFamily: fontMono, fontSize: 15, color: C.text, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}

      <Panel style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
        <MapFrame height={440} center={[loc.lat, loc.lon]} geojson={floodGeo} geoStyle={floodStyle}>
          <SvgOverlayContent>
            <text x="14" y="24" fontFamily={fontMono} fontSize="10" fill={C.textFaint}>
              {satMode ? "Satellite flood extent overlay · OpenGeoAI" : `${gaugeList.length} active gauges · USGS NWIS`}
            </text>
            {gaugeList.map((s, i) => {
              const cx = 60 + (i * 110) % 340;
              const cy = 80 + (i * 80) % 200;
              const color = s.risk === "high" ? C.red : s.risk === "moderate" ? C.amber : C.teal;
              return (
                <g key={s.name}>
                  <circle cx={cx} cy={cy} r="8" fill={color} stroke={C.bg} strokeWidth="2" />
                  <text x={cx + 13} y={cy + 4} fontFamily={fontMono} fontSize="9" fill={C.textFaint}>{s.name}</text>
                </g>
              );
            })}
          </SvgOverlayContent>
        </MapFrame>
      </Panel>
    </div>
  );
}
