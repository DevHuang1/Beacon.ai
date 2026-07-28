import { api } from "../api";
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
   * @returns {Promise<{ success: boolean, route?: Object, geojson?: Object, error?: string }>}
   */
  async calculateEvacuationRoute(origin, destination, profile = "driving") {
    try {
      // 1. Resolve origin coordinates
      let originCoords = origin;
      if (!originCoords) {
        originCoords = await shelterService.getUserLocation();
      }

      let originStr = "";
      if (typeof originCoords === "string") {
        originStr = originCoords;
      } else if (Array.isArray(originCoords)) {
        originStr = `${originCoords[1]},${originCoords[0]}`; // lon,lat for OSRM
      } else if (originCoords && originCoords.lat !== undefined) {
        originStr = `${originCoords.lon},${originCoords.lat}`;
      }

      // 2. Resolve destination coordinates
      let destStr = "";
      if (typeof destination === "string") {
        destStr = destination;
      } else if (Array.isArray(destination)) {
        destStr = `${destination[1]},${destination[0]}`;
      } else if (destination && destination.lat !== undefined) {
        destStr = `${destination.lon},${destination.lat}`;
      }

      if (!originStr || !destStr) {
        return {
          success: false,
          error: "Invalid origin or destination coordinates provided.",
        };
      }

      // 3. Request route from server API
      const res = await api.route.fetch(originStr, destStr, profile);

      if (res && res.success && res.data) {
        const routeData = res.data;
        const geojson = this.toPolylineGeoJSON(routeData);

        return {
          success: true,
          route: routeData,
          geojson,
          originCoords,
          destinationCoords: destination,
        };
      }

      return {
        success: false,
        error: res?.error || "Failed to calculate evacuation route.",
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || "Network error calculating evacuation polyline route.",
      };
    }
  },

  /**
   * Converts route geometry into GeoJSON LineString format for map rendering
   * @param {Object} routeData 
   * @returns {Object} GeoJSON FeatureCollection
   */
  toPolylineGeoJSON(routeData) {
    if (!routeData || !routeData.geometry || !routeData.geometry.coordinates) {
      return null;
    }

    const coords = routeData.geometry.coordinates;

    const features = [
      // Main Evacuation Route Polyline
      {
        type: "Feature",
        properties: {
          role: "evacuation_polyline",
          distance_km: routeData.distance_km,
          duration_min: routeData.duration_min,
        },
        geometry: routeData.geometry,
      },
    ];

    // Origin Start Point Marker
    if (coords.length > 0) {
      features.push({
        type: "Feature",
        properties: { role: "start_location", title: "GPS Origin" },
        geometry: { type: "Point", coordinates: coords[0] },
      });
    }

    // Shelter Destination End Point Marker
    if (coords.length > 1) {
      features.push({
        type: "Feature",
        properties: { role: "shelter_destination", title: "Emergency Shelter" },
        geometry: { type: "Point", coordinates: coords[coords.length - 1] },
      });
    }

    return {
      type: "FeatureCollection",
      features,
    };
  },

  /**
   * Polyline styling parameters for Leaflet GeoJSON layer
   * @param {string} [color="#0D9488"]
   */
  getPolylineStyle(color = "#0D9488") {
    return (feature) => {
      if (feature?.geometry?.type === "LineString") {
        return {
          color: color,
          weight: 6,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        };
      }
      return {
        color: "#DC2626",
        weight: 3,
      };
    };
  },
};

export default routeService;
