import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { PageHeader, Panel, Button, Badge } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import {
  Navigation, MapPin, CloudRain, Wind, Droplets, Shield, ChevronRight,
  Route, X, AlertTriangle, Sparkles, CheckCircle2, ArrowRight, Zap, RefreshCw, Flame, Waves, Activity
} from "lucide-react";
import { C, S, fontDisplay, fontMono } from "../lib/theme";
import { api } from "../lib/api";
import firmsService from "../lib/services/firmsService";
import { validateAndFilterShelters } from "../lib/haversine";
import { useLocation } from "../lib/LocationContext";

const EscapeMapContent = dynamic(() => import("./EscapeMapContent"), { ssr: false });

function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const SCENARIOS = {
  flood: {
    id: "flood",
    icon: Waves,
    tone: "critical",
    title: "Heavy Rain & Rapid Flood Risk",
    alertMessage: "Heavy rain begins. Flood expected near your primary route in 30 minutes.",
    recommendation: "Alternative safe route calculated via elevated ridge line. Direct to nearest open shelter.",
    hazardNotice: "Main Street Bridge under water risk in 30 mins",
  },
  quake: {
    id: "quake",
    icon: Activity,
    tone: "warning",
    title: "Seismic Foreshock & Road Debris",
    alertMessage: "Magnitude 5.8 tremor detected 4 km away. Overpass structural inspection in progress.",
    recommendation: "Bypassing elevated overpasses. Routing through open parkway route.",
    hazardNotice: "Avoid 4th Ave Overpass & Brick Wall Corridors",
  },
  fire: {
    id: "fire",
    icon: Flame,
    tone: "critical",
    title: "Wildfire Smoke & Evacuation Notice",
    alertMessage: "Wind shift pushing dense smoke south toward Highway 101.",
    recommendation: "North evacuation corridor active. Clear air index along Highway 299.",
    hazardNotice: "Highway 101 South closed due to zero visibility",
  },
};

