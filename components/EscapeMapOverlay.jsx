import { Circle } from "react-leaflet";
import { C } from "../lib/theme";

export default function EscapeMapOverlay({ userCoords, dangerCircles, recommended }) {
  return (
    <>
      {userCoords && (
        <Circle center={[userCoords.lat, userCoords.lon]} radius={15} pathOptions={{ color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 1, weight: 2 }} />
      )}
      {dangerCircles.map((d) => (
        <span key={d.key}>
          <Circle center={[d.lat, d.lon]} radius={1000} pathOptions={{ color: C.red, fillColor: C.red, fillOpacity: 0.04, weight: 0 }} />
          <Circle center={[d.lat, d.lon]} radius={500} pathOptions={{ color: C.red, fillColor: C.red, fillOpacity: 0.1, weight: 1, dashArray: "4,6" }} />
          <Circle center={[d.lat, d.lon]} radius={200} pathOptions={{ color: C.red, fillColor: C.red, fillOpacity: 0.35, weight: 2.5 }} />
        </span>
      ))}
      {recommended && (
        <Circle center={[recommended.lat, recommended.lon]} radius={30} pathOptions={{ color: C.teal, fillColor: C.teal, fillOpacity: 0.6, weight: 3 }} />
      )}
    </>
  );
}
