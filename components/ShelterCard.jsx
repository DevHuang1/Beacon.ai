import React from "react";
import { ChevronRight } from "lucide-react";
import Button from "./Button";
import theme from "../lib/theme";
const { C, S } = theme;

export default function ShelterCard({ shelter, selected = false, onSelect, onDirections }) {
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div id={`s-${shelter.id}-title`} style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{shelter.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace", fontSize: 13, color: C.textFaint, marginTop: 6 }}>{shelter.dist} away</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{
                background: C.tealDim, color: C.teal,
                padding: "5px 10px", borderRadius: 6,
                fontWeight: 700, fontSize: 11,
                fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace",
              }}>Open</div>
              <ChevronRight size={18} color={C.textFaint} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <span style={{ fontSize: 13, color: C.textDim }}>Capacity {shelter.cap}</span>
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
