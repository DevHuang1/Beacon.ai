import React from "react";
import { Marker, Popup } from "react-leaflet";
import { C } from "../lib/theme";

function createMemberIcon(isSelected) {
  if (typeof window === "undefined") return null;
  const L = require("leaflet");
  const color = isSelected ? C.blue : C.teal;
  const html = `
    <div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 0 4px ${color}33, 0 2px 6px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    ">👤</div>
  `;
  return L.divIcon({ html, className: "", iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14] });
}

export default function FamilyMapMarkers({ members = [], selectedId = null, onSelect = null }) {
  return (
    <>
      {members.map(({ member, position }) => (
        <Marker
          key={member.id}
          position={position}
          icon={createMemberIcon(member.id === selectedId)}
          eventHandlers={{ click: () => onSelect && onSelect(member.id) }}
        >
          <Popup>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 180, padding: "2px 0" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>{member.name}</div>
              <div style={{ fontSize: 12, color: C.textDim, fontFamily: "monospace" }}>
                {position[0].toFixed(5)}, {position[1].toFixed(5)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
