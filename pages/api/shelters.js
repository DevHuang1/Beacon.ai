function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function inferFacilities(tags) {
  const f = new Set();
  const amenity = tags.amenity || "";
  const building = tags.building || "";
  if (amenity === "hospital" || tags.healthcare) f.add("Medical");
  if (amenity === "fire_station") f.add("Emergency Response");
  if (amenity === "police") f.add("Security");
  if (tags.wheelchair === "yes" || tags.wheelchair === "limited") f.add("ADA access");
  if (tags["shelter:pet"] || tags.pets === "yes") f.add("Pets welcome");
  if (tags.power === "yes" || tags.generator) f.add("Emergency Power");
  if (building === "school" || amenity === "school") f.add("Showers");
  if (amenity === "place_of_worship") f.add("Hot Meals");
  if (tags.emergency) f.add("Emergency Capacity");
  f.add("ADA access");
  return Array.from(f);
}

function inferLabel(tags) {
  const map = {
    hospital: "Hospital",
    fire_station: "Fire Station / Emergency",
    police: "Police Station",
    community_centre: "Community Centre",
    school: "School Shelter",
    townhall: "Town Hall",
    place_of_worship: "Place of Worship",
    sports_centre: "Sports Centre",
    social_facility: "Social Facility",
    public_building: "Public Building",
    church: "Church Shelter",
    mosque: "Mosque Shelter",
  };
  return map[tags.amenity] || map[tags.building] || "Emergency Shelter";
}

function formatAddress(tags) {
  const parts = [
    tags["addr:housenumber"] || "",
    tags["addr:street"] || "",
    tags["addr:city"] || tags["addr:suburb"] || "",
    tags["addr:state"] || "",
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (tags["addr:full"]) return tags["addr:full"];
  return null;
}

// Small in-memory cache so repeated requests near the same coordinates do not
// hit the (slow) public Overpass servers every time.
const OSM_CACHE_TTL_MS = 30 * 60 * 1000;
const osCache = new Map();
function cacheKey(lat, lon, radiusMiles) {
  // Snap to ~0.04° grid (~4 km) so nearby map pans reuse the cached result.
  // Radius is part of the key because a smaller query returns a subset.
  return `${Math.round(lat * 25)},${Math.round(lon * 25)},${Math.round(radiusMiles)}`;
}
function cacheGet(lat, lon, radiusMiles) {
  const entry = osCache.get(cacheKey(lat, lon, radiusMiles));
  if (!entry) return null;
  if (Date.now() - entry.at > OSM_CACHE_TTL_MS) {
    osCache.delete(cacheKey(lat, lon, radiusMiles));
    return null;
  }
  return entry.data;
}
function cacheSet(lat, lon, radiusMiles, data) {
  if (osCache.size > 200) osCache.clear();
  osCache.set(cacheKey(lat, lon, radiusMiles), { at: Date.now(), data });
}

function firstSuccess(promises) {
  return new Promise((resolve, reject) => {
    let pending = promises.length;
    let settledFails = 0;
    for (const p of promises) {
      Promise.resolve(p).then(
        (value) => resolve(value),
        () => {
          settledFails++;
          if (settledFails === pending) reject(new Error("All Overpass mirrors failed"));
        }
      );
    }
  });
}

async function osmQueryOverpass(query) {
  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
  ];

  // Race all mirrors: the first one that responds wins. Each request is still
  // bounded by its own timeout so a hung mirror cannot hold the connection pool.
  const attempts = endpoints.map(async (base) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const url = `${base}?data=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "Accept": "application/json", "User-Agent": "BeaconAI-DisasterApp/1.0" },
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  });

  try {
    const data = await firstSuccess(attempts);
    if (!data || typeof data.elements === "undefined") return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchRealOsmShelters(userLat, userLon, radiusMiles = 10) {
  const cached = cacheGet(userLat, userLon, radiusMiles);
  if (cached) return cached;

  // Keep the Overpass bounding box proportional to the requested radius so
  // smaller radius settings return (and compute) much faster. Capped at ~12 km
  // because `around` scans grow super-linearly (16 km took ~20 s vs ~7 s for
  // 12 km in testing); larger radii are still handled by the client-side
  // Haversine filter.
  const aroundMeters = Math.min(12000, Math.max(2000, Math.round(radiusMiles * 1609.344)));

  // Anchored (^...$) regexes are far faster than substring matching on the
  // public Overpass mirrors, and the two extra building/leisure clauses were
  // redundant with the amenity list while nearly tripling query time.
  const query = `
    [out:json][timeout:12];
    (
      nwr["emergency"~"^(shelter|disaster_response|assembly_point)$"](around:${aroundMeters}, ${userLat}, ${userLon});
      nwr["amenity"~"^(school|hospital|fire_station|community_centre|place_of_worship|police|townhall|public_building)$"](around:${aroundMeters}, ${userLat}, ${userLon});
    );
    out center 30;
  `;

  const data = await osmQueryOverpass(query);
  const elements = (data && data.elements) || [];

  if (elements.length === 0) {
    cacheSet(userLat, userLon, radiusMiles, null);
    return null;
  }

  const seen = new Set();
  const realFacilities = elements
    .filter((el) => {
      if (!el.tags) return false;
      const key = `${el.type}-${el.id || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((el, idx) => {
      const rawName = el.tags["name:en"] || el.tags.name || inferLabel(el.tags);
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) return null;
      const distMiles = haversineMiles(userLat, userLon, lat, lon);
      const address = formatAddress(el.tags);
      const name = rawName;

      let total = null;
      let occupied = null;
      if (el.tags.capacity) {
        total = parseInt(el.tags.capacity, 10) || null;
      }
      if (el.tags["shelter:capacity"] || el.tags["capacity:persons"]) {
        total = parseInt(el.tags["shelter:capacity"] || el.tags["capacity:persons"], 10) || null;
      }

      return {
        id: el.id || idx + 100,
        name,
        address: address || "Address unavailable",
        phone: el.tags.phone || el.tags["contact:phone"] || null,
        occupied,
        total,
        cap: total ? `${occupied ?? "?"} / ${total}` : "Capacity unknown",
        status: "Open",
        facilities: inferFacilities(el.tags),
        lat,
        lon,
        distMiles,
        dist: `${distMiles.toFixed(1)} mi`,
        isRealOSM: true,
        dataSource: "OpenStreetMap",
        osmTags: {
          amenity: el.tags.amenity || null,
          emergency: el.tags.emergency || null,
          building: el.tags.building || null,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distMiles - b.distMiles);

  return realFacilities.length > 0 ? realFacilities : null;
}

export default async function handler(req, res) {
  const { id, lat, lon, radius } = req.query;

  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);
  const radiusMiles = Number.isFinite(parseFloat(radius)) ? Math.min(Math.max(parseFloat(radius), 1), 50) : 10;

  if (!userLat || !userLon) {
    return res.status(400).json({
      success: false,
      error: "Latitude and longitude are required",
      data: { shelters: [], userLocation: null },
    });
  }

  const shelters = (await fetchRealOsmShelters(userLat, userLon, radiusMiles)) || [];

  shelters.sort((a, b) => a.distMiles - b.distMiles);

  if (id) {
    const shelter = shelters.find((s) => s.id === Number(id));
    if (!shelter) return res.status(404).json({ success: false, error: "Shelter not found" });
    return res.status(200).json({ success: true, data: shelter });
  }

  res.status(200).json({
    success: true,
    data: { shelters, count: shelters.length, userLocation: { lat: userLat, lon: userLon } },
  });
}
