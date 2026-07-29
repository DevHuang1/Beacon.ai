import { fetchWithTimeout } from "../../lib/api-utils";

export default async function handler(req, res) {
  const { type } = req.query;

  try {
    // Use the national water dashboard API for broader coverage
    const usgsUrl =
      "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=11476580,11477000&parameterCd=00065,00060";
    const resp = await fetchWithTimeout(usgsUrl, {}, 15000);
    if (!resp.ok) throw new Error(`USGS returned ${resp.status}`);

    const json = await resp.json();
    const timeSeries = json?.value?.timeSeries || [];
    if (!timeSeries.length) throw new Error("No time series data returned for those sites");

    const stations = timeSeries.map((ts) => ({
      name: ts.sourceInfo.siteName || "Unknown station",
      level_m: parseFloat(ts.values[0]?.value[0]?.value || 0) * 0.3048,
      rate_mph: 0,
    }));

    const riskZones = stations.map((s) => ({
      name: s.name,
      risk_pct: Math.min(Math.round((s.level_m / 5) * 100), 100),
      tone: s.level_m > 4 ? "red" : s.level_m > 3 ? "amber" : "teal",
    }));

    const stats = {
      stations: String(timeSeries.length),
      evacuations: stations.filter((s) => s.level_m > 3.5).length > 0 ? "1" : "0",
      flood_zones: String(riskZones.filter((z) => z.risk_pct > 50).length),
      rescues: "0",
    };

    const data = {
      gauge_stations: stations.map((s) => ({
        ...s,
        risk: s.level_m > 4 ? "high" : s.level_m > 3 ? "moderate" : "low",
        trend: s.level_m > 0.1 ? "rising" : "stable",
      })),
      risk_zones: riskZones,
      stats,
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
