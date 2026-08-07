import React, { useState, useEffect } from "react";
import { PageHeader, Panel, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import { Flame, Wind, Thermometer, Satellite, ToggleLeft, ToggleRight } from "lucide-react";
import { C, S, fontMono } from "../lib/theme";
import { api } from "../lib/api";
import { useLocation } from "../lib/LocationContext";
import { useIsMobile } from "../lib/useIsMobile";
import WildfireHotspotOverlay from "../components/WildfireHotspotOverlayWrapper";

export default function WildfireRisk() {
  const loc = useLocation();
  const isMobile = useIsMobile();
  const [hotspots, setHotspots] = useState([]);
  const [conditions, setConditions] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scarMode, setScarMode] = useState(false);
  const [scarData, setScarData] = useState(null);
  const [scarLoading, setScarLoading] = useState(false);
  const [scarError, setScarError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.wildfire.conditions(loc.lat, loc.lon).then((res) => {
      if (res?.success && res.data) {
        setHotspots(res.data.hotspots || []);
        if (res.data.conditions) setConditions(res.data.conditions);
      } else {
        setError(res?.error || "Failed to load wildfire data");
      }
    }).catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loc.lat, loc.lon]);

  useEffect(() => {
    if (!scarMode) { setScarData(null); setScarError(null); return; }
    setScarLoading(true);
    setScarError(null);
    (async () => {
      try {
        const satRes = await api.satellite(loc.lat, loc.lon);
        if (!satRes?.success || !satRes.data?.base64) {
          setScarData(null);
          setScarError(satRes?.error || "Satellite image unavailable for burn scar analysis");
          return;
        }
        const segRes = await api.geoai.segment({ image: { base64: satRes.data.base64 } });
        if (segRes?.success && segRes.data) {
          setScarData({ ...segRes.data, image: satRes.data });
        } else {
          setScarData(null);
          setScarError(segRes?.error || "Burn scar segmentation failed");
        }
      } catch (err) {
        setScarData(null);
        setScarError(err.message || "Burn scar segmentation failed");
      } finally {
        setScarLoading(false);
      }
    })();
  }, [scarMode, loc.lat, loc.lon]);

  const hasData = hotspots.length > 0;
  const scarGeo = scarMode && scarData?.type === "FeatureCollection" ? scarData : null;
  const scarStyle = () => ({ color: C.red, weight: 2, fillColor: "#8B0000", fillOpacity: 0.2 });

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

      {scarMode && (scarLoading || scarError) && (
        <div style={{
          background: C.amberDim, border: `1px solid ${C.amber}55`, borderRadius: 12,
          padding: "14px 18px", marginBottom: 18, fontSize: 13, color: C.amber,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, flexShrink: 0 }} />
          {scarLoading
            ? "Requesting burn scar segmentation..."
            : `Burn scar segmentation requires a satellite image — GeoAI service returned: ${scarError}`}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20 }}>
          <div className="skeleton" style={{ height: 460, borderRadius: 14 }} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.8fr 1fr", gap: 18 }}>
        <Panel style={{ padding: 0, overflow: "hidden", borderRadius: 14, position: "relative" }}>
          <MapFrame height={460} geojson={scarGeo} geoStyle={scarStyle}>
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
            {scarGeo && (
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
