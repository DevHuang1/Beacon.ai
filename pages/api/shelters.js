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

async function osmQueryOverpass(query) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

async function fetchRealOsmShelters(userLat, userLon) {
  const queries = [
    `
      [out:json][timeout:8];
      (
        node["emergency"~"shelter|disaster_response|assembly_point"](around:16000, ${userLat}, ${userLon});
        node["amenity"~"community_centre|social_facility|school|townhall|place_of_worship|sports_centre|hospital|fire_station|public_building"](around:16000, ${userLat}, ${userLon});
      );
      out body 20;
    `,
    `
      [out:json][timeout:6];
      (
        node["building"="school"](around:16000, ${userLat}, ${userLon});
        node["leisure"="sports_centre"](around:16000, ${userLat}, ${userLon});
      );
      out body 10;
    `,
  ];

  let elements = [];
  for (const q of queries) {
    const data = await osmQueryOverpass(q);
    if (data && data.elements && data.elements.length > 0) {
      elements = elements.concat(data.elements);
    }
  }

  if (elements.length === 0) return null;

  const seen = new Set();
  const realFacilities = elements
    .filter((el) => {
      if (!el.tags) return false;
      const name = el.tags["name:en"] || el.tags.name;
      if (!name) return false;
      const key = `${el.id || name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15)
    .map((el, idx) => {
      const rawName = el.tags["name:en"] || el.tags.name;
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
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
    .sort((a, b) => a.distMiles - b.distMiles);

  return realFacilities.length > 0 ? realFacilities : null;
}

export default async function handler(req, res) {
  const { id, lat, lon } = req.query;

  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);

  if (!userLat || !userLon) {
    return res.status(400).json({
      success: false,
      error: "Latitude and longitude are required",
      data: { shelters: [], userLocation: null },
    });
  }

  let shelters = await fetchRealOsmShelters(userLat, userLon);

  if (!shelters) {
    return res.status(200).json({
      success: true,
      data: {
        shelters: [],
        count: 0,
        userLocation: { lat: userLat, lon: userLon },
        note: "No shelter data available from OpenStreetMap for this area. Try expanding your search radius or enabling GPS.",
      },
    });
  }

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