export default function EscapeAssistant() {
  const loc = useLocation();
  const [shelters, setShelters] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [shelterError, setShelterError] = useState(null);
  const [userLocation, setUserLocation] = useState([loc.lat, loc.lon]);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [activeScenario, setActiveScenario] = useState("flood");
  const [appliedAlternative, setAppliedAlternative] = useState(false);
  const popupRefs = useRef({});

  const scenario = SCENARIOS[activeScenario];

  const fetchLocationData = useCallback((lat, lon) => {
    api.shelters.list(lat, lon).then((res) => {
      if (res?.success && res.data?.shelters) {
        const { verifiedShelters } = validateAndFilterShelters(res.data.shelters, lat, lon, 10);
        setShelters(verifiedShelters);
        setSelectedShelter(verifiedShelters[0] || null);
      } else {
        setShelterError(res?.error || "Failed to load shelters");
      }
    }).catch((err) => setShelterError(err.message));

    api.weather.now(lat, lon).then((res) => {
      if (res?.success && res.data) setWeather(res.data);
      else setWeatherError(res?.error || "Unavailable");
    }).catch((err) => setWeatherError(err.message));
  }, []);

  useEffect(() => {
    firmsService.fetchHotspots().then((res) => {
      if (res?.success) {
        setHotspots(res.hotspots || []);
      }
    }).catch(() => {});
    setUserLocation([loc.lat, loc.lon]);
    fetchLocationData(loc.lat, loc.lon);
  }, [loc.lat, loc.lon, fetchLocationData]);

  const getLocation = useCallback(() => Promise.resolve([loc.lat, loc.lon]), [loc.lat, loc.lon]);

  const selectShelter = useCallback((s) => {
    setSelectedShelter(s);
    setRouteData(null);
    setRouteError(null);
    const p = popupRefs.current[s.id];
    if (p && p.openOn) p.openOn(p._source._map);
  }, []);

  const handleNavigate = useCallback(async () => {
    if (!selectedShelter) return;
    setRouteLoading(true);
    setRouteError(null);
    try {
      const origin = await getLocation();
      const originStr = `${origin[1]},${origin[0]}`;
      const destStr = `${selectedShelter.lon},${selectedShelter.lat}`;
      const res = await api.route.fetch(originStr, destStr, "walking");
      if (res?.success && res.data) {
        setRouteData(res.data);
      } else {
        setRouteError(res?.error || "Routing failed");
      }
    } catch (err) {
      setRouteError(err.name === "GeolocationPositionError" ? "Could not get your location — enable GPS" : err.message);
    }
    setRouteLoading(false);
  }, [selectedShelter, getLocation]);

  const handleApplyAlternative = () => {
    setAppliedAlternative(true);
    handleNavigate();
  };

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRouteError(null);
    setAppliedAlternative(false);
  }, []);

  const routeGeojson = routeData ? {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: routeData.geometry,
      properties: {},
    }, routeData.geometry.coordinates.length > 0 ? {
      type: "Feature",
      geometry: { type: "Point", coordinates: routeData.geometry.coordinates[0] },
      properties: { icon: "start" },
    } : null, routeData.geometry.coordinates.length > 1 ? {
      type: "Feature",
      geometry: { type: "Point", coordinates: routeData.geometry.coordinates[routeData.geometry.coordinates.length - 1] },
      properties: { icon: "end" },
    } : null].filter(Boolean),
  } : null;

  const routeStyle = () => ({
    color: C.teal,
    weight: 5,
    opacity: 0.9,
    dashArray: null,
  });

  const sorted = [...shelters];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <PageHeader icon={Navigation} title="Disaster Escape Assistant" subtitle="Real-time hazard detection, proactive rerouting, and safe shelter navigation" tone="critical" />
        
        {/* Disaster Scenario Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.panel2, padding: "6px 10px", borderRadius: 10, border: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 11, fontFamily: fontMono, color: C.textFaint, textTransform: "uppercase" }}>Test Scenario:</span>
          {Object.keys(SCENARIOS).map((key) => {
            const sc = SCENARIOS[key];
            const Icon = sc.icon;
            const isAct = activeScenario === key;
            return (
              <button
                key={key}
                onClick={() => { setActiveScenario(key); setAppliedAlternative(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: isAct ? C.red : "transparent",
                  color: isAct ? "#fff" : C.textDim,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={14} />
                <span style={{ textTransform: "capitalize" }}>{key}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Proactive AI Alert Card (High Impact) */}
      <div style={{
        background: `linear-gradient(135deg, ${C.redDim}, ${C.panel2})`,
        border: `1.5px solid ${C.red}`,
        borderRadius: 14,
        padding: "18px 22px",
        marginBottom: 18,
        boxShadow: S.glow(C.red),
        animation: "slideIn 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.red}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={24} color={C.red} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: fontMono, fontSize: 12, color: C.red, textTransform: "uppercase", fontWeight: 800 }}>PROACTIVE EMERGENCY ALERT</span>
                <Badge tone="critical">AUTOMATIC HAZARD DETECTION</Badge>
              </div>
              <div style={{ fontSize: 17, color: C.text, fontWeight: 800, marginTop: 4, lineHeight: 1.3 }}>
                {scenario.alertMessage}
              </div>
              <div style={{ fontSize: 14, color: C.textDim, marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: C.teal, fontWeight: 700 }}>✓ {scenario.recommendation}</span>
                <span style={{ color: C.textFaint }}>&middot;</span>
                <span style={{ color: C.amber, fontWeight: 600 }}>Nearest shelter: {sorted.length > 0 ? `${sorted[0].name} (${sorted[0].dist})` : "Loading..."}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, alignSelf: "center" }}>
            <Button
              variant={appliedAlternative ? "success" : "danger"}
              onClick={handleApplyAlternative}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", fontWeight: 800, fontSize: 14 }}
            >
              <Sparkles size={16} />
              {appliedAlternative ? "Safe Route Active" : "Switch to Alternative Route"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Interactive Map & Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18 }}>
        <div>
          <Panel style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
            <MapFrame height={480} geojson={routeGeojson} geoStyle={routeStyle}>
              <EscapeMapContent shelters={sorted} hotspots={hotspots} selectedShelter={selectedShelter} popupRefs={popupRefs} onSelect={selectShelter} />
            </MapFrame>

            <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.line}` }}>
              {routeData ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: fontMono, color: C.teal }}>
                      <Route size={16} />
                      <span style={{ fontWeight: 700 }}>{routeData.distance_km} km</span>
                    </div>
                    <div style={{ fontFamily: fontMono, fontSize: 13, color: C.textDim }}>
                      &middot; {formatDuration(routeData.duration_min)}
                    </div>
                    <div style={{ fontSize: 12, color: C.teal, fontWeight: 700, textTransform: "capitalize" }}>
                      &middot; Evacuation Safe Route
                    </div>
                  </div>
                  <Button variant="ghost" ariaLabel="Clear route" onClick={clearRoute} style={{ padding: "6px 12px" }}>
                    <X size={14} /> Clear
                  </Button>
                </div>
              ) : routeError ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.red, fontFamily: fontMono }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
                  {routeError}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontFamily: fontMono, color: C.textDim }}>
                  <Shield size={16} color={C.teal} />
                  {sorted.length > 0
                    ? `${sorted.length} open emergency shelters mapped in your vector`
                    : "Loading shelters..."}
                </div>
              )}
            </div>
          </Panel>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel title="Weather & Conditions" style={{ flexShrink: 0 }}>
            {weather ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.blueGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CloudRain size={24} color={C.blue} />
                  </div>
                  <div>
                    <div style={{ fontFamily: fontDisplay, fontSize: 36, fontWeight: 800, color: C.text, lineHeight: 1 }}>{weather.temp_c}°C</div>
                    <div style={{ fontSize: 14, color: C.textDim }}>{weather.condition}</div>
                  </div>
                </div>
                {weather.wind_speed_mph && (
                  <div style={{ textAlign: "right", fontSize: 13, color: C.textDim, lineHeight: 2 }}>
                    <div><Wind size={13} style={{ marginRight: 6, verticalAlign: -2 }} />{weather.wind_speed_mph} mph {weather.wind_direction}</div>
                    {weather.humidity != null && <div><Droplets size={13} style={{ marginRight: 6, verticalAlign: -2 }} />{weather.humidity}% Humidity</div>}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: C.textFaint, fontSize: 13 }}>{weatherError || "Loading..."}</div>
            )}
          </Panel>

          <Panel title="Nearby Emergency Shelters" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="scrollbar" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, maxHeight: 380 }}>
              {(shelterError && sorted.length === 0) ? (
                <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: 20 }}>{shelterError}</div>
              ) : sorted.length === 0 ? (
                <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: 20 }}>
                  {userLocation
                    ? "No shelters found near your location in OpenStreetMap."
                    : "Acquiring GPS location to find nearby shelters..."}
                </div>
              ) : sorted.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => selectShelter(s)}
                  role="button" tabIndex={0}
                  aria-label={`Select ${s.name}`}
                  onKeyDown={(e) => e.key === "Enter" && selectShelter(s)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: selectedShelter?.id === s.id ? C.tealDim : C.panel2,
                    border: `1px solid ${selectedShelter?.id === s.id ? C.teal + "66" : C.line}`,
                    borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                    transition: "all 0.15s", animation: `slideUp 0.3s ease ${i * 0.04}s both`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: selectedShelter?.id === s.id ? C.tealDim : C.blueGlow,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <MapPin size={16} color={selectedShelter?.id === s.id ? C.teal : C.blue} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</div>
                      <div style={{ fontFamily: fontMono, fontSize: 12, color: C.textFaint, marginTop: 2 }}>{s.dist} &middot; {s.cap}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color={selectedShelter?.id === s.id ? C.teal : C.textFaint} />
                </div>
              ))}
            </div>
          </Panel>

          {selectedShelter && (
            <Button
              variant={routeLoading ? "ghost" : "success"}
              ariaLabel={`Get route to ${selectedShelter.name}`}
              onClick={handleNavigate}
              disabled={routeLoading}
              style={{ padding: "14px 20px", fontWeight: 700, fontSize: 15, justifyContent: "center", gap: 8 }}
            >
              <Route size={18} />
              {routeLoading ? "Calculating route..." : routeData ? "Recalculate route" : "Show route on map"}
            </Button>
          )}

          {routeData && routeData.legs && routeData.legs[0] && routeData.legs[0].steps && (
            <Panel title="Turn-by-Turn Directions">
              <div className="scrollbar" style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {routeData.legs[0].steps.map((step, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 12px", background: C.panel2, borderRadius: 8,
                    fontSize: 13, color: C.textDim,
                  }}>
                    <span style={{ fontFamily: fontMono, fontSize: 11, color: C.teal, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                    <div style={{ flex: 1, lineHeight: 1.4 }}>
                      <span style={{ color: C.text, fontWeight: 600 }}>{step.instruction}</span>
                      {step.name && <span style={{ color: C.textFaint }}> — {step.name}</span>}
                    </div>
                    <span style={{ fontFamily: fontMono, fontSize: 11, color: C.textFaint, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {step.distance_m < 1000 ? `${step.distance_m}m` : `${(step.distance_m / 1000).toFixed(1)}km`}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

