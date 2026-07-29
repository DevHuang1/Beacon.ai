import React from "react";
import { ChevronRight, ShieldCheck, MapPin } from "lucide-react";
import Button from "./Button";
import theme from "../lib/theme";
import { getProximityValidity } from "../lib/haversine";
const { C, S } = theme;

export default function ShelterCard({ shelter, selected = false, onSelect, onDirections }) {
  const proximity = shelter.proximity || getProximityValidity(shelter.distMiles || parseFloat(shelter.dist) || 0);

  return (
    <article aria-labelledby={`s-${shelter.id}-title`} style={{ width: "100%" }}>
      <div
        onClick={() => onSelect && onSelect(shelter)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect && onSelect(shelter); } }}
        style={{ cursor: "pointer", outline: "none" }}
      >
        <div style={{
          border: `1px solid ${selected ? C.teal + "66" : C.line}`,
          background: selected ? `linear-gradient(135deg, ${C.tealDim}, ${C.panel})` : C.panel,
          borderRadius: 12,
          padding: 16,
          boxShadow: selected ? S.glow(C.teal) : S.sm,
          transition: "all 0.15s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div id={`s-${shelter.id}-title`} style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{shelter.name}</div>
              {shelter.address && (
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={12} color={C.textFaint} />
                  <span>{shelter.address}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace", fontSize: 13, fontWeight: 700, color: C.text }}>
                  📍 {shelter.dist} away
                </span>

                {/* Proximity Validity Badge */}
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: proximity.color,
                  background: proximity.bg,
                  border: `1px solid ${proximity.border}`,
                  padding: "2px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  <ShieldCheck size={12} color={proximity.color} />
                  {proximity.badgeText}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <div style={{
                background: shelter.status === "Limited Space" ? "#FEF2F2" : C.tealDim,
                color: shelter.status === "Limited Space" ? "#DC2626" : C.teal,
                border: `1px solid ${shelter.status === "Limited Space" ? "#FCA5A5" : "transparent"}`,
                padding: "5px 10px", borderRadius: 6,
                fontWeight: 700, fontSize: 11,
                fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace",
              }}>{shelter.status || "Open"}</div>
              <ChevronRight size={18} color={C.textFaint} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
              {shelter.total != null ? `Capacity ${shelter.cap}` : "Capacity unknown"}
            </span>
            {shelter.isRealOSM && (
              <span style={{ fontSize: 10, color: "#2563EB", background: "#EFF6FF", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                OSM
              </span>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(shelter.facilities || []).map((f) => (
                <span key={f} style={{
                  fontSize: 11, color: C.textDim, fontWeight: 500,
                  background: C.panel2, border: `1px solid ${C.lineSoft}`,
                  borderRadius: 6, padding: "3px 8px",
                }}>{f}</span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <Button ariaLabel={`Get directions to ${shelter.name}`} onClick={() => onDirections && onDirections(shelter)} style={{ width: "100%" }}>
              <ChevronRight size={14} /> Get directions
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

