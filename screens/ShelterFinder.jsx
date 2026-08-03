import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PageHeader, Panel, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import { Search, Home, MapPin, LocateFixed, ChevronRight, Navigation, CheckCircle2, Route, Sparkles, ShieldCheck, Compass } from "lucide-react";
import { C, S, fontBody, fontMono, fontDisplay } from "../lib/theme";
import ShelterCard from "../components/ShelterCard";
import EscapeMapContent from "./EscapeMapContent";
import shelterService from "../lib/services/shelterService";
import routeService from "../lib/services/routeService";
import { validateAndFilterShelters } from "../lib/haversine";
import { useShelters } from "../lib/swr";
import { useLocation } from "../lib/LocationContext";

export default function ShelterFinder() {
  const loc = useLocation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [maxRadius, setMaxRadius] = useState(() => shelterService.getDefaultRadius());
  const [selected, setSelected] = useState(null);
  const [userGps, setUserGps] = useState({ lat: loc.lat, lon: loc.lon, isRealGPS: loc.isRealGPS });
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeGeojson, setRouteGeojson] = useState(null);
  const [routeAlternatives, setRouteAlternatives] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showRadar, setShowRadar] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showStorms, setShowStorms] = useState(true);
  const popupRefs = useRef({});

  const radiusParam = maxRadius === "All" ? 50 : maxRadius;
  const { shelters, userLocation, shelterLoading, mutate } = useShelters(loc.lat, loc.lon, radiusParam);

  useEffect(() => {
    if (userLocation) {
      setUserGps((prev) => ({
        ...prev,
        lat: userLocation.lat,
        lon: userLocation.lon,
        isRealGPS: prev.isRealGPS && loc.isRealGPS,
      }));
    }
  }, [userLocation, loc.isRealGPS]);

  useEffect(() => {
    if (!selected && shelters.length > 0) {
      setSelected(shelters[0]);
      calculateRouteToShelter(userGps, shelters[0]);
    }
  }, [shelters]);

  const handleAiAutoFind = async () => {
    setAiLoading(true);
    const res = await shelterService.findSheltersWithAI(loc.lat, loc.lon);
    if (res.success) {
      mutate({ success: true, data: { shelters: res.shelters, userLocation: { lat: loc.lat, lon: loc.lon } } }, { revalidate: false });
      if (res.recommendedShelter) {
        setSelected(res.recommendedShelter);
        calculateRouteToShelter(res.userCoords, res.recommendedShelter);
      }
      if (res.aiData) {
        setAiAnalysis(res.aiData);
      }
    }
    setAiLoading(false);
  };

  const buildAlternativesGeojson = (primary, alternatives) => {
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
  };

  const routeStyle = (feature) => {
    if (feature?.properties?.role === "alternative") {
      return { color: "#0D9488", weight: 3, opacity: 0.4, dashArray: "6 6" };
    }
    return { color: "#0D9488", weight: 6, opacity: 0.9 };
  };

  const calculateRouteToShelter = useCallback(async (originCoords, destinationShelter) => {
    if (!destinationShelter) return;
    setRouteLoading(true);
    const res = await routeService.calculateEvacuationRoute(
      originCoords || userGps,
      destinationShelter,
      "driving"
    );

    if (res.success && res.routes?.length > 0) {
      setRouteAlternatives(res.routes);
      setRouteInfo(res.routes[0]);
      setRouteGeojson(buildAlternativesGeojson(res.routes[0], res.routes));
    } else {
      setRouteAlternatives([]);
      setRouteInfo(null);
      setRouteGeojson(null);
    }
    setRouteLoading(false);
  }, [userGps]);

  const selectAlternative = (index) => {
    const target = routeAlternatives[index];
    if (!target) return;
    setRouteInfo(target);
    setRouteGeojson(buildAlternativesGeojson(target, routeAlternatives));
  };

  // Client-side Haversine distance validation & radius cutoff
  const { verifiedShelters, filteredCount } = useMemo(() => {
    if (!userGps) return { verifiedShelters: shelters, filteredCount: 0 };
    return validateAndFilterShelters(shelters, userGps.lat, userGps.lon, maxRadius);
  }, [shelters, userGps, maxRadius]);

  const filtered = useMemo(() => {
    return verifiedShelters.filter((s) => {
      const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.address && s.address.toLowerCase().includes(query.toLowerCase()));
      const matchesFilter = filter === "All" || (s.facilities || []).includes(filter);
      return matchesQuery && matchesFilter;
    });
  }, [query, filter, verifiedShelters]);

  const handleSelectShelter = (sh) => {
    setSelected(sh);
    calculateRouteToShelter(userGps, sh);
    const p = popupRefs.current[sh.id];
    if (p && p.openOn) p.openOn(p._source._map);
  };

  const handleOpenDirections = (sh) => {
    const q = encodeURIComponent(sh.name);
    const ll = `${sh.lat},${sh.lon}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
    window.open(url, "_blank");
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <PageHeader icon={Home} title="Emergency Shelter Finder" subtitle="Search and locate open shelters by capacity, facilities, and proximity" tone="safe" />

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, position: "relative", minWidth: 260 }}>
          <Search size={16} color={C.textFaint} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shelters by name, street, or facility"
            aria-label="Search shelters"
            style={{
              width: "100%", background: C.panel2, border: `1px solid ${C.line}`,
              borderRadius: 10, padding: "12px 16px 12px 42px", color: C.text, fontSize: 14,
            }}
          />
        </div>
        <select
          aria-label="Facility filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: C.panel2, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14,
            minWidth: 150, fontWeight: 600,
          }}
        >
          {["All", "Pets welcome", "ADA access", "Medical", "Family rooms", "Hot Meals", "Charging Stations"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        {/* Dynamic Radius Radius Filter */}
        <select
          aria-label="Max Proximity Radius"
          value={maxRadius}
          onChange={(e) => setMaxRadius(e.target.value === "All" ? "All" : Number(e.target.value))}
          style={{
            background: C.panel2, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14,
            minWidth: 170, fontWeight: 700,
          }}
        >
          <option value={3}>Within 3 Miles</option>
          <option value={5}>Within 5 Miles</option>
          <option value={10}>Within 10 Miles (Default)</option>
          <option value={25}>Within 25 Miles</option>
          <option value="All">All Distances</option>
        </select>

        <Button
          variant="secondary"
          onClick={() => mutate()}
          disabled={shelterLoading || aiLoading}
          style={{ padding: "0 16px", display: "flex", alignItems: "center", gap: 8, height: 46 }}
          ariaLabel="Refresh nearest shelters from current GPS coordinates"
        >
          <LocateFixed size={16} color={userGps?.isRealGPS ? C.teal : C.blue} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {shelterLoading && !aiLoading ? "Locating..." : userGps?.isRealGPS ? "GPS Active" : "Use GPS"}
          </span>
        </Button>
        <Button
          variant="primary"
          onClick={handleAiAutoFind}
          disabled={aiLoading}
          style={{ padding: "0 18px", display: "flex", alignItems: "center", gap: 8, height: 46, background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
          ariaLabel="Auto find optimal shelter using AI and current GPS location"
        >
          <Sparkles size={16} color="#FFFFFF" />
          <span style={{ fontSize: 13, fontWeight: 800 }}>
            {aiLoading ? "AI Analyzing..." : "AI Auto-Find"}
          </span>
        </Button>
      </div>

      {/* Geolocation Haversine Validation Summary Banner */}
      <Panel style={{
        marginBottom: 18,
        border: `1px solid ${C.teal + "55"}`,
        background: `linear-gradient(135deg, ${C.tealDim}, ${C.panel})`,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={20} color={C.teal} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
              <span>Client-Side Geolocation Validation Check</span>
              <span style={{ fontSize: 11, background: C.teal, color: "#FFF", padding: "1px 6px", borderRadius: 4 }}>
                Active
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
              Haversine distance verified from GPS ({userGps ? `${userGps.lat.toFixed(4)}, ${userGps.lon.toFixed(4)}` : "Acquiring..."})
              {maxRadius !== "All" ? ` • ${verifiedShelters.length} shelter(s) within ${maxRadius}-mile radius` : ` • ${verifiedShelters.length} shelters shown`}
              {filteredCount > 0 && <span style={{ color: C.red, fontWeight: 700 }}> ({filteredCount} shelter beyond {maxRadius} mi filtered out)</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, fontFamily: fontMono, color: C.textFaint }}>
            Max Radius: <strong style={{ color: C.teal }}>{maxRadius === "All" ? "Unlimited" : `${maxRadius} mi`}</strong>
          </span>
        </div>
      </Panel>

      {aiAnalysis && (
        <Panel style={{ marginBottom: 18, border: `1px solid #93C5FD`, background: "#EFF6FF", padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "#1E40AF", fontWeight: 800, fontSize: 15 }}>
            <Sparkles size={18} color="#2563EB" />
            <span>AI Shelter Assessment & Guidance</span>
          </div>
          <div style={{ fontSize: 13, color: "#1E3A8A", lineHeight: 1.5, whiteSpace: "pre-line" }}>
            {aiAnalysis.text || aiAnalysis.advisory || "AI has analyzed nearby emergency shelter capacities and routed you to the optimal location."}
          </div>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 18 }}>
        <div className="scrollbar" style={{
          display: "flex", flexDirection: "column", gap: 12,
          maxHeight: 600, overflowY: "auto", paddingRight: 6,
        }}>
          {shelterLoading && (
            <div style={{ padding: 30, textAlign: "center", color: C.textFaint, fontSize: 14, fontWeight: 600 }}>
              Finding shelters nearby...
            </div>
          )}
          {!shelterLoading && filtered.length === 0 && (
            <div style={{ color: C.textFaint, fontSize: 14, padding: 30, textAlign: "center" }}>
              {shelters.length === 0
                ? "No shelters found near your location. OpenStreetMap may not have data for this area."
                : "No shelters match your search query."}
            </div>
          )}
          {filtered.map((s, i) => (
            <div key={s.id} style={{ animation: `slideUp 0.3s ease ${i * 0.04}s both` }}>
              <ShelterCard
                shelter={s}
                selected={selected?.id === s.id}
                onSelect={(sh) => handleSelectShelter(sh)}
                onDirections={(sh) => handleOpenDirections(sh)}
              />
            </div>
          ))}
        </div>

        <Panel style={{ padding: 0, overflow: "hidden", borderRadius: 14, display: "flex", flexDirection: "column" }}>
          <div style={{
            padding: "10px 16px",
            background: C.panel2,
            borderBottom: `1px solid ${C.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            fontSize: 13,
          }}>
            {selected ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Route size={16} color={C.teal} />
                <span style={{ fontWeight: 700, color: C.text }}>Evacuation Route:</span>
                <span style={{ color: C.teal, fontWeight: 700 }}>{selected.name}</span>
                {routeLoading ? (
                  <span style={{ color: C.textFaint, fontFamily: fontMono, fontSize: 12, marginLeft: 8 }}>Routing...</span>
                ) : routeInfo ? (
                  <span style={{ background: `${C.teal}18`, color: C.teal, padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontFamily: fontMono, fontSize: 12, marginLeft: 6 }}>
                    {routeInfo.distance_km} km (~{routeInfo.duration_min} min)
                  </span>
                ) : null}
              </div>
            ) : (
              <div style={{ fontWeight: 700, color: C.text }}>Interactive Disaster Map</div>
            )}

            {routeAlternatives.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
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

            {/* Weather & Disaster Map Layer Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => setShowRadar(!showRadar)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${showRadar ? C.teal : C.line}`,
                  background: showRadar ? `${C.teal}18` : C.panel,
                  color: showRadar ? C.teal : C.textDim,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                📡 Radar
              </button>
              <button
                type="button"
                onClick={() => setShowAlerts(!showAlerts)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${showAlerts ? "#DC2626" : C.line}`,
                  background: showAlerts ? "#FEF2F2" : C.panel,
                  color: showAlerts ? "#DC2626" : C.textDim,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                ⚠️ Alerts
              </button>
              <button
                type="button"
                onClick={() => setShowStorms(!showStorms)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${showStorms ? "#7C3AED" : C.line}`,
                  background: showStorms ? "#F3E8FF" : C.panel,
                  color: showStorms ? "#7C3AED" : C.textDim,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                ⚡ Storms
              </button>
            </div>
          </div>

          <MapFrame
            height={550}
            center={selected ? [selected.lat, selected.lon] : [loc.lat, loc.lon]}
            zoom={13}
            geojson={routeGeojson}
            geoStyle={routeStyle}
          >
            <EscapeMapContent
              shelters={filtered}
              userLocation={userGps}
              selectedShelter={selected}
              popupRefs={popupRefs}
              onSelect={(sh) => handleSelectShelter(sh)}
              showRadar={showRadar}
              showWeatherAlerts={showAlerts}
              showStormCells={showStorms}
            />
          </MapFrame>
        </Panel>
      </div>
    </div>
  );
}

