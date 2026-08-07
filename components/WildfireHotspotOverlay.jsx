import React from "react";
import { CircleMarker, Popup, Circle } from "react-leaflet";
import { Flame, Satellite, AlertTriangle } from "lucide-react";
import { C } from "../lib/theme";

export default function WildfireHotspotOverlay({ hotspots = [] }) {
  if (!hotspots || hotspots.length === 0) return null;

  return (
    <>
      {hotspots.map((h, i) => {
        const lat = h.latitude;
        const lon = h.longitude;
        if (!lat || !lon) return null;

        const frp = h.frp || 0;
        const isExtreme = frp > 50;
        const radius = Math.min(18, Math.max(7, Math.round(frp / 6) + 6));
        const color = isExtreme ? "#DC2626" : "#F59E0B";

        return (
          <React.Fragment key={h.id || `hotspot-item-${i}`}>
            {/* Pulsing outer danger radius circle */}
            <Circle
              center={[lat, lon]}
              radius={Math.max(150, Math.min(1500, frp * 20))}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.18,
                weight: 1.5,
                dashArray: "4, 6",
              }}
            />

            {/* Core Hotspot Circle Marker */}
            <CircleMarker
              center={[lat, lon]}
              radius={radius}
              pathOptions={{
                color: "#FFFFFF",
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", width: 220, padding: "2px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: C.red, fontWeight: 800, fontSize: 14 }}>
                    <Flame size={18} color={C.red} />
                    <span>Active Wildfire Hotspot</span>
                  </div>

                  <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: C.textDim, fontWeight: 600 }}>Fire Radiative Power</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, color: C.red }}>{frp} MW</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: C.textDim, fontWeight: 600 }}>Satellite Source</span>
                      <span style={{ fontWeight: 700, color: C.text }}>{h.satellite || "VIIRS/NOAA"}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: C.textFaint, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Satellite size={12} />
                      <span>Acquired: {h.acq_date || "Recent pass"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "monospace" }}>
                      <span>Lat/Lon: {lat.toFixed(4)}, {lon.toFixed(4)}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.amber, fontWeight: 700 }}>
                    <AlertTriangle size={13} />
                    <span>NASA FIRMS Satellite Detection</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}
    </>
  );
}
