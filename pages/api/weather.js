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

    if (type === "alerts") {
      const alertFeatures = alerts?.features?.map((f) => ({
        id: f.id || f.properties?.id,
        type: f.properties?.event,
        severity: f.properties?.severity,
        urgency: f.properties?.urgency,
        headline: f.properties?.headline || f.properties?.event,
        description: f.properties?.description,
        instruction: f.properties?.instruction,
        areaDesc: f.properties?.areaDesc,
        effective: f.properties?.effective,
        expires: f.properties?.expires,
        geometry: f.geometry,
      })) || [];

      return res.status(200).json({
        success: true,
        alerts: alertFeatures,
        location: { lat: Number(lat), lon: Number(lon) },
        radarTileUrl: "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png",
        source: "nws_active_alerts",
      });
    }

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
    // Fallback to Open-Meteo API for real-time global weather
    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&windspeed_unit=mph&timezone=auto`;
      const omRes = await fetchWithTimeout(omUrl, {}, 5000);
      if (omRes.ok) {
        const omData = await omRes.json();
        const cw = omData.current_weather || {};

        const weatherCodeMap = (code) => {
          if (code === 0) return "Clear Sky";
          if (code <= 3) return "Partly Cloudy";
          if (code <= 48) return "Foggy";
          if (code <= 55) return "Light Rain";
          if (code <= 65) return "Rain";
          if (code <= 77) return "Snow";
          if (code <= 82) return "Rain Showers";
          return "Thunderstorm";
        };

        const windDirCardinal = (deg) => {
          const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
          return dirs[Math.round(deg / 45) % 8];
        };

        const tempC = Math.round(cw.temperature || 15);
        const tempF = Math.round((tempC * 9/5) + 32);

        const currentData = {
          temp_c: tempC,
          temp_f: tempF,
          condition: weatherCodeMap(cw.weathercode),
          humidity: omData.hourly?.relative_humidity_2m?.[0] || 65,
          wind_speed_mph: Math.round(cw.windspeed || 8),
          wind_direction: windDirCardinal(cw.winddirection || 0),
        };

        if (type === "now") {
          return res.status(200).json({ success: true, data: currentData, source: "open_meteo" });
        }

        const daily = omData.daily || {};
        const days = (daily.time || []).slice(0, 7).map((t, idx) => ({
          date: t,
          day: new Date(t).toLocaleDateString("en-US", { weekday: "short" }),
          temp_c: Math.round(daily.temperature_2m_max?.[idx] || tempC),
          temp_f: Math.round(((daily.temperature_2m_max?.[idx] || tempC) * 9/5) + 32),
          condition: weatherCodeMap(daily.weathercode?.[idx]),
          rain_probability: daily.precipitation_probability_max?.[idx] || 20,
          wind_speed: `${Math.round(cw.windspeed || 8)} mph`,
          wind_direction: windDirCardinal(cw.winddirection || 0),
        }));

        const rain12h = (omData.hourly?.precipitation_probability || []).slice(0, 12).map(p => p / 20);

        return res.status(200).json({
          success: true,
          data: {
            location: { lat: Number(lat), lon: Number(lon), name: "Current GPS Coordinates" },
            current: currentData,
            forecast: days,
            rain_12h: rain12h,
            alerts: [],
          },
          source: "open_meteo",
        });
      }
    } catch (omErr) {
      console.warn("Open-Meteo fallback error:", omErr);
    }

    return res.status(200).json({ success: false, error: err.message, source: "weather_error" });
  }
}
