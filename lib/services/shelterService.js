import { api } from "../api";
import { calculateHaversineMiles, validateAndFilterShelters } from "../haversine";

/**
 * Service to manage emergency shelter queries, user GPS acquisition, and map calculations
 */
export const shelterService = {
  /**
   * Default fallback coordinates (Eureka, CA region) if GPS permission is denied or unavailable
   */
  get DEFAULT_COORDS() {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("beacon_profile_location");
        if (raw) {
          const loc = JSON.parse(raw);
          if (loc.lat && loc.lon) {
            const lat = parseFloat(loc.lat);
            const lon = parseFloat(loc.lon);
            if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
          }
        }
      } catch {}
    }
    return { lat: 40.802, lon: -124.163 };
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
   * Query emergency shelters sorted by proximity to provided coordinates and validate Haversine distance
   * @param {number} [lat] User latitude
   * @param {number} [lon] User longitude
   * @param {number} [maxRadiusMiles=10] Maximum radius filter in miles
   * @returns {Promise<{ success: boolean, shelters: Array, allShelters: Array, filteredOutCount: number, userCoords: Object, error?: string }>}
   */
  async fetchNearestShelters(lat, lon, maxRadiusMiles = 10) {
    try {
      let coords = { lat, lon };

      // Acquire coordinates if not provided
      if (lat === undefined || lon === undefined) {
        coords = await this.getUserLocation();
      }

      const res = await api.shelters.list(coords.lat, coords.lon);

      if (res && res.success && res.data?.shelters) {
        const { verifiedShelters, allSheltersWithValidation, filteredCount } = validateAndFilterShelters(
          res.data.shelters,
          coords.lat,
          coords.lon,
          maxRadiusMiles
        );

        return {
          success: true,
          shelters: verifiedShelters,
          allShelters: allSheltersWithValidation,
          filteredOutCount: filteredCount,
          userCoords: coords,
        };
      }

      return {
        success: false,
        shelters: [],
        allShelters: [],
        filteredOutCount: 0,
        userCoords: coords,
        error: res?.error || "Failed to query emergency shelters",
      };
    } catch (err) {
      return {
        success: false,
        shelters: [],
        allShelters: [],
        filteredOutCount: 0,
        userCoords: { lat: lat || this.DEFAULT_COORDS.lat, lon: lon || this.DEFAULT_COORDS.lon },
        error: err.message || "Network error fetching shelter locations",
      };
    }
  },

  /**
   * Automatically acquire user GPS, query nearest emergency shelters, and use AI
   * to assess safety, capacity, and recommend the best shelter.
   * @param {number} [userLat]
   * @param {number} [userLon]
   */
  async findSheltersWithAI(userLat, userLon) {
    try {
      let coords = { lat: userLat, lon: userLon };
      if (userLat === undefined || userLon === undefined) {
        coords = await this.getUserLocation();
      }

      const shelterRes = await this.fetchNearestShelters(coords.lat, coords.lon);
      const shelters = shelterRes.shelters || [];

      const prompt = `Perform an automatic emergency shelter assessment for my current GPS location (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}). Analyze the candidate shelters, identify the single best emergency shelter for immediate dispatch, and provide brief actionable safety steps.`;

      const aiRes = await api.advisor(prompt, {
        userLocation: coords,
        shelters: shelters.slice(0, 5),
      });

      return {
        success: true,
        userCoords: coords,
        shelters,
        recommendedShelter: shelters[0] || null,
        aiData: aiRes?.data || null,
        aiActive: aiRes?.aiActive ?? true,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || "Failed to query AI emergency shelter advisor",
      };
    }
  },

  /**
   * Generate at least 10 demo shelters around given coordinates
   * @param {number} lat Center latitude
   * @param {number} lon Center longitude
   * @param {Array} existing Real shelters already fetched
   * @returns {Array} Combined list with minimum 10 shelters
   */
  generateDemoShelters(lat, lon, existing = []) {
    const names = [
      { name: "Northside Community Center", cap: 250, occupied: 87, medical: true, food: true },
      { name: "Highland Elementary School", cap: 400, occupied: 210, medical: false, food: true },
      { name: "St. Mary's Church Hall", cap: 180, occupied: 45, medical: false, food: false },
      { name: "Riverfront Recreation Center", cap: 320, occupied: 150, medical: true, food: true },
      { name: "Eastside Medical Clinic", cap: 120, occupied: 95, medical: true, food: false },
      { name: "West Valley High School", cap: 500, occupied: 180, medical: true, food: true },
      { name: "Lakeside Community Center", cap: 200, occupied: 60, medical: false, food: true },
      { name: "Pine Grove Elementary", cap: 350, occupied: 130, medical: false, food: true },
      { name: "Harbor View Shelter", cap: 160, occupied: 110, medical: true, food: false },
      { name: "Cedar Park Sports Complex", cap: 600, occupied: 90, medical: true, food: true },
      { name: "Oakwood Community Hall", cap: 140, occupied: 40, medical: false, food: false },
      { name: "Sunset Middle School", cap: 380, occupied: 200, medical: true, food: true },
    ];

    const demo = [];
    const baseLat = lat || 40.802;
    const baseLon = lon || -124.163;

    for (let i = 0; i < names.length; i++) {
      const angle = (i / names.length) * Math.PI * 2;
      const distDeg = 0.008 + Math.random() * 0.035;
      const sLat = baseLat + Math.cos(angle) * distDeg;
      const sLon = baseLon + Math.sin(angle) * distDeg;
      const n = names[i];
      const distMiles = calculateHaversineMiles(baseLat, baseLon, sLat, sLon);
      const status = n.occupied < n.cap * 0.9 ? "Available" : "Limited Space";
      demo.push({
        id: `demo-${i}`,
        lat: parseFloat(sLat.toFixed(5)),
        lon: parseFloat(sLon.toFixed(5)),
        name: n.name,
        address: `${Math.floor(100 + Math.random() * 900)} ${["Main", "Oak", "Elm", "Park", "Lake", "Cedar", "Pine"][i % 7]} St`,
        cap: `${n.cap}`,
        occupied: n.occupied,
        total: n.cap,
        status,
        dist: `${distMiles.toFixed(1)} mi`,
        distMiles,
        facilities: [
          n.medical ? "Medical" : null,
          n.food ? "Hot Meals" : null,
          "Pets welcome",
        ].filter(Boolean),
        phone: `+1 (707) ${String(400 + i * 10).padStart(3, "0")}-${String(1000 + Math.floor(Math.random() * 9000))}`,
        isDemo: true,
      });
    }

    demo.sort((a, b) => a.distMiles - b.distMiles);

    const all = [...existing, ...demo];
    const seen = new Set();
    return all.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
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
