import { fetchWithTimeout } from "../../lib/api-utils";

const DEFAULT_LAT = 40.8;
const DEFAULT_LON = -124.16;
const FT_TO_M = 0.3048;

function computeTrend(points) {
  if (points.length < 2) return "stable";
  const first = points[0].v;
  const last = points[points.length - 1].v;
  const delta = last - first;
  if (Math.abs(delta) < 0.02) return "stable";
  return delta > 0 ? "rising" : "falling";
}

export default async function handler(req, res) {
  const { type, lat, lon, radiusKm } = req.query;

  try {
    const centerLat = parseFloat(lat);
    const centerLon = parseFloat(lon);
    const rLat = Number.isFinite(centerLat) ? centerLat : DEFAULT_LAT;
    const rLon = Number.isFinite(centerLon) ? centerLon : DEFAULT_LON;
    const rKm = Number.isFinite(parseFloat(radiusKm)) ? Math.max(parseFloat(radiusKm), 1) : 50;

    const degLat = rKm / 110.574;
    const degLon = rKm / (111.32 * Math.max(Math.cos((rLat * Math.PI) / 180), 0.01));
    const minLat = rLat - degLat;
    const maxLat = rLat + degLat;
    const minLon = rLon - degLon;
    const maxLon = rLon + degLon;

    const ivUrl =
      `https://waterservices.usgs.gov/nwis/iv/?format=json&period=P3D` +
      `&bBox=${minLon},${minLat},${maxLon},${maxLat}` +
      `&parameterCd=00060,00065&siteStatus=active`;
    const ivRes = await fetchWithTimeout(ivUrl, {}, 15000);
    if (!ivRes.ok) throw new Error(`USGS returned ${ivRes.status}`);

    const json = await ivRes.json();
    const timeSeries = json?.value?.timeSeries || [];

    if (timeSeries.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          gauge_stations: [],
          risk_zones: [],
          stats: { stations: "0", evacuations: "0", flood_zones: "0", rescues: "0" },
        },
        source: "usgs",
        note: "No active USGS gauges found near the requested coordinates",
      });
    }

    const bySite = {};
    for (const ts of timeSeries) {
      if (!ts.values?.[0]?.value?.length) continue;
      const code = ts.sourceInfo?.siteCode?.[0]?.value;
      if (!code) continue;
      if (!bySite[code]) {
        bySite[code] = {
          name: ts.sourceInfo?.siteName || code,
          lat: null,
          lon: null,
          level_m: null,
          discharge: null,
          levelPoints: [],
          dischargePoints: [],
        };
      }
      const param = ts.variable?.variableCode?.[0]?.value;
      const pts = ts.values[0].value
        .map((v) => ({ v: parseFloat(v.value), t: Date.parse(v.dateTime) }))
        .filter((p) => Number.isFinite(p.v) && Number.isFinite(p.t));
      if (param === "00065") {
        bySite[code].levelPoints = pts;
        bySite[code].level_m = pts[pts.length - 1].v * FT_TO_M;
      } else if (param === "00060") {
        bySite[code].dischargePoints = pts;
        bySite[code].discharge = pts[pts.length - 1].v;
      }
      const geo = ts.sourceInfo?.geoLocation?.geogLocation;
      if (geo) {
        bySite[code].lat = parseFloat(geo.latitude);
        bySite[code].lon = parseFloat(geo.longitude);
      }
    }

    const stations = Object.values(bySite).map((s) => {
      const levelPts = s.levelPoints || [];
      const ptsForTrend = levelPts.length >= 2 ? levelPts : s.dischargePoints || [];
      const trend = computeTrend(ptsForTrend);
      const rate_mph = levelPts.length >= 2
        ? (levelPts[levelPts.length - 1].v - levelPts[0].v) * FT_TO_M
        : 0;
      const level_m = s.level_m || 0;
      return {
        name: s.name,
        level_m: Number(level_m.toFixed(2)),
        rate_mph: Number(rate_mph.toFixed(3)),
        discharge_cfs: s.discharge ? Number(s.discharge.toFixed(1)) : null,
        trend,
        risk: level_m > 4 ? "high" : level_m > 3 ? "moderate" : "low",
        latitude: s.lat,
        longitude: s.lon,
      };
    });

    const riskZones = stations.map((s) => ({
      name: s.name,
      risk_pct: Math.min(Math.round((s.level_m / 5) * 100), 100),
      tone: s.level_m > 4 ? "red" : s.level_m > 3 ? "amber" : "teal",
    }));

    const stats = {
      stations: String(stations.length),
      evacuations: stations.filter((s) => s.level_m > 3.5).length > 0 ? "1" : "0",
      flood_zones: String(riskZones.filter((z) => z.risk_pct > 50).length),
      rescues: "0",
    };

    const data = {
      gauge_stations: stations,
      risk_zones: riskZones,
      stats,
      center: { lat: rLat, lon: rLon, radius_km: rKm },
    };

    if (type === "gauges") {
      return res.status(200).json({
        success: true,
        data: { stations: data.gauge_stations, risk_zones: data.risk_zones, stats: data.stats },
        source: "usgs",
      });
    }

    return res.status(200).json({ success: true, data, source: "usgs" });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, source: "usgs_error" });
  }
}