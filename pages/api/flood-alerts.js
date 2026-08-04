import { fetchWithTimeout } from "../../lib/api-utils";

const DEFAULT_LAT = 40.8;
const DEFAULT_LON = -124.16;
const ALERT_TONE = { Green: "low", Orange: "moderate", Red: "high" };
const MAX_ALERTS = 3;

function distKm(aLat, aLon, bLat, bLon) {
  const dLat = ((aLat - bLat) * Math.PI) / 180;
  const dLon = ((aLon - bLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((bLat * Math.PI) / 180) * Math.cos((aLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(req, res) {
  const { lat, lon, radiusKm } = req.query;

  try {
    const centerLat = parseFloat(lat);
    const centerLon = parseFloat(lon);
    const cLat = Number.isFinite(centerLat) ? centerLat : DEFAULT_LAT;
    const cLon = Number.isFinite(centerLon) ? centerLon : DEFAULT_LON;
    const rKm = Number.isFinite(parseFloat(radiusKm)) ? Math.max(parseFloat(radiusKm), 10) : 250;

    const rss = await fetchWithTimeout("https://www.gdacs.org/xml/rss_24h.xml", {}, 15000);
    if (!rss.ok) throw new Error(`GDACS returned ${rss.status}`);

    const xml = await rss.text();
    const events = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml))) {
      const raw = m[1];
      const type = (/<(?:gdacs|ns0):eventtype>(\w+)<\/(?:gdacs|ns0):eventtype>/.exec(raw) || [])[1];
      if (type !== "FL") continue;

      const title = (/<title>([\s\S]*?)<\/title>/.exec(raw) || [])[1] || "Flood alert";
      const desc = (/<description>([\s\S]*?)<\/description>/.exec(raw) || [])[1] || "";
      const link = (/<link>([\s\S]*?)<\/link>/.exec(raw) || [])[1] || "";
      const level = (/<(?:gdacs|ns0):alertlevel>(\w+)<\/(?:gdacs|ns0):alertlevel>/.exec(raw) || [])[1] || "Green";
      const score = parseFloat((/<(?:gdacs|ns0):alertscore>([\d.]+)<\/(?:gdacs|ns0):alertscore>/.exec(raw) || [])[1] || 0);
      const bboxRaw = (/<(?:gdacs|ns0):bbox>([\s\S]*?)<\/(?:gdacs|ns0):bbox>/.exec(raw) || [])[1] || "";
      const eventId = (/<guid[^>]*>(\w+)<\/guid>/.exec(raw) || [])[1] || "";

      const latMatch = /<(?:geo|ns2):lat>([\d.-]+)<\/(?:geo|ns2):lat>/.exec(raw);
      const lonMatch = /<(?:geo|ns2):long>([\d.-]+)<\/(?:geo|ns2):long>/.exec(raw);
      const evLat = latMatch ? parseFloat(latMatch[1]) : null;
      const evLon = lonMatch ? parseFloat(lonMatch[1]) : null;

      if (evLat == null || evLon == null) continue;
      const distance = distKm(evLat, evLon, cLat, cLon);
      if (distance > rKm) continue;

      const parts = bboxRaw.trim().split(/\s+/).map(Number);
      const bbox =
        parts.length === 4 && parts.every((n) => Number.isFinite(n))
          ? { minLon: parts[0], minLat: parts[1], maxLon: parts[2], maxLat: parts[3] }
          : null;

      events.push({
        id: eventId,
        title,
        description: desc,
        link,
        alertlevel: level,
        alertscore: score,
        risk: ALERT_TONE[level] || "low",
        latitude: evLat,
        longitude: evLon,
        bbox,
        distance_km: Math.round(distance),
      });
    }

    events.sort((a, b) => a.distance_km - b.distance_km);
    const nearest = events.slice(0, MAX_ALERTS);

    return res.status(200).json({
      success: true,
      data: {
        alerts: nearest,
        center: { lat: cLat, lon: cLon, radius_km: rKm },
      },
      source: "gdacs",
    });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, source: "gdacs_error" });
  }
}
