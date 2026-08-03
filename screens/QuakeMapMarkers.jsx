import React from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { Activity } from "lucide-react";

const LEVEL_COLORS = { major: "#DC2626", moderate: "#D97706", light: "#2563EB" };

export default function QuakeMapMarkers({ quakes = [] }) {
  return (
    <>
      {quakes.map((e) => {
        if (e.lat == null || e.lon == null) return null;
        const color = LEVEL_COLORS[e.level] || "#2563EB";
        const r = Math.min(16, 6 + e.mag * 2.5);
        return (
          <CircleMarker
            key={e.id}
            center={[e.lat, e.lon]}
            radius={r}
            pathOptions={{ color: color, fillColor: color, fillOpacity: 0.55, weight: 1.5 }}
          >
            <Popup>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", width: 220, padding: "2px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color, fontWeight: 800, fontSize: 15 }}>
                  <Activity size={16} />
                  <span>M{e.mag} Earthquake</span>
                </div>
                <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, marginBottom: 6 }}>{e.place}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: "#475569", fontFamily: "monospace" }}>
                  <span>Magnitude: M{e.mag}</span>
                  <span>Depth: {e.depth}</span>
                  <span>Time: {e.time}</span>
                  <span>Coords: {e.lat.toFixed(4)}, {e.lon.toFixed(4)}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
