import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import MapFrame from "../components/MapFrameWrapper";
import { Button } from "../components";
import { C, S, fontMono, fontBody } from "../lib/theme";
import {
  Navigation, ShieldCheck, Flame, Waves, MapPin, Home, AlertTriangle,
  Crosshair, Target, CloudSun, Gauge, Clock, Route, ShieldAlert,
  Sparkles, ChevronRight, Zap,
} from "lucide-react";
import shelterService from "../lib/services/shelterService";
import routeService from "../lib/services/routeService";
import { api } from "../lib/api";
import { calculateHaversineMiles } from "../lib/haversine";

const EscapeMapOverlay = dynamic(() => import("../components/EscapeMapOverlay"), { ssr: false });

const H = { display: "flex", alignItems: "center", gap: 8 };
const V = { display: "flex", flexDirection: "column", gap: 4 };
const DANGER_RADIUS_MILES = 0.125;

const SEVERITY_LEVELS = ["Low", "Medium", "High"];
const SEVERITY_COLORS = { Low: "#10B981", Medium: "#D97706", High: "#DC2626" };
const DISASTER_TYPES = [
  { id: "fire", label: "Fire", emoji: "🔥", color: C.red },
  { id: "flood", label: "Flood", emoji: "🌊", color: "#2563EB" },
  { id: "earthquake", label: "Earthquake", emoji: "🌍", color: "#D97706" },
];

const AI_MESSAGES = [
  "Analyzing satellite imagery...",
  "Detecting affected roads...",
  "Evaluating disaster perimeters...",
  "Finding nearest safe shelter...",
  "Optimizing evacuation route...",
  "Route successfully generated.",
];

function isShelterInDanger(shelter, circles) {
  if (!circles || circles.length === 0) return false;
  for (const d of circles) {
    const dist = calculateHaversineMiles(shelter.lat, shelter.lon, d.lat, d.lon);
    if (dist < (d.radiusMiles || DANGER_RADIUS_MILES)) return true;
  }
  return false;
}

function getSafetyScore(shelter, dangerCircles) {
  if (!dangerCircles || dangerCircles.length === 0) return 100;
  let minDist = Infinity;
  for (const d of dangerCircles) {
    const dist = calculateHaversineMiles(shelter.lat, shelter.lon, d.lat, d.lon);
    minDist = Math.min(minDist, dist);
  }
  const threatRadius = DANGER_RADIUS_MILES;
  if (minDist < threatRadius) return 0;
  if (minDist < threatRadius * 3) return Math.round(((minDist - threatRadius) / (threatRadius * 2)) * 60);
  return Math.min(100, Math.round(60 + ((minDist - threatRadius * 3) / 10) * 40));
}

function generateCoordsNearby(lat, lon, minMeters = 500, maxMeters = 1000) {
  const distMeters = minMeters + Math.random() * (maxMeters - minMeters);
  const bearing = Math.random() * 360;
  const R = 6371000;
  const d = distMeters / R;
  const brng = (bearing * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const newLat = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const newLon = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(newLat));
  return { lat: newLat * (180 / Math.PI), lon: newLon * (180 / Math.PI) };
}

function generateDemoWeather() {
  const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Clear"];
  const c = conditions[Math.floor(Math.random() * conditions.length)];
  return {
    temp: Math.round(60 + Math.random() * 30),
    condition: c,
    humidity: Math.round(40 + Math.random() * 40),
    windSpeed: Math.round(5 + Math.random() * 25),
    windDir: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(Math.random() * 8)],
  };
}

