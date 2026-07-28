import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PageHeader, Panel, Button } from "../components";
import MapFrame from "../components/MapFrameWrapper";
import { Search, Home, MapPin, LocateFixed, ChevronRight, Navigation, CheckCircle2, Route } from "lucide-react";
import { C, S, fontBody, fontMono, fontDisplay } from "../lib/theme";
import ShelterCard from "../components/ShelterCard";
import EscapeMapContent from "./EscapeMapContent";
import shelterService from "../lib/services/shelterService";
import routeService from "../lib/services/routeService";

export default function ShelterFinder() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userGps, setUserGps] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeGeojson, setRouteGeojson] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const popupRefs = useRef({});

  useEffect(() => {
    loadNearestShelters();
  }, []);

  const loadNearestShelters = async () => {
    setLoading(true);
    const res = await shelterService.fetchNearestShelters();
    if (res.success) {
      setShelters(res.shelters);
      setUserGps(res.userCoords);
      if (res.shelters.length > 0) {
        const primary = res.shelters[0];
        setSelected(primary);
        calculateRouteToShelter(res.userCoords, primary);
      }
    }
    setLoading(false);
  };

  const calculateRouteToShelter = useCallback(async (originCoords, destinationShelter) => {
    if (!destinationShelter) return;
    setRouteLoading(true);
    const res = await routeService.calculateEvacuationRoute(
      originCoords || userGps,
      destinationShelter,
      "driving"
    );

    if (res.success) {
      setRouteInfo(res.route);
      setRouteGeojson(res.geojson);
    } else {
      setRouteInfo(null);
      setRouteGeojson(null);
    }
    setRouteLoading(false);
  }, [userGps]);

  const filtered = useMemo(() => {
    return shelters.filter((s) => {
      const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.address && s.address.toLowerCase().includes(query.toLowerCase()));
      const matchesFilter = filter === "All" || (s.facilities || []).includes(filter);
      return matchesQuery && matchesFilter;
    });
  }, [query, filter, shelters]);

  const handleSelectShelter = (sh) => {
    setSelected(sh);
    calculateRouteToShelter(userGps, sh);
    if (popupRefs.current[sh.id] && popupRefs.current[sh.id].openPopup) {
      popupRefs.current[sh.id].openPopup();
    }
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
          aria-label="Filter shelters"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: C.panel2, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14,
            minWidth: 180, fontWeight: 600,
          }}
        >
          {["All", "Pets welcome", "ADA access", "Medical", "Family rooms", "Hot Meals", "Charging Stations"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={loadNearestShelters}
          disabled={loading}
          style={{ padding: "0 16px", display: "flex", alignItems: "center", gap: 8, height: 46 }}
          ariaLabel="Acquire current GPS coordinates and update nearest shelters"
        >
          <LocateFixed size={16} color={userGps?.isRealGPS ? C.teal : C.blue} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {loading ? "Locating..." : userGps?.isRealGPS ? "GPS Active" : "Use GPS"}
          </span>
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 18 }}>
        <div className="scrollbar" style={{
          display: "flex", flexDirection: "column", gap: 12,
          maxHeight: 600, overflowY: "auto", paddingRight: 6,
        }}>
          {loading && [1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ color: C.textFaint, fontSize: 14, padding: 30, textAlign: "center" }}>
              {shelters.length === 0 ? "Loading shelter data..." : "No shelters match your search query."}
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
          {selected && (
            <div style={{
              padding: "10px 16px",
              background: C.panel2,
              borderBottom: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 13,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Route size={16} color={C.teal} />
                <span style={{ fontWeight: 700, color: C.text }}>Evacuation Route:</span>
                <span style={{ color: C.teal, fontWeight: 700 }}>{selected.name}</span>
              </div>
              {routeLoading ? (
                <span style={{ color: C.textFaint, fontFamily: fontMono, fontSize: 12 }}>Calculating polyline route...</span>
              ) : routeInfo ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: fontMono, fontSize: 12 }}>
                  <span style={{ background: `${C.teal}18`, color: C.teal, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                    {routeInfo.distance_km} km
                  </span>
                  <span style={{ color: C.textFaint }}>
                    ~{routeInfo.duration_min} min drive
                  </span>
                </div>
              ) : null}
            </div>
          )}

          <MapFrame
            height={550}
            center={selected ? [selected.lat, selected.lon] : [40.802, -124.163]}
            zoom={13}
            geojson={routeGeojson}
            geoStyle={routeService.getPolylineStyle("#0D9488")}
          >
            <EscapeMapContent
              shelters={filtered}
              selectedShelter={selected}
              popupRefs={popupRefs}
              onSelect={(sh) => handleSelectShelter(sh)}
            />
          </MapFrame>
        </Panel>
      </div>
    </div>
  );
}

