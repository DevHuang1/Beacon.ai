import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import MapFrame from "../components/MapFrameWrapper";
import { Button } from "../components";
import { C } from "../lib/theme";
import { Navigation, ShieldCheck, Flame, Waves, MapPin, Home, AlertTriangle } from "lucide-react";
import shelterService from "../lib/services/shelterService";
import routeService from "../lib/services/routeService";
import { api } from "../lib/api";
import { calculateHaversineMiles } from "../lib/haversine";

const EscapeMapOverlay = dynamic(() => import("../components/EscapeMapOverlay"), { ssr: false });

const H = { display: "flex", alignItems: "center", gap: 8 };
const DANGER_RADIUS_MILES = 0.125;

function isShelterInDanger(shelter, circles) {
  if (!circles || circles.length === 0) return false;
  for (const d of circles) {
    const dist = calculateHaversineMiles(shelter.lat, shelter.lon, d.lat, d.lon);
    if (dist < DANGER_RADIUS_MILES) return true;
  }
  return false;
}

export default function SafeRoutePlanner() {
  const [userCoords, setUserCoords] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [routeGeojson, setRouteGeojson] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { run(); }, []);

  const run = async () => {
    setLoading(true);
    const coords = await shelterService.getUserLocation();
    setUserCoords(coords);

    const [shelterRes, alertsRes, fireRes, quakeRes] = await Promise.allSettled([
      shelterService.fetchNearestShelters(coords.lat, coords.lon, 10),
      api.weather.alerts(coords.lat, coords.lon),
      api.wildfire.hotspots(),
      api.earthquake.recent(1, 48, coords.lat, coords.lon, 200),
    ]);

    const found = shelterRes.status === "fulfilled" && shelterRes.value.success ? shelterRes.value.shelters : [];
    setShelters(found);

    const alerts = alertsRes.status === "fulfilled" ? alertsRes.value?.alerts || [] : [];
    const allWildfires = fireRes.status === "fulfilled" ? fireRes.value?.data || [] : [];
    const allQuakes = quakeRes.status === "fulfilled" ? quakeRes.value?.data?.events || [] : [];

    const nearWildfires = allWildfires.filter((w) => calculateHaversineMiles(coords.lat, coords.lon, w.latitude, w.longitude) < 20);
    const nearQuakes = allQuakes.filter((q) => calculateHaversineMiles(coords.lat, coords.lon, q.lat, q.lon) < 20);

    const haz = [];
    if (nearWildfires.length > 0) haz.push({ type: "fire", count: 1, items: nearWildfires.slice(0, 1) });
    if (nearQuakes.length > 0) haz.push({ type: "quake", count: 1, items: nearQuakes.slice(0, 1) });
    if (alerts.length > 0) haz.push({ type: "alert", count: 1, items: alerts.slice(0, 1) });

    // Place a sample threat near the user if none found nearby
    if (haz.length === 0) {
      haz.push({ type: "fire", count: 1, items: [{ latitude: coords.lat + 0.02, longitude: coords.lon + 0.01 }] });
    }
    setHazards(haz);

    const circles = [];
    haz.forEach((h) => {
      h.items.forEach((item) => {
        let lat, lon;
        if (h.type === "fire") { lat = item.latitude; lon = item.longitude; }
        else if (h.type === "quake") { lat = item.lat; lon = item.lon; }
        else if (h.type === "alert" && item.geometry?.coordinates?.[0]) {
          const c = item.geometry.coordinates[0];
          if (Array.isArray(c[0])) {
            const avg = c.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
            lon = avg[0] / c.length; lat = avg[1] / c.length;
          }
        }
        if (lat && lon) circles.push({ lat, lon, key: `${h.type}-${lat}-${lon}` });
      });
    });

    if (found.length > 0) {
      // Exclude shelters inside danger zones
      const safeShelters = found.filter((s) => !isShelterInDanger(s, circles));
      const pool = safeShelters.length > 0 ? safeShelters : found;

      const context = {
        userLocation: { lat: coords.lat.toFixed(4), lon: coords.lon.toFixed(4) },
        shelters: pool.slice(0, 3).map((s) => ({ name: s.name, distance: s.dist, status: s.status })),
        hazards: haz.map((h) => `${h.count} ${h.type}`).join(", ") || "none",
      };

      const hasHazards = haz.length > 0;
      const aiRes = await api.advisor(
        hasHazards
          ? `EMERGENCY - Active: ${haz.map((h) => `${h.count} ${h.type}`).join(", ")}. Find safest shelter near ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}. Name the single best shelter.`
          : `Precautionary route from ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}. Name the best equipped shelter.`,
        context
      );
      const aiText = aiRes?.data?.text || "";
      const match = pool.find((s) => aiText.toLowerCase().includes(s.name.toLowerCase()));
      const best = match || pool[0];
      setRecommended(best);

      const routeRes = await routeService.calculateEvacuationRoute(coords, best, "driving");
      if (routeRes.success && routeRes.routes) {
        const safeRoute = routeService.pickSafestRoute(routeRes.routes, circles);
        if (safeRoute) {
          setRouteInfo(safeRoute);
          setRouteGeojson(routeService.toPolylineGeoJSON(safeRoute));
        }
      }
    }
    setLoading(false);
  };

  const severity = hazards.some((h) => h.type === "fire" || h.type === "alert") ? "danger" : hazards.length > 0 ? "caution" : "safe";
  const sevColor = severity === "danger" ? C.red : severity === "caution" ? "#D97706" : C.teal;
  const sevLabel = severity === "danger" ? "EVACUATE" : severity === "caution" ? "CAUTION" : "SAFE";

  const mapCenter = recommended ? [recommended.lat, recommended.lon] : userCoords ? [userCoords.lat, userCoords.lon] : [40.802, -124.163];

  const dangerCircles = [];
  hazards.forEach((h) => {
    h.items.forEach((item) => {
      let lat, lon;
      if (h.type === "fire") { lat = item.latitude; lon = item.longitude; }
      else if (h.type === "quake") { lat = item.lat; lon = item.lon; }
      else if (h.type === "alert" && item.geometry?.coordinates?.[0]) {
        const coords = item.geometry.coordinates[0];
        if (Array.isArray(coords[0])) {
          const avg = coords.reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
          lon = avg[0] / coords.length;
          lat = avg[1] / coords.length;
        }
      }
      if (lat && lon) dangerCircles.push({ lat, lon, key: `${h.type}-${lat}-${lon}` });
    });
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Compact status bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "12px 18px", borderRadius: 14, flexWrap: "wrap",
        border: `1px solid ${sevColor}55`, background: `linear-gradient(135deg, ${sevColor}18, var(--bg, #0F172A))`,
      }}>
        <div style={H}>
          {loading ? (
            <div style={{ width: 18, height: 18, border: `2px solid ${C.line}`, borderTopColor: C.teal, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          ) : (
            <ShieldCheck size={20} color={sevColor} />
          )}
          <div>
            <div style={H}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{loading ? "Scanning..." : "Escape Route"}</span>
              {!loading && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${sevColor}22`, color: sevColor, fontWeight: 800 }}>{sevLabel}</span>}
            </div>
            <div style={{ fontSize: 12, color: C.textDim }}>
              {loading ? "Detecting location & hazards..." : hazards.map((h) => `${h.count} ${h.type}`).join(" · ") || "No threats"}
            </div>
          </div>
        </div>
        <Button variant="secondary" onClick={run} disabled={loading} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
          {loading ? "..." : "Rescan"}
        </Button>
      </div>

      {/* Main grid: shelter card + map */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 12, flex: 1 }}>
        {/* Left: Escape info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Nearest Safe Shelters */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            border: `1px solid ${C.line}`, borderRadius: 12, padding: 12,
            background: C.panel, maxHeight: 400, overflowY: "auto",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.textFaint, marginBottom: 4 }}>
              <Home size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              Nearest Safe Shelters
            </div>
            {loading ? (
              <div style={{ fontSize: 12, color: C.textFaint, padding: "8px 0" }}>Loading shelters...</div>
            ) : shelters.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textFaint, padding: "8px 0" }}>No shelters found nearby.</div>
            ) : (
              shelters.slice(0, 10).map((s) => {
                const isRec = recommended?.id === s.id;
                const inDanger = isShelterInDanger(s, dangerCircles);
                return (
                  <div
                    key={s.id} role="button" tabIndex={0}
                    onClick={() => {
                      if (inDanger) return;
                      setRecommended(s);
                      routeService.calculateEvacuationRoute(userCoords, s, "driving").then((r) => {
                        if (r.success && r.routes) {
                          const safe = routeService.pickSafestRoute(r.routes, dangerCircles);
                          if (safe) { setRouteInfo(safe); setRouteGeojson(routeService.toPolylineGeoJSON(safe)); }
                        }
                      });
                    }}
                    style={{
                      cursor: inDanger ? "not-allowed" : "pointer", padding: "10px 12px", borderRadius: 8,
                      background: isRec ? `${C.teal}15` : inDanger ? `${C.red}08` : C.panel2,
                      border: `1px solid ${isRec ? C.teal : inDanger ? C.red + "44" : C.line}`,
                      opacity: inDanger ? 0.55 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: inDanger ? C.red : C.text }}>{s.name}</div>
                        {inDanger && <AlertTriangle size={12} color={C.red} />}
                      </div>
                      <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: isRec ? C.teal : C.textDim, fontWeight: 700 }}>{s.dist}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{s.address}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: C.textDim }}>
                      <span>{inDanger ? "In danger zone" : s.status}</span>
                      {s.cap && !inDanger && <span>Cap: {s.cap}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Hazards quick view */}
          {hazards.length > 0 && !loading && (
            <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.red}33`, background: `${C.red}08` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.textFaint, marginBottom: 8 }}>Active Threats</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hazards.map((h, i) => (
                  <div key={i} style={H}>
                    {h.type === "fire" ? <Flame size={14} color={C.red} /> : h.type === "quake" ? <Waves size={14} color={C.red} /> : <MapPin size={14} color={C.amber} />}
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{h.count} {h.type === "fire" ? "Fire" : h.type === "quake" ? "Earthquake" : "Alert"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safe Shelter Card */}
          {recommended && !loading && (
            <div style={{
              flex: 1, padding: 16, borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "space-between",
              border: `2px solid ${C.teal}`,
              background: `linear-gradient(135deg, ${C.teal}18, transparent)`,
            }}>
              <div>
                <div style={H}>
                  <ShieldCheck size={18} color={C.teal} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.teal }}>Safe Shelter</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 6 }}>{recommended.name}</div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{recommended.address}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: C.teal, fontWeight: 700 }}>{recommended.dist}</span>
                  <span style={{ color: C.textDim }}>Cap: {recommended.cap}</span>
                </div>
              </div>
              {routeInfo && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: `${C.teal}15`, borderRadius: 8, border: `1px solid ${C.teal}33` }}>
                  <div style={H}>
                    <Navigation size={14} color={C.teal} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{routeInfo.distance_km} km · {routeInfo.duration_min} min</span>
                  </div>
                </div>
              )}
              <Button
                variant="success" disabled={!routeInfo}
                onClick={() => alert("Evacuation started. Follow the route to safety.")}
                style={{ width: "100%", marginTop: 12, padding: "12px", fontWeight: 800, fontSize: 15 }}
              >
                <Navigation size={16} /> Start Evacuation
              </Button>
            </div>
          )}


        </div>

        {/* Map with circles */}
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}` }}>
          <MapFrame
            height={550}
            center={mapCenter}
            zoom={13}
            geojson={routeGeojson}
            geoStyle={routeService.getPolylineStyle(C.teal)}
          >
            <EscapeMapOverlay userCoords={userCoords} dangerCircles={dangerCircles} recommended={recommended} />
          </MapFrame>
        </div>
      </div>
    </div>
  );
}
