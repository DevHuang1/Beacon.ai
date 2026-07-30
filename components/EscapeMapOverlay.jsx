import { useEffect, useRef } from "react";
import { Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { C, fontMono } from "../lib/theme";

function icon(html, w = 36, h = 36, anchorX = 18, anchorY = 18) {
  return L.divIcon({
    className: "",
    html,
    iconSize: [w, h],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -anchorY - 8],
  });
}

const FIRE_ICON = ({ pulse = false } = {}) => icon(
  `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(220,38,38,0.15);border-radius:50%;${pulse ? 'animation:disasterPulse 1.5s ease-in-out infinite;' : ''}border:2px solid rgba(220,38,38,0.4);font-size:18px;box-shadow:0 0 20px rgba(220,38,38,0.3);">🔥</div>`,
  36, 36, 18, 18
);

const FLOOD_ICON = ({ pulse = false } = {}) => icon(
  `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(37,99,235,0.15);border-radius:50%;${pulse ? 'animation:disasterPulse 1.5s ease-in-out infinite;' : ''}border:2px solid rgba(37,99,235,0.4);font-size:18px;box-shadow:0 0 20px rgba(37,99,235,0.3);">🌊</div>`,
  36, 36, 18, 18
);

const QUAKE_ICON = ({ pulse = false } = {}) => icon(
  `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(217,119,6,0.15);border-radius:50%;${pulse ? 'animation:disasterPulse 1.5s ease-in-out infinite;' : ''}border:2px solid rgba(217,119,6,0.4);font-size:18px;box-shadow:0 0 20px rgba(217,119,6,0.3);">🌍</div>`,
  36, 36, 18, 18
);

const SHELTER_ICON = icon(
  `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(13,148,136,0.15);border-radius:50%;border:2px solid rgba(13,148,136,0.5);font-size:18px;box-shadow:0 0 12px rgba(13,148,136,0.25);">🏠</div>`,
  36, 36, 18, 18
);

const RECOMMENDED_SHELTER_ICON = icon(
  `<div style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:rgba(13,148,136,0.2);border-radius:50%;border:3px solid #0D9488;font-size:22px;box-shadow:0 0 25px rgba(13,148,136,0.4);animation:markerPulse 2s ease-in-out infinite;">🏠</div>`,
  42, 42, 21, 21
);

const USER_ICON = icon(
  `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:#3B82F6;border-radius:50%;border:3px solid #FFFFFF;box-shadow:0 0 0 4px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.2);animation:markerPulse 2s ease-in-out infinite;"></div>`,
  24, 24, 12, 12
);

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const severityConfig = {
  Low: { color: "#10B981", label: "Low" },
  Medium: { color: "#D97706", label: "Medium" },
  High: { color: "#DC2626", label: "High" },
};

