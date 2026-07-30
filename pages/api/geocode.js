import { fetchWithTimeout } from "../../lib/api-utils";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api/";

async function searchNominatim(query, limit) {
  const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=${limit}&accept-language=en`;
  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": "BeaconAI-EmergencyApp/1.0" },
  }, 6000);
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  const data = await response.json();
  return (data || []).map((r) => {
    const addr = r.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || "";
    const state = addr.state || "";
    const country = addr.country || "";
    const parts = [city, state, country].filter(Boolean);
    const shortLabel = parts.length > 0 ? parts.join(", ") : r.display_name;
    return {
      label: shortLabel,
      fullLabel: r.display_name,
      lat: parseFloat(r.lat).toFixed(6),
      lon: parseFloat(r.lon).toFixed(6),
      type: r.type || "city",
    };
  });
}

async function searchPhoton(query, limit) {
  const url = `${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=${limit}&lang=en`;
  const response = await fetchWithTimeout(url, {}, 6000);
  if (!response.ok) throw new Error(`Photon HTTP ${response.status}`);
  const data = await response.json();
  const features = data.features || [];
  return features.map((f) => {
    const props = f.properties || {};
    const coords = f.geometry?.coordinates || [0, 0];
    const city = props.name || props.city || "";
    const state = props.state || "";
    const country = props.country || "";
    const parts = [city, state, country].filter(Boolean);
    const shortLabel = parts.length > 0 ? parts.join(", ") : city || `${coords[1]}, ${coords[0]}`;
    return {
      label: shortLabel,
      fullLabel: shortLabel,
      lat: coords[1]?.toFixed(6),
      lon: coords[0]?.toFixed(6),
      type: props.osm_value || props.type || "city",
    };
  });
}

export default async function handler(req, res) {
  const { q, limit = 5 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: "Query too short" });
  }

  const maxLimit = Math.min(parseInt(limit, 10) || 5, 10);

  try {
    const results = await searchNominatim(q, maxLimit);
    return res.status(200).json({ results });
  } catch (err) {
    console.warn("Nominatim failed, trying Photon fallback:", err.message);
  }

  try {
    const results = await searchPhoton(q, maxLimit);
    return res.status(200).json({ results });
  } catch (err) {
    console.error("Photon fallback also failed:", err.message);
    return res.status(502).json({ error: "Geocoding service unavailable" });
  }
}
