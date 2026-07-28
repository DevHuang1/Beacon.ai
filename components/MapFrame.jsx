import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMapEvent, useMap, Circle } from "react-leaflet";
import Button from "./Button";
import { C, S, fontMono } from "../lib/theme";

let leafletIconsFixed = false;
function fixLeafletIcons() {
  if (leafletIconsFixed) return;
  try {
    const L = require("leaflet");
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/images/marker-icon-2x.png",
      iconUrl: "/images/marker-icon.png",
      shadowUrl: "/images/marker-shadow.png",
    });
    leafletIconsFixed = true;
  } catch (e) {}
}

function TileErrorWatcher({ onError }) {
  useMapEvent("tileerror", () => onError());
  return null;
}

function LocationLayer({ position, accuracy }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position]);
  if (!position) return null;
  return (
    <>
      <Circle center={position} radius={Math.max(accuracy || 30, 1)} pathOptions={{ color: C.teal, fillColor: C.teal, fillOpacity: 0.15 }} />
      <Circle center={position} radius={6} pathOptions={{ color: C.teal, fillColor: C.teal }} />
    </>
  );
}

export default function MapFrame({
  children, height = 380,
  center: propCenter,
  zoom = 13, geojson = null, geoStyle = null, overlay = null,
}) {
  const [tileFailed, setTileFailed] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [mapCenter, setMapCenter] = useState(propCenter || [40.8, -124.16]);

  const [userPos, setUserPos] = useState(null);
  const [userAcc, setUserAcc] = useState(null);
  const [watching, setWatching] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
    import("leaflet/dist/leaflet.css");
  }, []);

  useEffect(() => {
    if (propCenter) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setMapCenter(pos);
        setUserPos(pos);
        setUserAcc(p.coords.accuracy);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (watchId != null && navigator.geolocation && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const locateOnce = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setMapCenter(pos);
        setUserPos(pos);
        setUserAcc(p.coords.accuracy);
        setLocating(false);
      },
      (err) => { alert("Location error: " + err.message); setLocating(false); },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const toggleWatch = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    if (!watching) {
      const id = navigator.geolocation.watchPosition(
        (p) => {
          const pos = [p.coords.latitude, p.coords.longitude];
          setMapCenter(pos);
          setUserPos(pos);
          setUserAcc(p.coords.accuracy);
        },
        (err) => { console.warn("watchPosition error", err); },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
      setWatchId(id);
      setWatching(true);
    } else {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setWatching(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: 14, overflow: "hidden" }}>
      <MapContainer key={mapKey} center={mapCenter} zoom={zoom} style={{ width: "100%", height: "100%", borderRadius: 14 }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">Carto</a>, &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          errorTileUrl="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Crect width='100%25' height='100%25' fill='%23F8FAFC'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748B' font-size='12'%3ETile error%3C/text%3E%3C/svg%3E"
        />
        <TileErrorWatcher onError={() => setTileFailed(true)} />
        {geojson && <GeoJSON data={geojson} style={geoStyle || undefined} />}
        <LocationLayer position={userPos} accuracy={userAcc} />
        {children}
      </MapContainer>

      <div style={{ position: "absolute", right: 12, top: 12, zIndex: 1200, pointerEvents: "auto", display: "flex", gap: 8 }}>
        <div style={{
          background: `${C.bg}CC`, color: C.textFaint, padding: "4px 10px", borderRadius: 8,
          fontSize: 11, fontFamily: fontMono, fontWeight: 500,
          backdropFilter: "blur(8px)", border: `1px solid ${C.line}`,
        }}>
          {mapCenter ? `${mapCenter[0].toFixed(4)}, ${mapCenter[1].toFixed(4)}` : ""}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant={locating ? "ghost" : "secondary"} ariaLabel="Center on your location" onClick={locateOnce} style={{ padding: "6px 10px", minHeight: 34, fontSize: 12 }}>
            {locating ? "..." : "Locate"}
          </Button>
          <Button variant={watching ? "danger" : "secondary"} ariaLabel="Live tracking" onClick={toggleWatch} style={{ padding: "6px 10px", minHeight: 34, fontSize: 12 }}>
            {watching ? "Stop" : "Watch"}
          </Button>
        </div>
      </div>

      {tileFailed && (
        <div style={{
          position: "absolute", left: 12, top: 12, pointerEvents: "auto",
          background: `${C.panel}DD`, padding: 14, borderRadius: 10,
          border: `1px solid ${C.line}`, boxShadow: S.lg, zIndex: 1000,
          maxWidth: 320, backdropFilter: "blur(12px)",
        }}>
          <div style={{ fontSize: 14, color: C.text, marginBottom: 8, fontWeight: 700 }}>Base map tiles failed to load</div>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>Tile server unreachable. Try a different network or retry.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="success" ariaLabel="Retry tiles" onClick={() => { setMapKey(k => k + 1); setTileFailed(false); }} style={{ padding: "8px 14px", fontWeight: 600 }}>
              Retry
            </Button>
            <Button variant="secondary" ariaLabel="Open OpenStreetMap" onClick={() => window.open("https://www.openstreetmap.org", "_blank")}>
              Open OSM
            </Button>
          </div>
        </div>
      )}
      {overlay}
    </div>
  );
}
