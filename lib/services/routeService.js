import { api } from "../api";
import { calculateHaversineMiles } from "../haversine";
import shelterService from "./shelterService";

/**
 * Evacuation Route Calculation Service
 * Calculates route polylines between user's GPS position and target shelters/destinations.
 */
export const routeService = {
  /**
   * Calculates evacuation route from origin coordinates to target destination coordinates
   * @param {Object|Array|string} origin { lat, lon } or [lat, lon] or "lon,lat"
   * @param {Object|Array|string} destination { lat, lon } or [lat, lon] or "lon,lat"
   * @param {string} [profile="driving"] Routing profile: "driving", "walking", or "cycling"
   * @param {Object|Array|string} [via] Optional detour waypoint { lat, lon }/ [lat, lon] / "lon,lat"
   * @returns {Promise<{ success: boolean, routes?: Array, geojson?: Object, error?: string }>}
   */
  async calculateEvacuationRoute(origin, destination, profile = "driving", via = null) {
    try {
      let originCoords = origin;
      if (!originCoords) {
        originCoords = await shelterService.getUserLocation();
      }

      let originStr = "";
      if (typeof originCoords === "string") {
        originStr = originCoords;
      } else if (Array.isArray(originCoords)) {
        originStr = `${originCoords[1]},${originCoords[0]}`;
      } else if (originCoords && originCoords.lat !== undefined) {
        originStr = `${originCoords.lon},${originCoords.lat}`;
      }

      let destStr = "";
      if (typeof destination === "string") {
        destStr = destination;
      } else if (Array.isArray(destination)) {
        destStr = `${destination[1]},${destination[0]}`;
      } else if (destination && destination.lat !== undefined) {
        destStr = `${destination.lon},${destination.lat}`;
      }

      if (!originStr || !destStr) {
        return { success: false, error: "Invalid origin or destination coordinates provided." };
      }

      let viaStr = "";
      if (via) {
        if (typeof via === "string") viaStr = via;
        else if (Array.isArray(via)) viaStr = `${via[1]},${via[0]}`;
        else if (via && via.lat !== undefined) viaStr = `${via.lon},${via.lat}`;
      }

      const res = await api.route.fetch(originStr, destStr, profile, viaStr);

      if (res && res.success && res.data) {
        const { routes } = res.data;
        if (!routes || routes.length === 0) {
          return { success: false, error: "No routes returned." };
        }
        const geojson = this.toPolylineGeoJSON(routes[0]);
        return {
          success: true,
          routes,
          geojson,
          originCoords,
          destinationCoords: destination,
        };
      }

      return { success: false, error: res?.error || "Failed to calculate evacuation route." };
    } catch (err) {
      return { success: false, error: err.message || "Network error calculating evacuation route." };
    }
  },

  /**
   * Pick the safest route that avoids danger zones
   * @param {Array} routes - Array of route objects from OSRM
   * @param {Array} dangerCircles - Array of { lat, lon, radius } danger zones
   * @returns {Object|null} Safest route or null if all routes go through danger
   */
  pickSafestRoute(routes, dangerCircles = []) {
    if (!routes || routes.length === 0) return null;
    if (!dangerCircles || dangerCircles.length === 0) return routes[0];

    function dangerFraction(lon, lat) {
      for (const d of dangerCircles) {
        const dist = calculateHaversineMiles(lat, lon, d.lat, d.lon);
        const threatMiles = d.radiusMiles || 0.125;
        if (dist < threatMiles) return 1;
      }
      return 0;
    }

    const scored = routes.map((route) => {
      const coords = route.geometry?.coordinates || [];
      let dangerCount = 0;
      const total = coords.length;
      if (total === 0) return { route, score: -Infinity, duration: Infinity };
      for (const [lon, lat] of coords) {
        dangerCount += dangerFraction(lon, lat);
      }
      const safety = 1 - dangerCount / total;
      const duration = Number(route.duration_min) || Infinity;
      return { route, safety, duration, dangerCount };
    });

    scored.sort((a, b) => {
      const aSafe = a.safety >= 0.8;
      const bSafe = b.safety >= 0.8;
      if (aSafe && !bSafe) return -1;
      if (!aSafe && bSafe) return 1;
      if (a.safety !== b.safety) return b.safety - a.safety;
      return a.duration - b.duration;
    });

    return scored[0].route;
  },

  /**
   * Converts route geometry into GeoJSON LineString format for map rendering
   * @param {Object} route - Single route object with geometry
   * @returns {Object} GeoJSON FeatureCollection
   */
  toPolylineGeoJSON(route) {
    if (!route || !route.geometry || !route.geometry.coordinates) return null;

    const coords = route.geometry.coordinates;
    const features = [
      {
        type: "Feature",
        properties: {
          role: "evacuation_polyline",
          distance_km: route.distance_km,
          duration_min: route.duration_min,
        },
        geometry: route.geometry,
      },
    ];

    if (coords.length > 0) {
      features.push({
        type: "Feature",
        properties: { role: "start_location", title: "Your Location" },
        geometry: { type: "Point", coordinates: coords[0] },
      });
    }

    if (coords.length > 1) {
      features.push({
        type: "Feature",
        properties: { role: "shelter_destination", title: "Emergency Shelter" },
        geometry: { type: "Point", coordinates: coords[coords.length - 1] },
      });
    }

    return { type: "FeatureCollection", features };
  },

  /**
   * Polyline styling parameters for Leaflet GeoJSON layer
   */
  getPolylineStyle(color = "#0D9488") {
    return (feature) => {
      if (feature?.geometry?.type === "LineString") {
        return {
          color,
          weight: 6,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        };
      }
      return { color: "#DC2626", weight: 3 };
    };
  },
};

export default routeService;
