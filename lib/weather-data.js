export function getForecastData(lat = 40.8, lon = -124.16) {
  const now = new Date();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const baseTemp = 18 + 5 * Math.sin((dayOfYear(d) - 80) * 2 * Math.PI / 365);
    const temp = Math.round((baseTemp + (Math.random() - 0.5) * 6) * 10) / 10;
    const rainProb = Math.min(100, Math.max(0, 40 + 30 * Math.sin(dayOfYear(d) / 10) + (Math.random() - 0.5) * 30));
    const condition = rainProb > 70 ? "Heavy rain" : rainProb > 30 ? "Light rain" : "Sunny";
    days.push({
      date: d.toISOString().split("T")[0],
      day: d.toLocaleDateString("en-US", { weekday: "long" }),
      temp_c: temp,
      temp_f: Math.round(temp * 9 / 5 + 32),
      condition,
      rain_probability: Math.round(rainProb),
    });
  }

  const rain12h = Array.from({ length: 12 }, () => Math.round(Math.max(0, (Math.random() * 6)) * 10) / 10);
  const peakHour = rain12h.indexOf(Math.max(...rain12h));

  return {
    location: { lat, lon, name: "Humboldt County" },
    current: {
      temp_c: days[0].temp_c,
      temp_f: days[0].temp_f,
      condition: days[0].condition,
      humidity: Math.floor(Math.random() * 35 + 60),
      wind_speed_mph: Math.round((Math.random() * 20 + 5) * 10) / 10,
      wind_direction: ["NE", "NW", "SW", "SE", "N", "S"][Math.floor(Math.random() * 6)],
    },
    forecast: days,
    rain_12h: rain12h,
    rain_peak_hour: peakHour,
    alerts: [
      {
        type: "severe_storm",
        severity: "warning",
        headline: "Severe storm alert",
        description: "Damaging wind gusts and heavy rain expected over the next 6 hours.",
        issued: new Date(Date.now() - 3600000).toISOString(),
        expires: new Date(Date.now() + 18000000).toISOString(),
      },
    ],
  };
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
