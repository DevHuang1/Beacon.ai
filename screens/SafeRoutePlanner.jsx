import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import MapFrame from "../components/MapFrameWrapper";
import { Button } from "../components";
import { C, fontMono } from "../lib/theme";
import {
  Navigation, ShieldCheck, MapPin, Home, AlertTriangle,
  CloudSun, Route, ShieldAlert, Sparkles, Zap,
} from "lucide-react";
import shelterService from "../lib/services/shelterService";
import routeService from "../lib/services/routeService";
import { api } from "../lib/api";
import { calculateHaversineMiles } from "../lib/haversine";
import { useLocation } from "../lib/LocationContext";
import { sendEmergencyAlert } from "../lib/emergencyAlerts";

const EscapeMapOverlay = dynamic(() => import("../components/EscapeMapOverlay"), { ssr: false });

const H = { display: "flex", alignItems: "center", gap: 8 };
const V = { display: "flex", flexDirection: "column", gap: 4 };
const DANGER_RADIUS_MILES = 0.125;

// Session-level cache of the last route scan per location, so switching away
// from the Routes tab and back doesn't trigger a full re-scan every time.
const ROUTE_SCAN_CACHE = new Map();

function scanKey(lat, lon) {
  return `${(lat ?? 0).toFixed(6)},${(lon ?? 0).toFixed(6)}`;
}

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

function dangerOverlap(coords, circles) {
  if (!coords || coords.length === 0 || !circles || circles.length === 0) return 0;
  const stride = Math.max(1, Math.floor(coords.length / 300));
  let count = 0;
  for (let i = 0; i < coords.length; i += stride) {
    const [lon, lat] = coords[i];
    for (const d of circles) {
      if (calculateHaversineMiles(lat, lon, d.lat, d.lon) < (d.radiusMiles || DANGER_RADIUS_MILES)) count++;
    }
  }
  return count;
}

function routeCrossesDanger(coords, circles) {
  return dangerOverlap(coords, circles) > 0;
}

function findDangerZoneEntryExit(routeCoords, circle) {
  if (!routeCoords || routeCoords.length < 2 || !circle) return null;
  const radiusMiles = circle.radiusMiles || DANGER_RADIUS_MILES;
  let entryIdx = -1;
  let exitIdx = -1;
  for (let i = 0; i < routeCoords.length; i++) {
    const [lon, lat] = routeCoords[i];
    const dist = calculateHaversineMiles(lat, lon, circle.lat, circle.lon);
    const inDanger = dist < radiusMiles;
    if (inDanger && entryIdx === -1) {
      entryIdx = i;
    } else if (!inDanger && entryIdx !== -1 && exitIdx === -1) {
      exitIdx = i;
      break;
    }
  }
  if (entryIdx === -1) return null;
  if (exitIdx === -1) exitIdx = routeCoords.length - 1;
  return { entryIdx, exitIdx };
}

function generateDetourWaypoints(circle, routeCoords) {
  if (!circle || !routeCoords || routeCoords.length < 2) return [];
  const waypoints = [];
  const radiusMiles = circle.radiusMiles || DANGER_RADIUS_MILES;

  const zone = findDangerZoneEntryExit(routeCoords, circle);
  let midIdx;
  if (zone) {
    midIdx = Math.floor((zone.entryIdx + zone.exitIdx) / 2);
  } else {
    let bestDist = Infinity;
    midIdx = 0;
    for (let i = 0; i < routeCoords.length; i++) {
      const [lon, lat] = routeCoords[i];
      const d = calculateHaversineMiles(lat, lon, circle.lat, circle.lon);
      if (d < bestDist) { bestDist = d; midIdx = i; }
    }
  }

  const ci = Math.min(routeCoords.length - 1, Math.max(1, midIdx));
  const p0 = routeCoords[ci - 1];
  const p1 = routeCoords[Math.min(routeCoords.length - 1, ci + 1)];
  const dLonDeg = p1[0] - p0[0];
  const dLatDeg = p1[1] - p0[1];
  const len = Math.hypot(dLonDeg, dLatDeg);
  if (len === 0) return [];
  const perpLon = dLatDeg / len;
  const perpLat = -dLonDeg / len;
  const distToCenter = calculateHaversineMiles(routeCoords[ci][1], routeCoords[ci][0], circle.lat, circle.lon);
  const clearanceMeters = (distToCenter + radiusMiles) * 1609 + 30;
  for (const side of [1, -1]) {
    for (const scale of [1.0, 1.2, 1.5]) {
      const offsetMeters = clearanceMeters * scale;
      const mLat = offsetMeters / 111320;
      const mLon = offsetMeters / (111320 * Math.cos((routeCoords[ci][1] * Math.PI) / 180));
      waypoints.push({
        lat: routeCoords[ci][1] + perpLat * side * mLat,
        lon: routeCoords[ci][0] + perpLon * side * mLon,
      });
    }
  }
  return waypoints;
}

