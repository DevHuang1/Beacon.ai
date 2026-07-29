async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  health: () => request("/api/health"),
  modules: () => request("/api/modules"),
  advisor: (prompt, context) => request("/api/advisor", { method: "POST", body: JSON.stringify({ prompt, context }) }),

  water: {
    detect: (body) => request("/api/water?type=detect", { method: "POST", body: JSON.stringify(body) }),
    floodZones: () => request("/api/water"),
    gauges: () => request("/api/water?type=gauges"),
  },

  segment: (body) => request("/api/segment", { method: "POST", body: JSON.stringify(body) }),

  classify: {
    detect: (body) => request("/api/classify", { method: "POST", body: JSON.stringify(body) }),
    landcover: () => request("/api/classify"),
  },

  detect: (body) => request("/api/detect", { method: "POST", body: JSON.stringify(body) }),

  change: (body) => request("/api/change", { method: "POST", body: JSON.stringify(body) }),

  weather: {
    forecast: (lat, lon) => request(`/api/weather?lat=${lat || 40.8}&lon=${lon || -124.16}`),
    now: (lat, lon) => request(`/api/weather?type=now&lat=${lat || 40.8}&lon=${lon || -124.16}`),
    alerts: (lat, lon) => request(`/api/weather?type=alerts&lat=${lat || 40.8}&lon=${lon || -124.16}`),
  },

  earthquake: {
    recent: (minMag = 0, hours = 24) =>
      request(`/api/earthquake?min_magnitude=${minMag}&hours=${hours}`),
  },

  wildfire: {
    conditions: (region) => request(`/api/wildfire?region=${region || ""}`),
    hotspots: () => request("/api/wildfire?type=hotspots"),
  },

  shelters: {
    list: (lat, lon) => request(`/api/shelters?lat=${lat}&lon=${lon}`),
    get: (id, lat, lon) => request(`/api/shelters?id=${id}&lat=${lat}&lon=${lon}`),
  },

  route: {
    fetch: (origin, destination, profile = "driving") =>
      request(`/api/route?origin=${origin}&destination=${destination}&profile=${profile}`),
  },

  geoai: {
    health: () => request("/api/geoai/health"),
    waterDetect: (body) => request("/api/geoai/water/detect", { method: "POST", body: JSON.stringify(body) }),
    segment: (body) => request("/api/geoai/segment", { method: "POST", body: JSON.stringify(body) }),
    classify: (body) => request("/api/geoai/classify", { method: "POST", body: JSON.stringify(body) }),
    detect: (body) => request("/api/geoai/detect", { method: "POST", body: JSON.stringify(body) }),
    change: (body) => request("/api/geoai/change", { method: "POST", body: JSON.stringify(body) }),
  },
};
