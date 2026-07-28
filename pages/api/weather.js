import { fetchWithTimeout } from "../../lib/api-utils";

const NWS_BASE = "https://api.weather.gov";

export default async function handler(req, res) {
  const { type, lat = 40.8, lon = -124.16 } = req.query;

  try {
    const headers = {
      "User-Agent": "(Beacon.ai App, beacon-ai@example.com)",
      Accept: "application/json",
    };
    const pointUrl = `${NWS_BASE}/points/${lat},${lon}`;
    const pointRes = await fetchWithTimeout(pointUrl, { headers }, 5000);
    if (!pointRes.ok) throw new Error(`NWS point lookup failed: ${pointRes.status}`);

    const pointData = await pointRes.json();
    const forecastUrl = pointData.properties?.forecast;
    const forecastHourlyUrl = pointData.properties?.forecastHourly;
    const alertsUrl = `${NWS_BASE}/alerts/active?point=${lat},${lon}`;

    const [forecastRes, hourlyRes, alertsRes] = await Promise.allSettled([
      fetchWithTimeout(forecastUrl, { headers }, 5000),
      fetchWithTimeout(forecastHourlyUrl, { headers }, 5000),
      fetchWithTimeout(alertsUrl, { headers }, 5000),
    ]);

    const forecast = forecastRes.status === "fulfilled" ? await forecastRes.value.json() : null;
    const hourly = hourlyRes.status === "fulfilled" ? await hourlyRes.value.json() : null;
    const alerts = alertsRes.status === "fulfilled" ? await alertsRes.value.json() : null;

    const periods = forecast?.properties?.periods?.slice(0, 7) || [];
    const hourlyPeriods = hourly?.properties?.periods?.slice(0, 12) || [];
    if (!periods.length) throw new Error("No forecast data from NWS");

    const days = periods.map((p) => ({
      date: new Date(p.startTime).toISOString().split("T")[0],
      day: p.name,
      temp_c: Math.round((p.temperature - 32) * 5 / 9),
      temp_f: p.temperature,
      condition: p.shortForecast,
      rain_probability: p.probabilityOfPrecipitation?.value || 0,
      wind_speed: p.windSpeed,
      wind_direction: p.windDirection,
      icon: p.icon,
    }));

    const rain12h = hourlyPeriods.map((p) => (p.probabilityOfPrecipitation?.value || 0) / 20);
    const currentPeriod = periods[0];

    const data = {
      location: {
        lat: Number(lat),
        lon: Number(lon),
        name: pointData.properties?.relativeLocation?.properties?.city || "Unknown",
        state: pointData.properties?.relativeLocation?.properties?.state || "",
      },
      current: {
        temp_c: Math.round((currentPeriod.temperature - 32) * 5 / 9),
        temp_f: currentPeriod.temperature,
        condition: currentPeriod.shortForecast,
        humidity: currentPeriod.relativeHumidity?.value || null,
        wind_speed_mph: parseInt(currentPeriod.windSpeed) || null,
        wind_direction: currentPeriod.windDirection || null,
        icon: currentPeriod.icon,
      },
      forecast: days,
      rain_12h: rain12h.length ? rain12h : null,
      alerts: alerts?.features?.map((f) => ({
        type: f.properties.event,
        severity: f.properties.severity,
        headline: f.properties.headline || f.properties.event,
        description: f.properties.description,
        issued: f.properties.effective,
        expires: f.properties.expires,
      })) || [],
    };

    if (type === "now") {
      return res.status(200).json({ success: true, data: data.current, source: "nws" });
    }
    return res.status(200).json({ success: true, data, source: "nws" });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, source: "nws_error" });
  }
}
