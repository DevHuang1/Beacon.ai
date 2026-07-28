import { api } from "../api";

/**
 * Service to manage emergency shelter queries, user GPS acquisition, and map calculations
 */
export const shelterService = {
  /**
   * Default fallback coordinates (Eureka, CA region) if GPS permission is denied or unavailable
   */
  DEFAULT_COORDS: {
    lat: 40.802,
    lon: -124.163,
  },

  /**
   * Get user's real-time GPS coordinates via browser geolocation API
   * @param {Object} options Configuration options for GPS lookup
   * @returns {Promise<{ lat: number, lon: number, isRealGPS: boolean }>}
   */
  async getUserLocation(options = { timeout: 8000 }) {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        return resolve({
          ...this.DEFAULT_COORDS,
          isRealGPS: false,
        });
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            isRealGPS: true,
          });
        },
        () => {
          // Fallback to default location if denied or timeout
          resolve({
            ...this.DEFAULT_COORDS,
            isRealGPS: false,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: options.timeout,
          maximumAge: 30000,
        }
      );
    });
  },

  /**
   * Query emergency shelters sorted by proximity to provided coordinates
   * @param {number} [lat] User latitude
   * @param {number} [lon] User longitude
   * @returns {Promise<{ success: boolean, shelters: Array, userCoords: Object, error?: string }>}
   */
  async fetchNearestShelters(lat, lon) {
    try {
      let coords = { lat, lon };

      // Acquire coordinates if not provided
      if (lat === undefined || lon === undefined) {
        coords = await this.getUserLocation();
      }

      const res = await api.shelters.list(coords.lat, coords.lon);

      if (res && res.success && res.data?.shelters) {
        return {
          success: true,
          shelters: res.data.shelters,
          userCoords: coords,
        };
      }

      return {
        success: false,
        shelters: [],
        userCoords: coords,
        error: res?.error || "Failed to query emergency shelters",
      };
    } catch (err) {
      return {
        success: false,
        shelters: [],
        userCoords: { lat: lat || this.DEFAULT_COORDS.lat, lon: lon || this.DEFAULT_COORDS.lon },
        error: err.message || "Network error fetching shelter locations",
      };
    }
  },

  /**
   * Convert shelter array into standard GeoJSON FeatureCollection
   * @param {Array} shelters 
   * @returns {Object} GeoJSON
   */
  toGeoJSON(shelters = []) {
    return {
      type: "FeatureCollection",
      features: shelters.map((s) => ({
        type: "Feature",
        id: s.id,
        properties: {
          name: s.name,
          address: s.address,
          phone: s.phone,
          status: s.status,
          dist: s.dist,
          distMiles: s.distMiles,
          occupied: s.occupied,
          total: s.total,
          facilities: s.facilities,
        },
        geometry: {
          type: "Point",
          coordinates: [s.lon, s.lat],
        },
      })),
    };
  },

  /**
   * Filter shelters by availability and facilities
   * @param {Array} shelters 
   * @param {Object} filters 
   */
  filterShelters(shelters = [], { query = "", facility = "All", openOnly = false } = {}) {
    return shelters.filter((s) => {
      const q = query.toLowerCase().trim();
      const matchesQuery = !q || 
        s.name.toLowerCase().includes(q) || 
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.facilities && s.facilities.some(f => f.toLowerCase().includes(q)));

      const matchesFacility = facility === "All" || (s.facilities || []).includes(facility);
      const matchesOpen = !openOnly || s.status === "Open";

      return matchesQuery && matchesFacility && matchesOpen;
    });
  },
};

export default shelterService;
