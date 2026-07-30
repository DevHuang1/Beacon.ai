import { fetchWithTimeout } from "../../lib/api-utils";

export default async function handler(req, res) {
  const { type } = req.query;

  try {
    const apiKey = process.env.FIRMS_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: "FIRMS_API_KEY not set. Get a free key at https://firms.modaps.eosdis.nasa.gov/api/ and add it to .env.local",
        source: "firms_error",
      });
    }
    const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_NOAA20_NRT/world/1`;
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
    const lines = csv.trim().split("\n").slice(1);
    if (!lines.length) throw new Error("No FIRMS data returned");

    const hotspots = lines.slice(0, 50).map((line) => {
      const parts = line.split(",");
      return {
        latitude: parseFloat(parts[0] || 0),
        longitude: parseFloat(parts[1] || 0),
        intensity: Math.min(parseFloat(parts[8] || 0) / 100, 1) || 0.3,
        frp: parseFloat(parts[8] || 0),
        acq_date: parts[5] || "",
        satellite: parts[3] || "",
      };
    });

    const conditions = {
      active_hotspots: hotspots.length,
      mean_frp: hotspots.reduce((s, h) => s + h.frp, 0) / hotspots.length || 0,
    };

    if (type === "hotspots") {
      return res.status(200).json({ success: true, data: hotspots, source: "firms" });
    }

    return res.status(200).json({ success: true, data: { hotspots, conditions }, source: "firms" });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, source: "firms_error" });
  }
}
