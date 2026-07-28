import React from "react";
import { Marker, Popup } from "react-leaflet";
import { Navigation } from "lucide-react";
import WildfireHotspotOverlay from "../components/WildfireHotspotOverlay";

function createShelterIcon(shelter, isSelected) {
  if (typeof window === "undefined") return null;
  const L = require("leaflet");

  const occupied = shelter.occupied || parseInt(shelter.cap?.split("/")[0]) || 200;
  const total = shelter.total || parseInt(shelter.cap?.split("/")[1]) || 500;
  const ratio = total > 0 ? occupied / total : 0.5;

  let pinColor = "#0D9488"; // Teal
  if (ratio >= 0.9) pinColor = "#DC2626"; // Red
  else if (ratio >= 0.75) pinColor = "#D97706"; // Amber

  if (isSelected) pinColor = "#2563EB"; // Accent Blue when active

  const width = isSelected ? 42 : 36;
  const height = isSelected ? 52 : 44;

  const html = `
    <div style="
      position: relative;
      width: ${width}px;
      height: ${height}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      filter: drop-shadow(0 4px 10px ${isSelected ? "rgba(37, 99, 235, 0.4)" : "rgba(15, 23, 42, 0.25)"});
      transition: all 0.2s ease;
    ">
      <div style="
        width: ${width}px;
        height: ${width}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${pinColor};
        border: 2.5px solid #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${isSelected ? "0 0 0 4px rgba(37, 99, 235, 0.25)" : "none"};
      ">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 10v11h18V10" />
            <path d="M12 2L2 10h20L12 2z" />
          </svg>
        </div>
      </div>
      <div style="
        margin-top: -6px;
        background: #0F172A;
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: 800;
        padding: 1px 6px;
        border-radius: 8px;
        border: 1px solid #FFFFFF;
        white-space: nowrap;
      ">
        ${shelter.dist || "1.2 mi"}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
}

function openDirections(lat, lon, name) {
  const q = encodeURIComponent(name);
  const ll = `${lat},${lon}`;
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.platform);
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform) && !isIOS;
  const url = isIOS || isMac
    ? `maps://maps.apple.com/?daddr=${ll}&q=${q}`
    : `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
  window.open(url, "_blank");
}

export default function EscapeMapContentInner({ shelters = [], hotspots = [], selectedShelter = null, popupRefs = null, onSelect = null }) {
  return (
    <>
      {hotspots && hotspots.length > 0 && <WildfireHotspotOverlay hotspots={hotspots} />}
      {shelters && shelters.map((s) => {
        const isSelected = selectedShelter?.id === s.id;
        const occupied = s.occupied || parseInt(s.cap?.split("/")[0]) || 200;
        const total = s.total || parseInt(s.cap?.split("/")[1]) || 500;
        const pct = Math.min(100, Math.round((occupied / total) * 100));

        let barColor = "#0D9488";
        if (pct >= 90) barColor = "#DC2626";
        else if (pct >= 75) barColor = "#D97706";

        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lon]}
            icon={createShelterIcon(s, isSelected)}
            eventHandlers={{
              click: () => {
                if (onSelect) onSelect(s);
              },
            }}
          >
            <Popup
              ref={(r) => {
                if (r && popupRefs && popupRefs.current) {
                  popupRefs.current[s.id] = r;
                }
              }}
            >
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", width: 250, padding: "2px 0" }}>
                {/* Header Title & Status */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", lineHeight: 1.2 }}>
                    {s.name}
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: "monospace",
                    padding: "2px 7px",
                    borderRadius: 6,
                    background: s.status === "Limited Space" ? "#FEF2F2" : "#F0FDF4",
                    color: s.status === "Limited Space" ? "#DC2626" : "#0D9488",
                    border: `1px solid ${s.status === "Limited Space" ? "#FECACA" : "#99F6E4"}`,
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}>
                    {s.status || "OPEN"}
                  </span>
                </div>

                {/* Distance & Address */}
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "#2563EB" }}>
                    <span>📍 Distance:</span>
                    <span style={{ fontFamily: "monospace" }}>{s.dist || "1.2 mi"}</span>
                  </div>
                  {s.address && (
                    <div style={{ fontSize: 11, color: "#64748B" }}>
                      {s.address}
                    </div>
                  )}
                </div>

                {/* Capacity Progress Bar */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    <span>Occupancy</span>
                    <span style={{ fontFamily: "monospace", color: barColor }}>
                      {occupied} / {total} ({pct}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width 0.3s ease" }} />
                  </div>
                </div>

                {/* Facilities Tags */}
                {s.facilities && s.facilities.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                    {s.facilities.map((f) => (
                      <span key={f} style={{
                        fontSize: 10,
                        fontWeight: 600,
                        background: "#EFF6FF",
                        color: "#1D4ED8",
                        padding: "2px 7px",
                        borderRadius: 6,
                        border: "1px solid #DBEAFE",
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Navigation & Selection Actions */}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => openDirections(s.lat, s.lon, s.name)}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 10px",
                      background: "#2563EB",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Navigation size={13} /> Navigate
                  </button>
                  {onSelect && (
                    <button
                      type="button"
                      onClick={() => onSelect(s)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px 12px",
                        background: "#F1F5F9",
                        color: "#0F172A",
                        border: "1px solid #CBD5E1",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