export default function EscapeMapOverlay({
  userCoords,
  dangerCircles,
  recommended,
  hazards,
  shelters,
  disasterSimulation,
  onShelterClick,
}) {
  const map = useMap();

  useEffect(() => {
    if (userCoords) {
      map.setView([userCoords.lat, userCoords.lon], map.getZoom(), { animate: true });
    }
  }, [userCoords]);

  return (
    <>
      {userCoords && (
        <>
          <Circle
            center={[userCoords.lat, userCoords.lon]}
            radius={Math.max(userCoords.accuracy || 30, 15)}
            pathOptions={{ color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.08, weight: 1, dashArray: "4,6" }}
          />
          <Marker position={[userCoords.lat, userCoords.lon]} icon={USER_ICON}>
            <Popup>
              <div style={{ minWidth: 180, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", marginBottom: 4 }}>Your Location</div>
                <div style={{ fontSize: 12, color: "#475569", fontFamily: fontMono }}>
                  {userCoords.lat.toFixed(5)}, {userCoords.lon.toFixed(5)}
                </div>
                {userCoords.accuracy && (
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                    Accuracy: ±{Math.round(userCoords.accuracy)}m
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        </>
      )}

      {dangerCircles.map((d) => {
        const isSim = disasterSimulation && d.key === disasterSimulation.key;
        const radius = isSim ? (d.currentRadius || 500) : (d.radius || 500);
        const opacity = isSim ? 0.25 : 0.15;
        return (
          <span key={d.key}>
            <Circle
              center={[d.lat, d.lon]}
              radius={radius * 2}
              pathOptions={{
                color: d.color || C.red,
                fillColor: d.color || C.red,
                fillOpacity: opacity * 0.3,
                weight: 0,
              }}
            />
            <Circle
              center={[d.lat, d.lon]}
              radius={radius}
              pathOptions={{
                color: d.color || C.red,
                fillColor: d.color || C.red,
                fillOpacity: opacity,
                weight: 1.5,
                dashArray: "6,8",
              }}
            />
            <Circle
              center={[d.lat, d.lon]}
              radius={Math.max(radius * 0.3, 100)}
              pathOptions={{
                color: d.color || C.red,
                fillColor: d.color || C.red,
                fillOpacity: opacity * 1.5,
                weight: 2,
              }}
            />
          </span>
        );
      })}

      {hazards.map((h, hi) =>
        h.items.map((item, ii) => {
          const lat = h.type === "fire" ? item.latitude : h.type === "quake" ? item.lat : item.latitude;
          const lon = h.type === "fire" ? item.longitude : h.type === "quake" ? item.lon : item.longitude;
          if (!lat || !lon) return null;
          const isSim = disasterSimulation && h.key === disasterSimulation.key;
          const pulse = true;
          const getIcon = () => {
            switch (h.type) {
              case "fire": return FIRE_ICON({ pulse });
              case "flood": return FLOOD_ICON({ pulse });
              case "earthquake":
              case "quake": return QUAKE_ICON({ pulse });
              default: return FIRE_ICON({ pulse });
            }
          };
          const severity = isSim && disasterSimulation.severity
            ? disasterSimulation.severity
            : h.type === "fire" ? "High" : h.type === "alert" ? "Medium" : "Low";
          const sevCfg = severityConfig[severity] || severityConfig.Medium;
          const displayType = h.type === "quake" ? "Earthquake" : h.type.charAt(0).toUpperCase() + h.type.slice(1);
          const confidence = isSim && disasterSimulation.confidence
            ? disasterSimulation.confidence
            : `${70 + Math.floor(Math.random() * 25)}%`;

          return (
            <Marker key={`${h.type}-${ii}`} position={[lat, lon]} icon={getIcon()}>
              <Popup>
                <div style={{ minWidth: 200, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{h.type === "fire" ? "🔥" : h.type === "flood" ? "🌊" : h.type === "quake" || h.type === "earthquake" ? "🌍" : "⚠️"}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{displayType}</div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: `${sevCfg.color}18`, color: sevCfg.color,
                      }}>{sevCfg.label} Severity</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                    <div><strong>Time detected:</strong> {formatTime()}</div>
                    <div><strong>AI confidence:</strong> {confidence}</div>
                    <div><strong>Coordinates:</strong> {lat.toFixed(4)}, {lon.toFixed(4)}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })
      )}

      {shelters.map((s) => {
        const isRec = recommended?.id === s.id;
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lon]}
            icon={isRec ? RECOMMENDED_SHELTER_ICON : SHELTER_ICON}
            eventHandlers={{ click: () => onShelterClick && onShelterClick(s) }}
          >
            <Popup>
              <div style={{ minWidth: 220, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <div style={{
                  fontWeight: 800, fontSize: 15, color: isRec ? C.teal : "#0F172A",
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
                }}>
                  🏠 {s.name}
                  {isRec && (
                    <span style={{
                      fontSize: 10, background: C.teal, color: "#FFF", padding: "2px 6px",
                      borderRadius: 4, fontWeight: 800,
                    }}>RECOMMENDED</span>
                  )}
                </div>
                {s.address && <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>{s.address}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 12, color: "#475569" }}>
                  <div><strong>Capacity:</strong> {s.cap || s.total || "N/A"}</div>
                  <div><strong>Occupancy:</strong> {s.occupied != null ? `${s.occupied}` : "Unknown"}</div>
                  <div><strong>Medical:</strong> {s.facilities?.includes("Medical") || s.medical ? "✅ Available" : "Not available"}</div>
                  <div><strong>Food & Water:</strong> {s.facilities?.includes("Hot Meals") || s.food ? "✅ Available" : "Not available"}</div>
                  <div><strong>Distance:</strong> {s.dist}</div>
                  <div><strong>Status:</strong> {s.status || "Open"}</div>
                </div>
                {s.distMiles && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#64748B", fontFamily: fontMono }}>
                    {s.distMiles.toFixed(1)} miles from your location
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Map Legend */}
      <div style={{
        position: "absolute", bottom: 24, left: 12, zIndex: 1000,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        border: "1px solid #E2E8F0", borderRadius: 12,
        padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        minWidth: 140, fontFamily: "'Plus Jakarta Sans', sans-serif",
        pointerEvents: "auto",
      }}>
        <div style={{ fontWeight: 800, fontSize: 11, textTransform: "uppercase", color: "#64748B", marginBottom: 8, letterSpacing: "0.05em" }}>Map Legend</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { emoji: "📍", label: "Your Location", color: "#3B82F6" },
            { emoji: "🔥", label: "Fire", color: "#DC2626" },
            { emoji: "🌊", label: "Flood", color: "#2563EB" },
            { emoji: "🌍", label: "Earthquake", color: "#D97706" },
            { emoji: "🏠", label: "Emergency Shelter", color: "#0D9488" },
            { emoji: "🟢", label: "Safe Route", color: "#10B981" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
