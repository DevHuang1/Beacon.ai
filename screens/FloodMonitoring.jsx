import React, { useState, useEffect } from "react";
import { PageHeader, Panel, Badge, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import { Waves, Droplets, Gauge, TrendingUp, Satellite, ToggleLeft, ToggleRight } from "lucide-react";
import { C, S, fontDisplay, fontMono } from "../lib/theme";
import { api } from "../lib/api";
import { useLocation } from "../lib/LocationContext";
import { useIsMobile } from "../lib/useIsMobile";

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
  const isMobile = useIsMobile();
  const [gauges, setGauges] = useState(null);
  const [riskZones, setRiskZones] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [satMode, setSatMode] = useState(false);
  const [satData, setSatData] = useState(null);
  const [satLoading, setSatLoading] = useState(false);
  const [satError, setSatError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState(null);
  const [alertsError, setAlertsError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.water.gauges(loc.lat, loc.lon).then((res) => {
      if (res?.success && res.data) {
        if (res.data.stations) setGauges(res.data.stations);
        if (res.data.risk_zones) setRiskZones(res.data.risk_zones);
        if (res.data.stats) setStats(res.data.stats);
      } else {
        setError(res?.error || "Failed to load water data");
      }
    }).catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loc.lat, loc.lon]);

  useEffect(() => {
    setAlertsError(null);
    api.water.alerts(loc.lat, loc.lon).then((res) => {
      if (res?.success && res.data) {
        setAlerts(res.data.alerts || []);
      } else {
        setAlerts([]);
        setAlertsError(res?.error || "Flood alerts unavailable");
      }
    }).catch((err) => {
      setAlerts([]);
      setAlertsError(err.message || "Flood alerts unavailable");
    });
  }, [loc.lat, loc.lon]);

  useEffect(() => {
    if (!satMode) { setSatData(null); setSatError(null); return; }
    setSatLoading(true);
    setSatError(null);
    (async () => {
      try {
        const satRes = await api.satellite(loc.lat, loc.lon);
        if (!satRes?.success || !satRes.data?.base64) {
          setSatData(null);
          setSatError(satRes?.error || "Satellite image unavailable");
          return;
        }
        const detectRes = await api.geoai.waterDetect({
          image: { base64: satRes.data.base64 },
          threshold: 0.05,
          nir_band: 2,
        });
        if (detectRes?.success && detectRes.data) {
          setSatData({ ...detectRes.data, image: satRes.data });
        } else {
          setSatData(null);
          setSatError(detectRes?.error || "Water detection failed");
        }
      } catch (err) {
        setSatData(null);
        setSatError(err.message || "Satellite flood detection failed");
      } finally {
        setSatLoading(false);
      }
    })();
  }, [satMode, loc.lat, loc.lon]);

  const gaugeList = gauges || [];
  const riskList = riskZones || [];
  const alertList = alerts || [];
  const hasData = gaugeList.length > 0 || alertList.length > 0;
  const satImage = satData?.image?.base64 ? `data:${satData.image.mime || "image/png"};base64,${satData.image.base64}` : null;
  const satBounds = (() => {
    const bbox = satData?.image?.bbox;
    if (!bbox) return null;
    const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
    return [[minLat, minLon], [maxLat, maxLon]];
  })();
  const floodGeo = satData && satData.water_pct != null && !satImage ? makeFloodGeojson(satData.water_pct, loc.lat, loc.lon) : null;

  const alertGeo = alertList.length > 0 ? {
    type: "FeatureCollection",
    features: alertList
      .map((a) => ({
        type: "Feature",
        properties: { label: a.title, risk: a.risk },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [a.longitude - 0.5, a.latitude - 0.4],
            [a.longitude + 0.5, a.latitude - 0.4],
            [a.longitude + 0.6, a.latitude + 0.3],
            [a.longitude - 0.5, a.latitude + 0.5],
            [a.longitude - 0.5, a.latitude - 0.4],
          ]],
        },
      })),
  } : null;
  const combinedStyle = (f) => {
    if (f?.properties?.risk) {
      const color = f.properties.risk === "high" ? C.red : f.properties.risk === "moderate" ? C.amber : C.teal;
      return { color, weight: 2, fillColor: color, fillOpacity: 0.15 };
    }
    return { color: C.blue, weight: 2, fillColor: C.blue, fillOpacity: 0.15 };
  };
  const combinedGeo = (() => {
    const feats = [];
    if (floodGeo) feats.push(...floodGeo.features);
    if (alertGeo) feats.push(...alertGeo.features);
    return feats.length ? { type: "FeatureCollection", features: feats } : null;
  })();

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <PageHeader icon={Waves} title="Smart flood monitoring" subtitle="USGS river gauges, GDACS flood alerts and satellite water detection" tone="warning" />
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

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {!hasData && !loading && (
        <div style={{
          background: C.panel2, border: `1px solid ${C.lineSoft}`, borderRadius: 12,
          padding: "16px 18px", marginBottom: 18, fontSize: 13, color: C.textDim,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, flexShrink: 0 }} />
          No flood gauges or active flood alerts in this region. Use Satellite mode for water detection, or check the nearest GDACS bulletin.
        </div>
      )}

      {hasData && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
            {(gaugeList.length > 0 ? gaugeList.map((c, i) => {
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
            }) : alertList.map((a, i) => {
              const tone = a.risk === "high" ? "critical" : a.risk === "moderate" ? "warning" : "safe";
              const color = a.risk === "high" ? C.red : a.risk === "moderate" ? C.amber : C.teal;
              return (
                <Panel key={a.id || a.title} style={{ animation: `slideUp 0.3s ease ${i * 0.08}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Waves size={18} color={color} />
                    <div style={{ fontSize: 13, color: C.textDim, fontWeight: 500 }}>{a.title}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{a.alertlevel}</span>
                    <Badge tone={tone}>{a.alertscore}/4</Badge>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: C.textFaint }}>
                    {a.distance_km != null ? `${a.distance_km} km away` : `${a.latitude?.toFixed(2)}, ${a.longitude?.toFixed(2)}`}
                  </div>
                </Panel>
              );
            }))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: 14, marginBottom: 18 }}>
            <Panel title="Risk indicators">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(riskList.length > 0 ? riskList : alertList.map((a) => ({
                  name: a.title,
                  risk_pct: Math.min(a.alertscore * 25, 100),
                  tone: a.risk === "high" ? "red" : a.risk === "moderate" ? "amber" : "teal",
                }))).map((r) => {
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
                {[[gaugeList.length > 0 ? "Active stations" : "Flood alerts",
                  gaugeList.length > 0 ? (stats?.stations || "0") : String(alertList.length),
                  gaugeList.length > 0 ? Gauge : Waves],
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

      <Panel style={{ padding: 0, overflow: "hidden", borderRadius: 14, position: "relative" }}>
        <MapFrame
          height={440}
          geojson={combinedGeo}
          geoStyle={combinedStyle}
          imageOverlay={satImage && satBounds ? { url: satImage, bounds: satBounds, opacity: 0.7 } : null}
        >
          {satMode && (satLoading || satError) && (
            <div style={{
              position: "absolute", top: 14, left: 14, zIndex: 1000, pointerEvents: "none",
              background: C.amberDim, border: `1px solid ${C.amber}55`, borderRadius: 8,
              padding: "8px 12px", fontSize: 11, color: C.amber, fontWeight: 600, maxWidth: 320,
              lineHeight: 1.4, display: "flex", alignItems: "center", gap: 8,
            }}>
              {satLoading && (
                <span style={{
                  width: 12, height: 12, border: `2px solid ${C.amber}44`,
                  borderTopColor: C.amber, borderRadius: "50%", flexShrink: 0,
                  animation: "spin 0.7s linear infinite",
                }} />
              )}
              {satLoading
                ? "Fetching satellite imagery & running water detection..."
                : `Satellite flood detection failed: ${satError}`}
            </div>
          )}
        </MapFrame>
        <div style={{
          position: "absolute", bottom: 14, left: 14, zIndex: 1000, pointerEvents: "none",
          background: `${C.panel}DD`, border: `1px solid ${C.line}`, borderRadius: 8,
          padding: "6px 10px", fontFamily: fontMono, fontSize: 10, color: C.textFaint,
          backdropFilter: "blur(8px)",
        }}>
          {satMode && satData ? `NASA MODIS water ${satData.water_pct}%` : alertList.length > 0 ? `${alertList.length} active flood alerts · GDACS` : `${gaugeList.length} active gauges · USGS NWIS`}
        </div>
        <div style={{
          position: "absolute", bottom: 14, right: 14, zIndex: 1000, pointerEvents: "none",
          background: `${C.panel}DD`, border: `1px solid ${C.line}`, borderRadius: 8,
          padding: "6px 10px", fontFamily: fontMono, fontSize: 10, color: C.textFaint,
          backdropFilter: "blur(8px)",
        }}>
          {gaugeList.filter((g) => g.latitude).length > 0
            ? `${gaugeList.filter((g) => g.latitude).length} gauges with coordinates · USGS NWIS`
            : alertList.length > 0
              ? `${alertList.length} alert regions with coordinates · GDACS`
              : "Gauge positions unavailable for this area"}
        </div>
      </Panel>
    </div>
  );
}
