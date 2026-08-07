import React, { useState, useEffect } from "react";
import { TileLayer, Polygon, Popup } from "react-leaflet";
import { ShieldAlert } from "lucide-react";
import { C } from "../lib/theme";
import { api } from "../lib/api";

/**
 * WeatherAlertMapOverlay
 * Renders live NEXRAD radar storm layer and NWS severe alert polygon zones
 * on Leaflet maps. Renders nothing extra when NWS returns no alert geometry.
 */
export default function WeatherAlertMapOverlay({
  lat = 40.8,
  lon = -124.16,
  showRadar = true,
  showAlertZones = true,
  radarOpacity = 0.65,
}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealtimeWeatherAlerts();
  }, [lat, lon]);

  const fetchRealtimeWeatherAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.weather.alerts(lat, lon);
      setAlerts(res?.alerts || []);
    } catch (err) {
      console.warn("Weather alert fetch failed", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. Live NEXRAD WMS Weather Radar Layer */}
      {showRadar && (
        <TileLayer
          url="https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png"
          opacity={radarOpacity}
          zIndex={400}
          attribution="&copy; NOAA NEXRAD Iowa Environmental Mesonet"
        />
      )}

      {/* 2. Active NWS Severe Alert Polygon Zones */}
      {showAlertZones &&
        alerts.map((alert, idx) => {
          if (!alert.geometry) return null;

          const severity = (alert.severity || "Severe").toLowerCase();
          let color = "#EAB308"; // Amber/Yellow
          let fillColor = "#FEF08A";

          if (severity.includes("extreme") || alert.type?.toLowerCase().includes("tornado") || alert.type?.toLowerCase().includes("flood")) {
            color = "#DC2626"; // Extreme Red
            fillColor = "#FCA5A5";
          } else if (severity.includes("severe") || alert.type?.toLowerCase().includes("storm")) {
            color = "#EA580C"; // Severe Orange
            fillColor = "#FDBA74";
          }

          if (alert.geometry.type === "Polygon") {
            const positions = alert.geometry.coordinates[0].map(([lng, lt]) => [lt, lng]);
            return (
              <Polygon
                key={alert.id || `alert-polygon-${idx}`}
                positions={positions}
                pathOptions={{
                  color: color,
                  fillColor: fillColor,
                  fillOpacity: 0.35,
                  weight: 2.5,
                  dashArray: "6, 6",
                }}
              >
                <AlertPopup alert={alert} color={color} />
              </Polygon>
            );
          } else if (alert.geometry.type === "MultiPolygon") {
            return alert.geometry.coordinates.map((poly, pIdx) => {
              const positions = poly[0].map(([lng, lt]) => [lt, lng]);
              return (
                <Polygon
                  key={`${alert.id || "alert-mpoly"}-${idx}-${pIdx}`}
                  positions={positions}
                  pathOptions={{
                    color: color,
                    fillColor: fillColor,
                    fillOpacity: 0.35,
                    weight: 2.5,
                    dashArray: "6, 6",
                  }}
                >
                  <AlertPopup alert={alert} color={color} />
                </Polygon>
              );
            });
          }
          return null;
        })}
    </>
  );
}

function AlertPopup({ alert, color }) {
  return (
    <Popup>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", width: 250, padding: "2px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: color, fontWeight: 800, fontSize: 14 }}>
          <ShieldAlert size={18} color={color} />
          <span>{alert.type || "Weather Warning"}</span>
        </div>

        <div style={{ background: C.redDim, border: `1px solid ${color}40`, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {alert.headline || alert.type}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>
            {alert.areaDesc || "Affecting regional emergency zones"}
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.textFaint, display: "flex", justifyContent: "space-between" }}>
          <span>Severity: <strong style={{ color }}>{alert.severity || "Severe"}</strong></span>
          <span>Status: <strong>Active</strong></span>
        </div>
      </div>
    </Popup>
  );
}