function calcRouteLengthKm(route) {
  if (!route?.geometry?.coordinates) return Infinity;
  const coords = route.geometry.coordinates;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += calculateHaversineMiles(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
  }
  return total * 1.60934;
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

export default function SafeRoutePlanner() {
  const loc = useLocation();
  const [userCoords, setUserCoords] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [routeGeojson, setRouteGeojson] = useState(null);
  const [routeAlternatives, setRouteAlternatives] = useState([]);
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
  const [weatherData, setWeatherData] = useState(null);
  const [weatherUnavailable, setWeatherUnavailable] = useState(false);
  const [routeAnimKey, setRouteAnimKey] = useState(0);

  const [evacuating, setEvacuating] = useState(false);
  const [evacProgress, setEvacProgress] = useState(0);
  const [evacEtaMin, setEvacEtaMin] = useState(null);
  const [evacArrived, setEvacArrived] = useState(false);
  const evacIntervalRef = useRef(null);
  const evacStartRef = useRef(0);
  const evacStepRef = useRef(0);
  const evacRouteCoordsRef = useRef([]);

  const simIntervalRef = useRef(null);
  const aiIntervalRef = useRef(null);
  const aiStepRef = useRef(0);

  const recommendedRef = useRef(null);
  recommendedRef.current = recommended;
  const routeInfoRef = useRef(null);
  routeInfoRef.current = routeInfo;

  const applyScan = useCallback((d) => {
    setUserCoords(d.userCoords);
    setShelters(d.shelters || []);
    setRecommended(d.recommended);
    setRouteGeojson(d.routeGeojson);
    setRouteAlternatives(d.routeAlternatives || []);
    setRouteInfo(d.routeInfo);
    setHazards(d.hazards || []);
    setDangerCircles(d.dangerCircles || []);
    setWeatherData(d.weatherData);
    setWeatherUnavailable(d.weatherUnavailable);
    setNoSafeRoute(d.noSafeRoute);
  }, []);

  useEffect(() => {
    const key = scanKey(loc.lat, loc.lon);
    const cached = ROUTE_SCAN_CACHE.get(key);
    if (cached) {
      applyScan(cached);
      setLoading(false);
    } else {
      run();
    }
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      if (evacIntervalRef.current) clearInterval(evacIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.lat, loc.lon]);

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
    const coords = { lat: loc.lat, lon: loc.lon, isRealGPS: loc.isRealGPS, accuracy: loc.accuracy };
    setUserCoords(coords);

    const [shelterRes, alertsRes, fireRes, quakeRes, weatherRes] = await Promise.allSettled([
      shelterService.fetchNearestShelters(coords.lat, coords.lon, 10),
      api.weather.alerts(coords.lat, coords.lon),
      api.wildfire.hotspots(),
      api.earthquake.recent(1, 48, coords.lat, coords.lon, 200),
      api.weather.now(coords.lat, coords.lon),
    ]);

    const found = shelterRes.status === "fulfilled" && shelterRes.value.success ? shelterRes.value.shelters : [];
    setShelters(found);

    const weather = weatherRes.status === "fulfilled" && weatherRes.value?.success ? weatherRes.value.data : null;
    setWeatherData(weather);
    setWeatherUnavailable(!weather);

    const alerts = alertsRes.status === "fulfilled" ? alertsRes.value?.alerts || [] : [];
    const allWildfires = fireRes.status === "fulfilled" ? fireRes.value?.data || [] : [];
    const allQuakes = quakeRes.status === "fulfilled" ? quakeRes.value?.data?.events || [] : [];

    const nearWildfires = allWildfires.filter((w) => calculateHaversineMiles(coords.lat, coords.lon, w.latitude, w.longitude) < 20);
    const nearQuakes = allQuakes.filter((q) => calculateHaversineMiles(coords.lat, coords.lon, q.lat, q.lon) < 20);

    const haz = [];
    if (nearWildfires.length > 0) haz.push({ type: "fire", count: 1, items: nearWildfires.slice(0, 1), key: `fire-${Date.now()}` });
    if (nearQuakes.length > 0) haz.push({ type: "quake", count: 1, items: nearQuakes.slice(0, 1), key: `quake-${Date.now()}` });
    if (alerts.length > 0) haz.push({ type: "alert", count: 1, items: alerts.slice(0, 1), key: `alert-${Date.now()}` });

    setHazards(haz);

    const circles = buildDangerCircles(haz);
    setDangerCircles(circles);

    const nearest = findNearestSafeShelter(found, circles, coords);
    let routeData = { routeInfo: null, routeAlternatives: [], routeGeojson: null, noSafeRoute: true };
    if (nearest) {
      setRecommended(nearest);
      routeData = (await calculateRoute(coords, nearest, circles)) || routeData;
    } else {
      setNoSafeRoute(true);
    }

    ROUTE_SCAN_CACHE.set(scanKey(coords.lat, coords.lon), {
      userCoords: coords,
      shelters: found,
      recommended: nearest,
      hazards: haz,
      dangerCircles: circles,
      weatherData: weather,
      weatherUnavailable: !weather,
      noSafeRoute: nearest ? routeData.noSafeRoute : true,
      routeInfo: routeData.routeInfo,
      routeAlternatives: routeData.routeAlternatives,
      routeGeojson: routeData.routeGeojson,
    });

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

  function findNearestSafeShelter(shelterList, circles, coords) {
    if (!shelterList || shelterList.length === 0) return null;
    const sorted = [...shelterList].sort((a, b) => a.distMiles - b.distMiles);
    const safe = sorted.filter((s) => !isShelterInDanger(s, circles));
    return safe.length > 0 ? safe[0] : null;
  }

  function recheckShelterSafety(currentShelter, allShelters, circles, userCoords) {
    if (!currentShelter) return null;
    if (!isShelterInDanger(currentShelter, circles)) return currentShelter;
    return findNearestSafeShelter(allShelters, circles, userCoords);
  }

  function buildAlternativesGeojson(primary, alternatives) {
    const features = [];
    (alternatives || []).forEach((r, i) => {
      if (!r?.geometry?.coordinates) return;
      features.push({
        type: "Feature",
        properties: { role: "alternative", index: i, distance_km: r.distance_km, duration_min: r.duration_min },
        geometry: r.geometry,
      });
    });
    if (primary?.geometry?.coordinates) {
      features.push({
        type: "Feature",
        properties: { role: "primary", distance_km: primary.distance_km, duration_min: primary.duration_min },
        geometry: primary.geometry,
      });
    }
    return features.length > 0 ? { type: "FeatureCollection", features } : null;
  }

  function routeStyle(feature) {
    if (feature?.properties?.role === "alternative") {
      return { color: C.teal, weight: 3, opacity: 0.35, dashArray: "6 6" };
    }
    return { color: C.teal, weight: 6, opacity: 0.9 };
  }

  function selectAlternative(index) {
    const target = routeAlternatives[index];
    if (!target) return;
    setRouteInfo(target);
    setRouteGeojson(buildAlternativesGeojson(target, routeAlternatives));
  }

  function applyRoutes(routes, circles) {
    const safeRoute = routeService.pickSafestRoute(routes, circles);
    if (!safeRoute) {
      setNoSafeRoute(true);
      setRouteInfo(null);
      return null;
    }
    const result = {
      routeAlternatives: routes,
      routeInfo: safeRoute,
      routeGeojson: buildAlternativesGeojson(safeRoute, routes),
      noSafeRoute: false,
    };
    setRouteAlternatives(result.routeAlternatives);
    setRouteInfo(safeRoute);
    setRouteGeojson(result.routeGeojson);
    setRouteAnimKey((k) => k + 1);
    return result;
  }

  async function calculateRoute(origin, destination, circles, via = null) {
    if (!origin || !destination) return { routeInfo: null, routeAlternatives: [], routeGeojson: null, noSafeRoute: true };
    setRouteLoading(true);
    setNoSafeRoute(false);
    setRouteGeojson(null);

    let result = { routeInfo: null, routeAlternatives: [], routeGeojson: null, noSafeRoute: true };

    const routeRes = await routeService.calculateEvacuationRoute(origin, destination, "driving", via);
    if (routeRes.success && routeRes.routes) {
      result = applyRoutes(routeRes.routes, circles) || result;
    } else {
      setNoSafeRoute(true);
      setRouteInfo(null);
    }
    setRouteLoading(false);
    return result;
  }

  async function rerouteAroundDetour(blockCircle, origin, destination) {
    const baseCoords = routeInfoRef.current?.geometry?.coordinates || [];
    const baseLength = calcRouteLengthKm(routeInfoRef.current);

    const directRes = await routeService.calculateEvacuationRoute(origin, destination, "driving", null);
    if (directRes.success && directRes.routes) {
      let best = null;
      for (const route of directRes.routes) {
        if (route.geometry && routeCrossesDanger(route.geometry.coordinates, [blockCircle])) continue;
        const duration = Number(route.duration_min) || Infinity;
        const length = calcRouteLengthKm(route);
        const cost = duration;
        if (!best || cost < best.cost) {
          best = { cost, routes: [route], extraLength: Math.max(0, length - baseLength) };
        }
      }
      if (best) return best;
    }

    const waypoints = generateDetourWaypoints(blockCircle, baseCoords);
    let best = null;
    const batchSize = 5;
    for (let i = 0; i < waypoints.length; i += batchSize) {
      const batch = waypoints.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((via) => routeService.calculateEvacuationRoute(origin, destination, "driving", via))
      );
      for (const res of results) {
        if (!res.success || !res.routes || res.routes.length === 0) continue;
        for (const route of res.routes) {
          if (route.geometry && routeCrossesDanger(route.geometry.coordinates, [blockCircle])) continue;
          const duration = Number(route.duration_min) || Infinity;
          const length = calcRouteLengthKm(route);
          const cost = duration;
          if (!best || cost < best.cost) {
            best = { cost, routes: [route], extraLength: Math.max(0, length - baseLength) };
          }
        }
      }
      if (best) break;
    }
    if (best && best.routes.length > 0) {
      best.routeInfo = best.routes[0];
    }
    return best;
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
    const dt = DISASTER_TYPES.find((d) => d.id === type) || DISASTER_TYPES[0];

    // Spawn the disaster ON the current escape route so it actually blocks it
    // and forces a reroute. Falls back to a random spot near the user if there
    // is no route yet.
    const routeCoords = routeInfoRef.current?.geometry?.coordinates;
    let pos;
    if (routeCoords && routeCoords.length >= 3) {
      const start = Math.floor(routeCoords.length * 0.3);
      const end = Math.floor(routeCoords.length * 0.7);
      const idx = start + Math.floor(Math.random() * Math.max(1, end - start));
      const [lon, lat] = routeCoords[idx];
      pos = { lat, lon };
    } else {
      pos = generateCoordsNearby(userCoords.lat, userCoords.lon);
    }

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
      const newRadius = Math.min(200 + step * 60, 800);
      setSimRadius(newRadius);
      setSimulation((prev) => ({ ...prev, currentRadius: newRadius }));
      setDangerCircles((prev) => {
        const updated = prev.map((d) =>
          d.key === sim.key
            ? { ...d, radius: newRadius, radiusMiles: 0.03 + (newRadius / 800) * 0.12 }
            : d
        );
        if (step % 2 === 0) {
          const curRoute = routeInfoRef.current;
          const crossDanger = curRoute?.geometry?.coordinates
            ? routeCrossesDanger(curRoute.geometry.coordinates, updated)
            : false;
          if (crossDanger) {
            const target = recommendedRef.current;
            if (!target) return updated;
            const simCircle = updated.find((d) => d.key === sim.key);
            if (simCircle) {
              rerouteAroundDetour(simCircle, userCoords, target).then((detour) => {
                if (detour) {
                  applyRoutes(detour.routes, updated);
                } else {
                  const nextSafe = findNearestSafeShelter(shelters, updated, userCoords);
                  if (nextSafe && nextSafe.id !== target.id) {
                    setRecommended(nextSafe);
                    calculateRoute(userCoords, nextSafe, updated);
                  } else {
                    setNoSafeRoute(true);
                  }
                }
              });
            }
          } else {
            const target = recommendedRef.current;
            if (target) {
              const nextSafe = recheckShelterSafety(target, shelters, updated, userCoords);
              if (nextSafe && nextSafe.id !== target.id) {
                setRecommended(nextSafe);
                calculateRoute(userCoords, nextSafe, updated);
              } else if (!nextSafe) {
                setNoSafeRoute(true);
              }
            }
          }
        }
        return updated;
      });
      if (newRadius >= 800) {
        clearInterval(simIntervalRef.current);
      }
    }, 500);

    setTimeout(async () => {
      if (!recommended) return;
      const simCircle = newCircles.find((c) => c.key === sim.key);
      const curCoords = routeInfoRef.current?.geometry?.coordinates;
      if (simCircle && curCoords && routeCrossesDanger(curCoords, [simCircle])) {
        const detour = await rerouteAroundDetour(simCircle, userCoords, recommended);
        if (detour) {
          applyRoutes(detour.routes, newCircles);
        } else {
          calculateRoute(userCoords, recommended, [...newCircles]);
        }
      } else {
        calculateRoute(userCoords, recommended, [...newCircles]);
      }
    }, 100);
  }

  function startRandomSimulation() {
    const types = DISASTER_TYPES.map((d) => d.id);
    const randomType = types[Math.floor(Math.random() * types.length)];
    startSimulation(randomType);
  }

  function notifyFamilyEvacuation() {
    const target = recommended?.name || "the nearest safe shelter";
    fetch("/api/profiles/family")
      .then((r) => r.json())
      .then((d) => {
        const members = Array.isArray(d?.data?.members) ? d.data.members : [];
        members.forEach((m) => {
          sendEmergencyAlert({
            recipientId: m.family_member_id,
            message: `🚨 Emergency evacuation started toward ${target}. Follow the safe route to safety.`,
          }).catch(() => {});
        });
      })
      .catch(() => {});
  }

  function stopEvacuation(arrived = false) {
    if (evacIntervalRef.current) {
      clearInterval(evacIntervalRef.current);
      evacIntervalRef.current = null;
    }
    setEvacuating(false);
    if (arrived) {
      setEvacArrived(true);
      setEvacProgress(100);
    }
  }

  function startEvacuation() {
    if (evacuating) {
      stopEvacuation();
      return;
    }
    if (!routeInfo || !recommended || !userCoords) return;
    const coords = routeInfo.geometry?.coordinates || [];
    if (coords.length < 2) return;

    evacStartRef.current = Date.now();
    evacStepRef.current = 0;
    evacRouteCoordsRef.current = coords;
    setEvacuating(true);
    setEvacProgress(0);
    setEvacArrived(false);
    setEvacEtaMin(routeInfo.duration_min || null);

    notifyFamilyEvacuation();

    const totalSteps = Math.min(coords.length - 1, 140);
    evacIntervalRef.current = setInterval(() => {
      const idx = Math.min(
        Math.round((evacStepRef.current / totalSteps) * (coords.length - 1)),
        coords.length - 1
      );
      const [lon, lat] = coords[idx];
      setUserCoords((prev) => ({
        ...(prev || {}),
        lat,
        lon,
        isRealGPS: false,
        accuracy: prev?.accuracy ?? null,
      }));

      const pct = Math.min(100, Math.round(((evacStepRef.current + 1) / totalSteps) * 100));
      setEvacProgress(pct);
      setEvacEtaMin(Math.max(0, Math.round((routeInfo.duration_min || 1) * (100 - pct) / 100)));

      evacStepRef.current += 1;
      if (evacStepRef.current >= totalSteps) {
        stopEvacuation(true);
      }
    }, 250);
  }

  const severity = hazards.some((h) => h.type === "fire" || h.type === "alert") ? "danger" : hazards.length > 0 ? "caution" : "safe";
  const sevColor = severity === "danger" ? C.red : severity === "caution" ? "#D97706" : C.teal;
  const sevLabel = severity === "danger" ? "EVACUATE" : severity === "caution" ? "CAUTION" : "SAFE";
  const sevBg = severity === "danger" ? C.red + "18" : severity === "caution" ? "#D9770618" : C.teal + "18";

  const mapCenter = recommended
    ? [recommended.lat, recommended.lon]
    : userCoords
      ? [userCoords.lat, userCoords.lon]
      : [loc.lat, loc.lon];

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
          borderLeft: `4px solid ${recommended ? C.teal : C.red}`,
        }}>
          <div style={cardHeader}>
            <Home size={14} color={recommended ? C.teal : C.red} />
            <span style={cardTitle}>Nearest Safe Shelter</span>
          </div>
          {recommended ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{recommended.name}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                {recommended.dist} · {recommended.status || "Available"}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, fontFamily: fontMono, marginTop: 2 }}>
                🚶 {Math.round((recommended.distMiles || 0) * 20)} min walk · 🚗 {Math.max(1, Math.round((recommended.distMiles || 0) * 2))} min drive
              </div>
              <span style={badge(safetyScore > 70 ? C.teal : safetyScore > 30 ? C.amber : C.red, "transparent")}>
                Safety: {safetyScore}%
              </span>
            </>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, padding: "4px 0" }}>
              No shelter selected yet.
            </div>
          )}
        </div>

        {/* Route Info */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <Route size={14} color={routeInfo ? C.teal : C.textFaint} />
            <span style={cardTitle}>Route</span>
          </div>
          {routeLoading ? (
            <div style={{ fontSize: 12, color: C.textFaint }}>Calculating route...</div>
          ) : routeInfo ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: fontMono }}>
                🚗 {routeInfo.distance_km} km · {routeInfo.duration_min} min
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                🚶 ~{recommended ? Math.round((recommended.distMiles || 0) * 20) : "—"} min walking
              </div>
              <span style={badge(C.teal, C.teal + "18")}>Available</span>
            </>
          ) : noSafeRoute ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>No safe route</div>
              <div style={{ fontSize: 10, color: C.textDim }}>Avoid danger zone</div>
              <span style={badge(C.red, C.red + "18")}>Blocked</span>
            </>
          ) : !recommended ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>No safe shelter</div>
              <div style={{ fontSize: 10, color: C.textDim }}>All shelters in danger zone</div>
              <span style={badge(C.red, C.red + "18")}>Unreachable</span>
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
          {weatherData ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: fontMono }}>
                {weatherData.temp_f != null ? `${weatherData.temp_f}°F` : "Unavailable"}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                {weatherData.condition || "Unavailable"}
                {weatherData.wind_speed_mph != null ? ` · ${weatherData.wind_speed_mph} mph ${weatherData.wind_direction || ""}` : ""}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textFaint }}>
              {weatherUnavailable ? "Unavailable" : "Loading..."}
            </div>
          )}
          <span style={badge(C.blue, C.blue + "18")}>Live</span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 10, alignItems: "stretch" }}>
        {/* Left Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
              {!aiRunning && aiMessages.length === 0 && (
                <div style={{ fontSize: 12, color: C.textFaint, padding: "2px 0", lineHeight: 1.5 }}>
                  GeoAI analysis only runs while a disaster simulation is active.
                </div>
              )}
            </div>
          </div>

          {/* Safe Shelter Card */}
          {!loading && (
            <div style={{
              flexShrink: 0,
              padding: 16, borderRadius: 12, display: "flex", flexDirection: "column",
              border: `2px solid ${!recommended ? C.red : noSafeRoute ? C.amber : C.teal}`,
              background: `linear-gradient(135deg, ${!recommended ? C.red : noSafeRoute ? C.amber : C.teal}18, transparent)`,
              animation: "fadeInUp 0.3s ease",
            }}>
              {recommended ? (
                <>
                  <div>
                    <div style={H}>
                      <ShieldCheck size={18} color={noSafeRoute ? C.amber : C.teal} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: noSafeRoute ? C.amber : C.teal }}>
                        Nearest Safe Shelter
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 6 }}>{recommended.name}</div>
                    <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{recommended.address}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, fontFamily: fontMono }}>
                      <span style={{ color: C.teal, fontWeight: 700 }}>{recommended.dist}</span>
                      <span style={{ color: C.textDim }}>Cap: {recommended.cap}</span>
                      <span style={{ color: safetyScore > 70 ? C.teal : safetyScore > 30 ? C.amber : C.red, fontWeight: 700 }}>
                        {safetyScore}% safe
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, fontFamily: fontMono, marginTop: 4 }}>
                      🚶 ~{Math.round((recommended.distMiles || 0) * 20)} min walk · 🚗 ~{Math.max(1, Math.round((recommended.distMiles || 0) * 2))} min drive
                    </div>
                  </div>
                  {routeInfo && (
                    <div style={{ marginTop: 12, padding: "10px 12px", background: `${C.teal}15`, borderRadius: 8, border: `1px solid ${C.teal}33` }}>
                      <div style={H}>
                        <Navigation size={14} color={C.teal} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                          🚗 {routeInfo.distance_km} km · {routeInfo.duration_min} min
                        </span>
                      </div>
                      {routeAlternatives.length > 1 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {routeAlternatives.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => selectAlternative(i)}
                              style={{
                                padding: "3px 9px",
                                borderRadius: 6,
                                border: `1px solid ${routeInfo === r ? C.teal : C.line}`,
                                background: routeInfo === r ? `${C.teal}18` : C.panel,
                                color: routeInfo === r ? C.teal : C.textDim,
                                fontSize: 11,
                                fontWeight: 700,
                                fontFamily: fontMono,
                                cursor: "pointer",
                              }}
                            >
                              {i === 0 ? "Fastest" : `Alt ${i}`} · {r.distance_km}km
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {noSafeRoute && (
                    <div style={{ marginTop: 10, fontSize: 12, color: C.amber, fontWeight: 700, padding: "8px 10px", background: `${C.amber}10`, borderRadius: 8 }}>
                      ⚠ Route blocked by danger zone. Selecting next safest shelter...
                    </div>
                  )}
                  {evacuating && (
                    <div style={{ marginTop: 12, padding: "12px", borderRadius: 8, background: `${C.red}10`, border: `1px solid ${C.red}44` }}>
                      <div style={H}>
                        <Navigation size={14} color={C.red} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.red }}>Evacuation in progress</span>
                      </div>
                      <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: C.line, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${evacProgress}%`, background: `linear-gradient(90deg, ${C.amber}, ${C.red})`, transition: "width 0.6s ease" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, fontFamily: fontMono }}>
                        <span style={{ color: C.text }}>{evacProgress}% complete</span>
                        <span style={{ color: evacEtaMin != null && evacEtaMin > 0 ? C.textDim : C.teal }}>
                          {evacArrived ? "Arrived" : evacEtaMin != null && evacEtaMin > 0 ? `~${evacEtaMin} min left` : "Almost there"}
                        </span>
                      </div>
                      {evacArrived && (
                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: C.teal }}>
                          ✅ You have reached the shelter. Stay safe.
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    variant={noSafeRoute ? "warning" : evacuating ? "danger" : "success"}
                    disabled={!routeInfo}
                    onClick={startEvacuation}
                    style={{ width: "100%", marginTop: 12, padding: "12px", fontWeight: 800, fontSize: 15 }}
                  >
                    <Navigation size={16} /> {evacuating ? "Stop Evacuation" : "Start Evacuation"}
                  </Button>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <AlertTriangle size={28} color={C.red} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.red }}>No safe shelter available nearby.</div>
                  <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>
                    All shelters are inside the danger zone or unreachable.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nearest Safe Shelters */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            border: `1px solid ${C.line}`, borderRadius: 12, padding: 12,
            background: C.panel, maxHeight: 280, overflowY: "auto",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.textFaint, marginBottom: 4 }}>
              <Home size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              Nearest Safe Shelters
            </div>
            {loading ? (
              <div style={{ fontSize: 12, color: C.textFaint, padding: "8px 0" }}>Finding shelters nearby...</div>
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
                      {s.occupied != null && s.total && !inDanger && (
                        <span>{s.occupied}/{s.total}</span>
                      )}
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
        </div>

        {/* Map */}
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}`, position: "relative", display: "flex", flexDirection: "column", minHeight: 550 }}>
          <div style={{ flex: 1, minHeight: 550 }}>
            <MapFrame
              height="100%"
              center={mapCenter}
              zoom={13}
              geojson={routeGeojson}
              geoStyle={routeStyle}
              geoKey={routeAnimKey}
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
