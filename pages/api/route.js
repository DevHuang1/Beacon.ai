import { fetchWithTimeout } from "../../lib/api-utils";

const OSRM_BASE = "https://router.project-osrm.org/route/v1";

export default async function handler(req, res) {
  const { origin, destination, profile = "driving" } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ success: false, error: "origin and destination required (lat,lon)" });
  }

  const validProfiles = ["driving", "walking", "cycling"];
  const p = validProfiles.includes(profile) ? profile : "driving";

  const url = `${OSRM_BASE}/${p}/${origin};${destination}?geometries=geojson&steps=true&overview=full&annotations=true&alternatives=3`;

  try {
    const result = await fetchWithTimeout(url, { headers: {} }, 10000);
    const data = await result.json();

    if (data.code !== "Ok") {
      return res.status(502).json({ success: false, error: data.message || "OSRM routing failed" });
    }

    const routes = data.routes.map((route) => ({
      distance_km: (route.distance / 1000).toFixed(1),
      duration_min: Math.round(route.duration / 60),
      geometry: route.geometry,
      legs: route.legs.map((leg) => ({
        summary: leg.summary,
        distance_km: (leg.distance / 1000).toFixed(1),
        duration_min: Math.round(leg.duration / 60),
        steps: leg.steps.map((step) => ({
          instruction: step.maneuver.instruction || step.name,
          name: step.name,
          distance_m: Math.round(step.distance),
          duration_s: Math.round(step.duration),
          modifier: step.maneuver.modifier || null,
          type: step.maneuver.type || null,
        })),
      })),
    }));

    res.status(200).json({
      success: true,
      data: { routes, profile: p },
    });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
}
