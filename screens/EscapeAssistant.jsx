import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { PageHeader, Panel, Button, Badge } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import {
  Navigation, MapPin, CloudRain, Wind, Droplets, Shield, ChevronRight,
  Route, X, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { C, S, fontDisplay, fontMono } from "../lib/theme";
import { api } from "../lib/api";
import shelterService from "../lib/services/shelterService";
import { validateAndFilterShelters } from "../lib/haversine";
import { useShelters, useWeatherNow, useWeatherAlerts, useHotspots } from "../lib/swr";
import { useLocation } from "../lib/LocationContext";

const EscapeMapContent = dynamic(() => import("./EscapeMapContent"), { ssr: false });

function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const ALERT_SEVERITY_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };

export default function EscapeAssistant() {
  const loc = useLocation();
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [userLocation, setUserLocation] = useState([loc.lat, loc.lon]);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const popupRefs = useRef({});

  const radius = shelterService.getDefaultRadius();
  const { shelters, shelterError, shelterLoading } = useShelters(loc.lat, loc.lon);
  const { weather, weatherError } = useWeatherNow(loc.lat, loc.lon);
  const { alerts } = useWeatherAlerts(loc.lat, loc.lon);
  const { hotspots } = useHotspots();

  useEffect(() => {
    setUserLocation([loc.lat, loc.lon]);
  }, [loc.lat, loc.lon]);

  useEffect(() => {
    setSelectedShelter((prev) => (prev && shelters.some((s) => s.id === prev.id)) ? prev : (shelters[0] || null));
  }, [shelters]);

  const verifiedShelters = React.useMemo(
    () => validateAndFilterShelters(shelters, loc.lat, loc.lon, radius).verifiedShelters,
    [shelters, loc.lat, loc.lon, radius]
  );

  const topAlert = alerts.length > 0
    ? [...alerts].sort((a, b) => (ALERT_SEVERITY_RANK[b.severity] || 0) - (ALERT_SEVERITY_RANK[a.severity] || 0))[0]
    : null;
  const alertTone = topAlert && (ALERT_SEVERITY_RANK[topAlert.severity] || 0) >= 3 ? "critical" : "warning";
  const alertColor = alertTone === "critical" ? C.red : C.amber;

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
      if (res?.success && res.data?.routes?.length) {
        setRouteData(res.data.routes[0]);
      } else {
        setRouteError(res?.error || "Routing failed");
      }
    } catch (err) {
      setRouteError(err.name === "GeolocationPositionError" ? "Could not get your location — enable GPS" : err.message);
    }
    setRouteLoading(false);
  }, [selectedShelter, getLocation]);

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRouteError(null);
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

  const sorted = verifiedShelters;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <PageHeader icon={Navigation} title="Disaster Escape Assistant" subtitle="Real-time hazard detection, proactive rerouting, and safe shelter navigation" tone="critical" />
      </div>

      {/* Live NWS Alert Card */}
      {topAlert ? (
        <div style={{
          background: `linear-gradient(135deg, ${alertColor === C.red ? C.redDim : C.amberDim}, ${C.panel2})`,
          border: `1.5px solid ${alertColor}`,
          borderRadius: 14,
          padding: "18px 22px",
          marginBottom: 18,
          boxShadow: S.glow(alertColor),
          animation: "slideIn 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${alertColor}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={24} color={alertColor} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: fontMono, fontSize: 12, color: alertColor, textTransform: "uppercase", fontWeight: 800 }}>
                    {alertTone === "critical" ? "ACTIVE EMERGENCY ALERT" : "ACTIVE WEATHER ALERT"}
                  </span>
                  <Badge tone={alertTone}>{topAlert.severity || "ACTIVE"}</Badge>
                </div>
                <div style={{ fontSize: 17, color: C.text, fontWeight: 800, marginTop: 4, lineHeight: 1.3 }}>
                  {topAlert.headline || topAlert.type || "Weather alert"}
                </div>
                <div style={{ fontSize: 14, color: C.textDim, marginTop: 6, lineHeight: 1.5 }}>
                  {topAlert.description || topAlert.areaDesc || ""}
                </div>
                <div style={{ fontSize: 12, color: C.textFaint, marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: C.textDim, fontWeight: 600 }}>Nearest shelter: {sorted.length > 0 ? `${sorted[0].name} (${sorted[0].dist})` : "Loading..."}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: C.tealDim,
          border: `1.5px solid ${C.teal}66`,
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 18,
          animation: "slideIn 0.3s ease",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.teal}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck size={24} color={C.teal} />
          </div>
          <div>
            <div style={{ fontFamily: fontMono, fontSize: 12, color: C.teal, textTransform: "uppercase", fontWeight: 800 }}>NO ACTIVE ALERTS</div>
            <div style={{ fontSize: 15, color: C.text, fontWeight: 700, marginTop: 4 }}>
              No active NWS alerts for your area
            </div>
          </div>
        </div>
      )}

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
              {shelterLoading && sorted.length === 0 ? (
                <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: 20 }}>
                  {userLocation
                    ? "Locating nearby shelters..."
                    : "Acquiring GPS location to find nearby shelters..."}
                </div>
              ) : (shelterError && sorted.length === 0) ? (
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

