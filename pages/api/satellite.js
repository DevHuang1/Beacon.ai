import { fetchWithTimeout } from "../../lib/api-utils";

const DEFAULT_LAT = 40.8;
const DEFAULT_LON = -124.16;
const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor";

const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

async function getImage(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return { buf: hit.buf, cached: true };

  const imgRes = await fetchWithTimeout(url, {}, 25000);
  if (!imgRes.ok) throw new Error(`Satellite imagery unavailable (${imgRes.status})`);

  const contentType = imgRes.headers.get("content-type") || "image/png";
  if (contentType.includes("text") || contentType.includes("xml")) {
    throw new Error("Satellite imagery unavailable for this region/time");
  }

  const buf = Buffer.from(await imgRes.arrayBuffer());
  cache.set(url, { buf, ts: Date.now() });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  return { buf, cached: false };
}

export default async function handler(req, res) {
  const { lat, lon, radiusKm, size = 256 } = req.query;

  try {
    const centerLat = parseFloat(lat);
    const centerLon = parseFloat(lon);
    const rLat = Number.isFinite(centerLat) ? centerLat : DEFAULT_LAT;
    const rLon = Number.isFinite(centerLon) ? centerLon : DEFAULT_LON;
    const rKm = Number.isFinite(parseFloat(radiusKm)) ? Math.max(parseFloat(radiusKm), 5) : 20;
    const px = Math.min(Math.max(parseInt(size, 10) || 256, 128), 512);

    const degLat = rKm / 110.574;
    const degLon = rKm / (111.32 * Math.max(Math.cos((rLat * Math.PI) / 180), 0.01));
    const minLat = (rLat - degLat).toFixed(5);
    const maxLat = (rLat + degLat).toFixed(5);
    const minLon = (rLon - degLon).toFixed(5);
    const maxLon = (rLon + degLon).toFixed(5);

    const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
    const today = new Date().toISOString().slice(0, 10);
    const url =
      `${GIBS_WMS}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap` +
      `&FORMAT=image/png&TRANSPARENT=true&LAYERS=${LAYER}` +
      `&WIDTH=${px}&HEIGHT=${px}&SRS=EPSG:4326&BBOX=${bbox}` +
      `&time=${today}`;

    const buf = await getImage(url);
    const base64 = buf.buf.toString("base64");

    return res.status(200).json({
      success: true,
      data: {
        base64,
        mime: "image/png",
        width: px,
        height: px,
        bbox,
        center: { lat: rLat, lon: rLon, radius_km: rKm },
        source: "NASA GIBS MODIS True Color",
        captured: today,
        cached: buf.cached,
      },
    });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, source: "satellite_error" });
  }
}