export default function SafeRoutePlanner() {
  const [userCoords, setUserCoords] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [routeGeojson, setRouteGeojson] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [dangerCircles, setDangerCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [noSafeRoute, setNoSafeRoute] = useState(false);

  const [simulation, setSimulation] = useState(null);
  const [simRadius, setSimRadius] = useState(500);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [aiRunning, setAiRunning] = useState(false);
  const [weatherData] = useState(generateDemoWeather);
  const [routeAnimKey, setRouteAnimKey] = useState(0);

  const simIntervalRef = useRef(null);
  const aiIntervalRef = useRef(null);
  const aiStepRef = useRef(0);

  useEffect(() => {
    run();
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    };
  }, []);

  const runAiAnalysis = useCallback(async (haz, circles, sh) => {
    setAiRunning(true);
    setAiMessages([]);
    aiStepRef.current = 0;
    setAiConfidence(0);

    const interval = setInterval(() => {
      aiStepRef.current += 1;
      if (aiStepRef.current <= AI_MESSAGES.length) {
        setAiMessages((prev) => [...prev, AI_MESSAGES[aiStepRef.current - 1]]);
        const conf = Math.min(99, aiStepRef.current * 16 + Math.floor(Math.random() * 5));
        setAiConfidence(conf);
      }
      if (aiStepRef.current >= AI_MESSAGES.length + 2) {
        clearInterval(interval);
        setAiConfidence(99);
        setAiRunning(false);
      }
    }, 500);

    aiIntervalRef.current = interval;
  }, []);

  const run = async () => {
    setLoading(true);
    setNoSafeRoute(false);
    const startTime = Date.now();
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
    if (nearWildfires.length > 0) haz.push({ type: "fire", count: 1, items: nearWildfires.slice(0, 1), key: `fire-${Date.now()}` });
    if (nearQuakes.length > 0) haz.push({ type: "quake", count: 1, items: nearQuakes.slice(0, 1), key: `quake-${Date.now()}` });
    if (alerts.length > 0) haz.push({ type: "alert", count: 1, items: alerts.slice(0, 1), key: `alert-${Date.now()}` });

    if (haz.length === 0) {
      haz.push({ type: "fire", count: 1, items: [{ latitude: coords.lat + 0.02, longitude: coords.lon + 0.01 }], key: `fire-${Date.now()}` });
    }
    setHazards(haz);

    const circles = buildDangerCircles(haz);
    setDangerCircles(circles);

    if (found.length > 0) {
      selectBestShelter(found, circles, coords);
    }
    const elapsed = Date.now() - startTime;
    if (elapsed < 3000) {
      await new Promise((r) => setTimeout(r, 3000 - elapsed));
    }
    setLoading(false);
  };

  function buildDangerCircles(hazList) {
    const circles = [];
    hazList.forEach((h) => {
      h.items.forEach((item) => {
        let lat, lon;
        if (h.type === "fire") { lat = item.latitude; lon = item.longitude; }
        else if (h.type === "quake") { lat = item.lat; lon = item.lon; }
        else if (h.type === "flood") { lat = item.latitude; lon = item.longitude; }
        else if (h.type === "earthquake") { lat = item.lat; lon = item.lon; }
        else if (h.type === "alert" && item.geometry?.coordinates?.[0]) {
          const c = item.geometry.coordinates[0];
          if (Array.isArray(c[0])) {
            const avg = c.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
            lon = avg[0] / c.length; lat = avg[1] / c.length;
          }
        }
        if (lat && lon) {
          const dt = DISASTER_TYPES.find((d) => d.id === h.type);
          circles.push({
            lat, lon, key: `${h.type}-${lat}-${lon}`,
            color: dt?.color || C.red,
            radius: 500,
            radiusMiles: 0.125,
          });
        }
      });
    });
    return circles;
  }

  async function selectBestShelter(shelterList, circles, coords) {
    const safeShelters = shelterList.filter((s) => !isShelterInDanger(s, circles));
    const pool = safeShelters.length > 0 ? safeShelters : shelterList;

    const context = {
      userLocation: { lat: coords.lat.toFixed(4), lon: coords.lon.toFixed(4) },
      shelters: pool.slice(0, 3).map((s) => ({ name: s.name, distance: s.dist, status: s.status })),
      hazards: hazards.map((h) => `${h.count} ${h.type}`).join(", ") || "none",
    };

    const hasHazards = hazards.length > 0;
    const aiRes = await api.advisor(
      hasHazards
        ? `EMERGENCY - Active: ${hazards.map((h) => `${h.count} ${h.type}`).join(", ")}. Find safest shelter near ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}. Name the single best shelter.`
        : `Precautionary route from ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}. Name the best equipped shelter.`,
      context
    );
    const aiText = aiRes?.data?.text || "";
    const match = pool.find((s) => aiText.toLowerCase().includes(s.name.toLowerCase()));
    const best = match || pool[0];
    setRecommended(best);
    await calculateRoute(coords, best, circles);
  }

  async function calculateRoute(origin, destination, circles) {
    if (!origin || !destination) return;
    setRouteLoading(true);
    setNoSafeRoute(false);
    setRouteGeojson(null);

    const routeRes = await routeService.calculateEvacuationRoute(origin, destination, "driving");
    if (routeRes.success && routeRes.routes) {
      const safeRoute = routeService.pickSafestRoute(routeRes.routes, circles);
      if (safeRoute) {
        setRouteInfo(safeRoute);
        setRouteGeojson(routeService.toPolylineGeoJSON(safeRoute));
        setRouteAnimKey((k) => k + 1);
      } else {
        setNoSafeRoute(true);
        setRouteInfo(null);
      }
    } else {
      setNoSafeRoute(true);
    }
    setRouteLoading(false);
  }

  const handleShelterSelect = useCallback(async (s) => {
    if (isShelterInDanger(s, dangerCircles)) return;
    setRecommended(s);
    await calculateRoute(userCoords, s, dangerCircles);
  }, [userCoords, dangerCircles]);

  function startSimulation(type) {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);

    if (!userCoords) return;

    const severity = SEVERITY_LEVELS[Math.floor(Math.random() * SEVERITY_LEVELS.length)];
    const pos = generateCoordsNearby(userCoords.lat, userCoords.lon);
    const dt = DISASTER_TYPES.find((d) => d.id === type) || DISASTER_TYPES[0];

    const sim = {
      type,
      label: dt.label,
      emoji: dt.emoji,
      color: dt.color,
      lat: pos.lat,
      lon: pos.lon,
      severity,
      confidence: `${85 + Math.floor(Math.random() * 14)}%`,
      key: `sim-${type}-${Date.now()}`,
      time: new Date().toISOString(),
      currentRadius: 200,
    };

    setSimulation(sim);
    setSimRadius(200);
    setAiMessages([]);
    aiStepRef.current = 0;
    setAiRunning(true);
    setAiConfidence(0);

    const simHazard = { type, count: 1, items: [{ latitude: pos.lat, longitude: pos.lon }], key: sim.key };
    setHazards([simHazard, ...hazards.filter((h) => !h.key?.startsWith("sim-"))]);

    const newCircles = [{
      lat: pos.lat, lon: pos.lon, key: sim.key,
      color: dt.color, radius: 200, radiusMiles: 0.05,
    }, ...dangerCircles.filter((d) => !d.key?.startsWith("sim-"))];
    setDangerCircles(newCircles);

    runAiAnalysis([simHazard], newCircles, null);

    let step = 0;
    simIntervalRef.current = setInterval(() => {
      step += 1;
      const newRadius = Math.min(200 + step * 30, 800);
      setSimRadius(newRadius);
      setSimulation((prev) => ({ ...prev, currentRadius: newRadius }));
      setDangerCircles((prev) =>
        prev.map((d) =>
          d.key === sim.key
            ? { ...d, radius: newRadius, radiusMiles: 0.03 + (newRadius / 800) * 0.12 }
            : d
        )
      );
      if (newRadius >= 800) {
        clearInterval(simIntervalRef.current);
      }
    }, 800);

    setTimeout(() => {
      if (recommended) {
        calculateRoute(userCoords, recommended, [...newCircles]);
      }
    }, 500);
  }

  function startRandomSimulation() {
    const types = DISASTER_TYPES.map((d) => d.id);
    const randomType = types[Math.floor(Math.random() * types.length)];
    startSimulation(randomType);
  }

  const severity = hazards.some((h) => h.type === "fire" || h.type === "alert") ? "danger" : hazards.length > 0 ? "caution" : "safe";
  const sevColor = severity === "danger" ? C.red : severity === "caution" ? "#D97706" : C.teal;
  const sevLabel = severity === "danger" ? "EVACUATE" : severity === "caution" ? "CAUTION" : "SAFE";
  const sevBg = severity === "danger" ? C.red + "18" : severity === "caution" ? "#D9770618" : C.teal + "18";

  const mapCenter = recommended
    ? [recommended.lat, recommended.lon]
    : userCoords
      ? [userCoords.lat, userCoords.lon]
      : [40.802, -124.163];

  const safetyScore = recommended ? getSafetyScore(recommended, dangerCircles) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Status Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        padding: "10px 16px", borderRadius: 14, flexWrap: "wrap",
        border: `1px solid ${sevColor}55`,
        background: `linear-gradient(135deg, ${sevColor}18, var(--bg, #0F172A))`,
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
              {!loading && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${sevColor}22`, color: sevColor, fontWeight: 800 }}>
                  {sevLabel}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.textDim }}>
              {loading ? "Detecting location & hazards..." : hazards.map((h) => `${h.count} ${h.type}`).join(" · ") || "No threats"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="secondary" onClick={run} disabled={loading} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
            {loading ? "..." : "Rescan"}
          </Button>
        </div>
      </div>

      {/* Simulation Controls */}
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
        padding: "8px 14px", borderRadius: 12,
        border: `1px solid ${simulation ? C.amber + "55" : C.line}`,
        background: simulation ? `${C.amber}08` : C.panel,
      }}>
        <div style={H}>
          <Zap size={14} color={simulation ? C.amber : C.textFaint} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: simulation ? C.amber : C.textFaint }}>
            {simulation ? "Simulation Active" : "Simulation Mode"}
          </span>
        </div>
        {DISASTER_TYPES.map((dt) => (
          <Button
            key={dt.id}
            variant="secondary"
            onClick={() => startSimulation(dt.id)}
            disabled={loading || aiRunning}
            style={{
              padding: "5px 12px", fontSize: 12, fontWeight: 700,
              border: `1px solid ${simulation?.type === dt.id ? dt.color + "66" : C.line}`,
              background: simulation?.type === dt.id ? `${dt.color}15` : "transparent",
              color: simulation?.type === dt.id ? dt.color : C.text,
            }}
          >
            {dt.emoji} Start {dt.label}
          </Button>
        ))}
        <Button
          variant="secondary"
          onClick={startRandomSimulation}
          disabled={loading || aiRunning}
          style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700 }}
        >
          🎲 Random
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 8,
      }}>
        {/* Disaster Status */}
        <div style={{
          ...cardStyle,
          borderLeft: `4px solid ${sevColor}`,
        }}>
          <div style={cardHeader}>
            <ShieldAlert size={14} color={sevColor} />
            <span style={cardTitle}>Disaster Status</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: sevColor, fontFamily: fontMono }}>
            {sevLabel}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
            {hazards.length > 0 ? `${hazards.length} active threat(s)` : "All clear"}
          </div>
          <span style={badge(sevColor, sevBg)}>{sevLabel}</span>
        </div>

        {/* Current Location */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <MapPin size={14} color={C.blue} />
            <span style={cardTitle}>Location</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: fontMono }}>
            {userCoords ? `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}` : "---"}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
            {userCoords?.accuracy ? `±${Math.round(userCoords.accuracy)}m accuracy` : "Acquiring..."}
          </div>
          <span style={badge(C.teal, C.teal + "18")}>
            {userCoords?.isRealGPS ? "GPS Active" : "Approximate"}
          </span>
        </div>

        {/* Safe Shelter */}
        <div style={{
          ...cardStyle,
          borderLeft: `4px solid ${recommended ? C.teal : C.textFaint}`,
        }}>
          <div style={cardHeader}>
            <Home size={14} color={recommended ? C.teal : C.textFaint} />
            <span style={cardTitle}>Safe Shelter</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
            {recommended ? recommended.name : "---"}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
            {recommended ? recommended.dist : "No shelter selected"}
          </div>
          {recommended && (
            <span style={badge(safetyScore > 70 ? C.teal : safetyScore > 30 ? C.amber : C.red, "transparent")}>
              Safety: {safetyScore}%
            </span>
          )}
        </div>

        {/* Route Info */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <Route size={14} color={routeInfo ? C.teal : C.textFaint} />
            <span style={cardTitle}>Route</span>
          </div>
          {routeLoading ? (
            <div style={{ fontSize: 12, color: C.textFaint }}>Calculating...</div>
          ) : routeInfo ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: fontMono }}>
                {routeInfo.distance_km} km · {routeInfo.duration_min} min
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                Travel time estimated
              </div>
              <span style={badge(C.teal, C.teal + "18")}>Available</span>
            </>
          ) : noSafeRoute ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>No safe route</div>
              <div style={{ fontSize: 10, color: C.textDim }}>Try a different shelter</div>
              <span style={badge(C.red, C.red + "18")}>Blocked</span>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.textFaint }}>Select a shelter</div>
              <span style={badge(C.textFaint, "transparent")}>Pending</span>
            </>
          )}
        </div>

        {/* Weather */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <CloudSun size={14} color={C.blue} />
            <span style={cardTitle}>Weather</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: fontMono }}>
            {weatherData.temp}°F
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
            {weatherData.condition} · {weatherData.windSpeed} mph {weatherData.windDir}
          </div>
          <span style={badge(C.blue, C.blue + "18")}>Demo</span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 10, flex: 1, minHeight: 0 }}>
        {/* Left Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
          {/* AI Analysis Panel */}
          <div style={{
            border: `1px solid ${aiRunning ? "#7C3AED" : C.line}`,
            borderRadius: 12, padding: 12,
            background: aiRunning ? `linear-gradient(135deg, #7C3AED08, ${C.panel})` : C.panel,
            minHeight: aiMessages.length > 0 ? "auto" : 0,
            flexShrink: 0,
          }}>
            <div style={H}>
              <Sparkles size={14} color={aiRunning ? "#7C3AED" : C.textFaint} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: aiRunning ? "#7C3AED" : C.textFaint }}>
                AI GeoAI Analysis
              </span>
              {aiRunning && (
                <div style={{
                  width: 12, height: 12, border: `2px solid #7C3AED44`,
                  borderTopColor: "#7C3AED", borderRadius: "50%",
                  animation: "spin 0.6s linear infinite", marginLeft: "auto",
                }} />
              )}
              {!aiRunning && aiConfidence > 0 && (
                <span style={{
                  marginLeft: "auto", fontSize: 11, fontWeight: 800, fontFamily: fontMono,
                  color: C.teal,
                }}>
                  {aiConfidence}% confident
                </span>
              )}
            </div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {aiMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12, color: i === aiMessages.length - 1 && aiRunning ? "#7C3AED" : C.textDim,
                    animation: "fadeInUp 0.3s ease both",
                    padding: "2px 0",
                    fontWeight: i === aiMessages.length - 1 && aiRunning ? 700 : 400,
                  }}
                >
                  <span style={{ color: i === aiMessages.length - 1 && aiRunning ? "#7C3AED" : C.teal, marginRight: 6 }}>
                    {i === aiMessages.length - 1 && aiRunning ? ">" : "✓"}
                  </span>
                  {msg}
                </div>
              ))}
              {aiRunning && (
                <div style={{
                  fontSize: 12, color: "#7C3AED", fontWeight: 700,
                  animation: "blink 1s step-end infinite", padding: "2px 0",
                }}>
                  <span style={{ color: "#7C3AED", marginRight: 6 }}>▌</span>
                </div>
              )}
            </div>
          </div>

          {/* Nearest Safe Shelters */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            border: `1px solid ${C.line}`, borderRadius: 12, padding: 12,
            background: C.panel, flex: 1, overflowY: "auto", minHeight: 0,
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
              shelters.slice(0, 10).map((s, idx) => {
                const isRec = recommended?.id === s.id;
                const inDanger = isShelterInDanger(s, dangerCircles);
                const score = getSafetyScore(s, dangerCircles);
                return (
                  <div
                    key={s.id} role="button" tabIndex={0}
                    onClick={() => handleShelterSelect(s)}
                    style={{
                      cursor: inDanger ? "not-allowed" : "pointer",
                      padding: "10px 12px", borderRadius: 8,
                      background: isRec ? `${C.teal}15` : inDanger ? `${C.red}08` : C.panel2,
                      border: `1px solid ${isRec ? C.teal : inDanger ? C.red + "44" : C.line}`,
                      opacity: inDanger ? 0.55 : 1,
                      transition: "all 0.15s",
                      animation: `fadeInUp 0.3s ease ${idx * 0.04}s both`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={H}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: inDanger ? C.red : C.text }}>{s.name}</div>
                        {inDanger && <AlertTriangle size={12} color={C.red} />}
                      </div>
                      <span style={{ fontSize: 11, fontFamily: fontMono, color: isRec ? C.teal : C.textDim, fontWeight: 700 }}>{s.dist}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{s.address}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: C.textDim, alignItems: "center" }}>
                      <span>{inDanger ? "In danger zone" : s.status}</span>
                      {s.cap && !inDanger && <span>Cap: {s.cap}</span>}
                      {!inDanger && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: score > 70 ? C.teal : score > 30 ? C.amber : C.red,
                          marginLeft: "auto",
                        }}>
                          {score}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Hazards quick view */}
          {hazards.length > 0 && !loading && (
            <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.red}33`, background: `${C.red}08`, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.textFaint, marginBottom: 8 }}>
                <AlertTriangle size={12} style={{ verticalAlign: -2, marginRight: 4 }} color={C.red} />
                Active Threats
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hazards.map((h, i) => {
                  const dt = DISASTER_TYPES.find((d) => d.id === h.type);
                  return (
                    <div key={i} style={H}>
                      <span style={{ fontSize: 16 }}>{dt?.emoji || "⚠️"}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                        {h.type.charAt(0).toUpperCase() + h.type.slice(1)} Hazard
                        {simulation?.key === h.key && (
                          <span style={{
                            fontSize: 10, marginLeft: 6, color: C.amber, fontWeight: 800,
                          }}>SIM</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Safe Shelter Card */}
          {recommended && !loading && (
            <div style={{
              flexShrink: 0,
              padding: 16, borderRadius: 12, display: "flex", flexDirection: "column",
              border: `2px solid ${noSafeRoute ? C.red : C.teal}`,
              background: `linear-gradient(135deg, ${noSafeRoute ? C.red : C.teal}18, transparent)`,
              animation: "fadeInUp 0.3s ease",
            }}>
              <div>
                <div style={H}>
                  <ShieldCheck size={18} color={noSafeRoute ? C.red : C.teal} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: noSafeRoute ? C.red : C.teal }}>
                    Safe Shelter
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 6 }}>{recommended.name}</div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{recommended.address}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, fontFamily: fontMono }}>
                  <span style={{ color: C.teal, fontWeight: 700 }}>{recommended.dist}</span>
                  <span style={{ color: C.textDim }}>Cap: {recommended.cap}</span>
                  <span style={{ color: safetyScore > 70 ? C.teal : safetyScore > 30 ? C.amber : C.red, fontWeight: 700 }}>
                    Safety: {safetyScore}%
                  </span>
                </div>
              </div>
              {routeInfo && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: `${C.teal}15`, borderRadius: 8, border: `1px solid ${C.teal}33` }}>
                  <div style={H}>
                    <Navigation size={14} color={C.teal} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                      {routeInfo.distance_km} km · {routeInfo.duration_min} min
                    </span>
                  </div>
                </div>
              )}
              {noSafeRoute && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.red, fontWeight: 700, padding: "8px 10px", background: `${C.red}10`, borderRadius: 8 }}>
                  ⚠ Route blocked by danger zone. Try selecting a different shelter.
                </div>
              )}
              <Button
                variant={noSafeRoute ? "danger" : "success"}
                disabled={!routeInfo}
                onClick={() => alert("Evacuation started. Follow the route to safety.")}
                style={{ width: "100%", marginTop: 12, padding: "12px", fontWeight: 800, fontSize: 15 }}
              >
                <Navigation size={16} /> Start Evacuation
              </Button>
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}`, position: "relative" }}>
          <MapFrame
            height={550}
            center={mapCenter}
            zoom={13}
            geojson={routeGeojson}
            geoStyle={routeService.getPolylineStyle(C.teal)}
          >
            <EscapeMapOverlay
              userCoords={userCoords}
              dangerCircles={dangerCircles.map((d) => ({
                ...d,
                currentRadius: d.key === simulation?.key ? simRadius : undefined,
              }))}
              recommended={recommended}
              hazards={hazards}
              shelters={shelters}
              disasterSimulation={simulation}
              onShelterClick={handleShelterSelect}
            />
          </MapFrame>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${C.line}`,
  background: C.panel,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  animation: "fadeInUp 0.3s ease",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const cardTitle = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  color: C.textFaint,
  letterSpacing: "0.04em",
};

function badge(color, bg) {
  return {
    display: "inline-block",
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color,
    background: bg || `${color}18`,
    padding: "2px 8px",
    borderRadius: 4,
    marginTop: "auto",
    alignSelf: "flex-start",
  };
}
