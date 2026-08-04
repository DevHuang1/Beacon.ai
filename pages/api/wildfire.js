import { fetchWithTimeout } from "../../lib/api-utils";

const DEFAULT_LAT = 40.8;
const DEFAULT_LON = -124.16;

export default async function handler(req, res) {
  const { type, lat, lon, radiusKm } = req.query;

  try {
    const apiKey = process.env.FIRMS_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: "FIRMS_API_KEY not set. Get a free key at https://firms.modaps.eosdis.nasa.gov/api/ and add it to .env.local",
        source: "firms_error",
      });
    }

    const centerLat = parseFloat(lat);
    const centerLon = parseFloat(lon);
    const cLat = Number.isFinite(centerLat) ? centerLat : DEFAULT_LAT;
    const cLon = Number.isFinite(centerLon) ? centerLon : DEFAULT_LON;
    const rKm = Number.isFinite(parseFloat(radiusKm)) ? Math.max(parseFloat(radiusKm), 10) : 300;

    const degLat = rKm / 110.574;
    const degLon = rKm / (111.32 * Math.max(Math.cos((cLat * Math.PI) / 180), 0.01));
    const minLat = (cLat - degLat).toFixed(4);
    const maxLat = (cLat + degLat).toFixed(4);
    const minLon = (cLon - degLon).toFixed(4);
    const maxLon = (cLon + degLon).toFixed(4);

    const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_NOAA20_NRT/${minLon},${minLat},${maxLon},${maxLat}/1`;
    const firmsRes = await fetchWithTimeout(firmsUrl, {}, 3000);

    if (!firmsRes.ok) {
      // Clear error so user knows they need a FIRMS key
      return res.status(200).json({
        success: false,
        error: `NASA FIRMS API returned ${firmsRes.status}. Check your FIRMS_API_KEY in .env.local`,
        source: "firms_error",
      });
    }

    const csv = await firmsRes.text();
    const lines = csv.trim().split("\n").slice(1).filter((l) => l.trim());

    const distKm = (aLat, aLon) => {
      const dLat = ((aLat - cLat) * Math.PI) / 180;
      const dLon = ((aLon - cLon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((cLat * Math.PI) / 180) * Math.cos((aLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const hotspots = lines
      .map((line) => {
        const parts = line.split(",");
        return {
          latitude: parseFloat(parts[0] || 0),
          longitude: parseFloat(parts[1] || 0),
          intensity: Math.min(parseFloat(parts[12] || 0) / 100, 1) || 0.3,
          frp: parseFloat(parts[12] || 0),
          acq_date: parts[5] || "",
          acq_time: parts[6] || "",
          satellite: parts[7] || "",
          confidence: parseFloat(parts[9] || 0),
        };
      })
      .filter((h) => Number.isFinite(h.latitude) && Number.isFinite(h.longitude))
      .filter((h) => distKm(h.latitude, h.longitude) <= rKm)
      .sort((a, b) => distKm(a.latitude, a.longitude) - distKm(b.latitude, b.longitude))
      .slice(0, 10);

    const conditions = {
      active_hotspots: hotspots.length,
      mean_frp: hotspots.reduce((s, h) => s + h.frp, 0) / hotspots.length || 0,
      center: { lat: cLat, lon: cLon, radius_km: rKm },
    };

    if (type === "hotspots") {
      return res.status(200).json({ success: true, data: hotspots, source: "firms" });
    }

    return res.status(200).json({ success: true, data: { hotspots, conditions }, source: "firms" });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, source: "firms_error" });
  }
}
