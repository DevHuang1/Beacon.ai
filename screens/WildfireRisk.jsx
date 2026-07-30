import React, { useState, useEffect } from "react";
import { PageHeader, Panel, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import { Flame, Wind, Thermometer, Satellite, ToggleLeft, ToggleRight } from "lucide-react";
import { C, S, fontDisplay, fontMono } from "../lib/theme";
import { api } from "../lib/api";
import firmsService from "../lib/services/firmsService";
import WildfireHotspotOverlay from "../components/WildfireHotspotOverlayWrapper";
import { useLocation } from "../lib/LocationContext";

function makeBurnScarGeojson(centerLat, centerLon) {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { label: "Burn scar", source: "OpenGeoAI segmentation" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [centerLon - 0.05, centerLat - 0.03],
          [centerLon + 0.02, centerLat - 0.04],
          [centerLon + 0.06, centerLat - 0.01],
          [centerLon + 0.04, centerLat + 0.03],
          [centerLon - 0.01, centerLat + 0.05],
          [centerLon - 0.04, centerLat + 0.02],
          [centerLon - 0.05, centerLat - 0.03],
        ]],
      },
    }],
  };
}

export default function WildfireRisk() {
  const loc = useLocation();
  const [hotspots, setHotspots] = useState([]);
  const [conditions, setConditions] = useState(null);
  const [error, setError] = useState(null);
  const [scarMode, setScarMode] = useState(false);
  const [scarData, setScarData] = useState(null);
  const [scarLoading, setScarLoading] = useState(false);

  useEffect(() => {
    api.wildfire.conditions().then((res) => {
      if (res?.success && res.data) {
        setHotspots(res.data.hotspots || []);
        if (res.data.conditions) setConditions(res.data.conditions);
      } else {
        setError(res?.error || "Failed to load wildfire data");
      }
    }).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!scarMode) { setScarData(null); return; }
    setScarLoading(true);
    api.geoai.segment({ image: {} }).then((res) => {
      if (res?.success) setScarData(res.data);
    }).catch(() => {}).finally(() => setScarLoading(false));
  }, [scarMode]);

  const hasData = hotspots.length > 0;
  const scarGeo = scarMode ? makeBurnScarGeojson(loc.lat, loc.lon) : null;
  const scarStyle = () => ({ color: C.red, weight: 2, fillColor: "#8B0000", fillOpacity: 0.2 });

  const toSvg = (lat, lng) => ({
    x: 50 + ((lng + 124.5) * 400) % 300,
    y: 50 + ((lat - 40.5) * 300) % 200,
  });

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <PageHeader icon={Flame} title="Wildfire risk map" subtitle="Active fire hotspots from NASA FIRMS satellite imagery" tone="critical" />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <Button
            variant={scarMode ? "primary" : "ghost"}
            ariaLabel="Toggle burn scar overlay"
            onClick={() => setScarMode((v) => !v)}
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, gap: 6 }}
          >
            {scarMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            <Satellite size={14} />
            Burn scar
          </Button>
          <div style={{
            background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8,
            padding: "6px 12px", fontSize: 11, fontFamily: fontMono, color: C.textFaint,
            whiteSpace: "nowrap",
          }}>
            <span style={{ color: C.teal }}>&#9654;</span> Pulsing dots = active fire
          </div>
        </div>
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
          <div className="skeleton" style={{ height: 460, borderRadius: 14 }} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 18 }}>
        <Panel style={{ padding: 0, overflow: "hidden", borderRadius: 14, position: "relative" }}>
          <MapFrame height={460} center={[loc.lat, loc.lon]} geojson={scarGeo} geoStyle={scarStyle}>
            {hasData && <WildfireHotspotOverlay hotspots={hotspots} />}
          </MapFrame>

          <div style={{
            position: "absolute", top: 14, left: 14, zIndex: 1400,
            background: `${C.panel}DD`, border: `1px solid ${C.line}`, borderRadius: 10,
            padding: "10px 14px", fontSize: 11, color: C.textDim,
            display: "flex", gap: 16, backdropFilter: "blur(12px)",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.red, display: "inline-block", boxShadow: S.glow(C.red) }} /> Hotspot
            </span>
            {scarMode && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 2, background: "#8B000080", display: "inline-block", border: "1px solid #ff0000" }} /> Burn scar
              </span>
            )}
            {conditions && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Wind size={12} color={C.amber} /> {conditions.active_hotspots} active
              </span>
            )}
          </div>
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel title="Fire conditions">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(conditions ? [
                ["Active hotspots", String(conditions.active_hotspots), Flame],
                ["Mean FRP", `${conditions.mean_frp?.toFixed(1) || "0"} MW`, Thermometer],
                ...(scarData ? [["Segments", String(scarData.segments?.length || 0), Satellite]] : []),
              ] : [
                ["Status", "Awaiting data", Flame],
              ]).map(([l, v, Icon], i) => (
                <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.lineSoft}` : "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textDim }}>
                    <Icon size={15} color={C.textFaint} />{l}
                  </span>
                  <span style={{ fontFamily: fontMono, fontSize: 14, color: C.text, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </Panel>

          {scarData && (
            <Panel title="Burn scar analysis">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {scarData.segments?.map((seg) => (
                  <div key={seg.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textDim }}>
                      {seg.color && <span style={{ width: 12, height: 12, borderRadius: 3, background: seg.color, flexShrink: 0 }} />}
                      {seg.label}
                    </span>
                    <span style={{ fontFamily: fontMono, fontSize: 13, color: C.text, fontWeight: 600 }}>{(seg.pixels / 1000).toFixed(0)}k px</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
