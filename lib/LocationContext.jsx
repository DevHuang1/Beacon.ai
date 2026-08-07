import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const LocationContext = createContext(null);

function loadLocation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("beacon_profile_location");
    if (raw) {
      const loc = JSON.parse(raw);
      const lat = parseFloat(loc.lat);
      const lon = parseFloat(loc.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon, label: loc.label || `${lat.toFixed(4)}, ${lon.toFixed(4)}` };
      }
    }
  } catch {}
  return null;
}

function saveLocation(lat, lon, label) {
  try {
    localStorage.setItem("beacon_profile_location", JSON.stringify({
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
      label: label || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    }));
  } catch {}
}

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState({ lat: 40.802, lon: -124.163, label: "40.8020°N, 124.1630°W", isDefault: true });
  const [gpsStatus, setGpsStatus] = useState("default");

  const updateLocation = useCallback((lat, lon, label) => {
    setLocationState({ lat, lon, label: label || `${lat.toFixed(4)}, ${lon.toFixed(4)}`, isDefault: false });
    saveLocation(lat, lon, label);
    setGpsStatus("saved");
  }, []);

  const refreshGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    setGpsStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocationState({ lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, accuracy: pos.coords.accuracy, isDefault: false });
        saveLocation(lat, lon);
        setGpsStatus("live");
      },
      () => {
        const saved = loadLocation();
        if (saved) {
          setLocationState({ ...saved, isDefault: false });
          setGpsStatus("saved");
        } else {
          setGpsStatus("default");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    // Load the saved location after mount (not during render) so the SSR
    // markup and the first client render match — reading localStorage during
    // render would cause React hydration mismatches. If no location was
    // saved (Profile > Settings), auto-acquire live GPS on first launch.
    const saved = loadLocation();
    if (saved) {
      setLocationState({ ...saved, isDefault: false });
      setGpsStatus("saved");
    } else {
      refreshGps();
    }
  }, [refreshGps]);

  const latDir = location.lat >= 0 ? "N" : "S";
  const lonDir = location.lon >= 0 ? "E" : "W";
  const coords = `${Math.abs(location.lat).toFixed(4)}°${latDir}, ${Math.abs(location.lon).toFixed(4)}°${lonDir}`;
  const displayLabel = location.label || coords;

  return (
    <LocationContext.Provider value={{
      ...location,
      coords,
      displayLabel,
      gpsStatus,
      isRealGPS: gpsStatus === "live",
      updateLocation,
      refreshGps,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}

export default LocationContext;
