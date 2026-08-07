const REQUEST_TIMEOUT_MS = 20000;
const inflight = new Map();

async function request(path, options = {}) {
  const method = options.method || "GET";
  const key = `${method} ${path}`;

  // Share a single in-flight request for identical GETs so concurrent callers
  // (e.g. the Escape tab and Shelter Finder) don't duplicate slow calls and
  // saturate the browser connection pool.
  if (method === "GET" && inflight.has(key)) {
    return inflight.get(key);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const run = (async () => {
    try {
      const res = await fetch(path, {
        headers: { "Content-Type": "application/json", ...options.headers },
        signal: controller.signal,
        ...options,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${path}`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  })();

  if (method === "GET") {
    inflight.set(key, run);
    try {
      return await run;
    } finally {
      inflight.delete(key);
    }
  }

  return run;
}

export const api = {
  health: () => request("/api/health"),
  modules: () => request("/api/modules"),
  advisor: (prompt, context) => request("/api/advisor", { method: "POST", body: JSON.stringify({ prompt, context }) }),

  water: {
    floodZones: () => request("/api/water"),
    gauges: (lat, lon) => request(`/api/water?type=gauges&lat=${lat || ""}&lon=${lon || ""}`),
    alerts: (lat, lon, radiusKm = 500) =>
      request(`/api/flood-alerts?lat=${lat || ""}&lon=${lon || ""}&radiusKm=${radiusKm}`),
  },

  satellite: (lat, lon, radiusKm = 25, date) =>
    request(`/api/satellite?lat=${lat || ""}&lon=${lon || ""}&radiusKm=${radiusKm}${date ? `&date=${date}` : ""}`),

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
    recent: (minMag = 0, hours = 24, lat, lon, radiusKm = 500) => {
      let url = `/api/earthquake?min_magnitude=${minMag}&hours=${hours}`;
      if (lat != null && lon != null) url += `&lat=${lat}&lon=${lon}&radius_km=${radiusKm}`;
      return request(url);
    },
  },

  wildfire: {
    conditions: (lat, lon, radiusKm = 300) =>
      request(`/api/wildfire?lat=${lat || ""}&lon=${lon || ""}&radiusKm=${radiusKm}`),
    hotspots: (lat, lon, radiusKm = 300) =>
      request(`/api/wildfire?type=hotspots&lat=${lat || ""}&lon=${lon || ""}&radiusKm=${radiusKm}`),
  },

  shelters: {
    list: (lat, lon, radiusMiles = 10) =>
      request(`/api/shelters?lat=${lat}&lon=${lon}&radius=${radiusMiles}`),
    get: (id, lat, lon) => request(`/api/shelters?id=${id}&lat=${lat}&lon=${lon}`),
  },

  route: {
    fetch: (origin, destination, profile = "driving", via = "") =>
      request(`/api/route?origin=${origin}&destination=${destination}&profile=${profile}${via ? `&via=${encodeURIComponent(via)}` : ""}`),
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
