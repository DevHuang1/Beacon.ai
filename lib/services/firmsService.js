import { api } from "../api";

/**
 * Service to fetch and manage NASA FIRMS wildfire hotspot data
 */
export const firmsService = {
  /**
   * Fetches live wildfire hotspot points from NASA FIRMS API via backend proxy
   * @returns {Promise<{ success: boolean, hotspots: Array, conditions?: Object, error?: string }>}
   */
  async fetchHotspots() {
    try {
      const res = await api.wildfire.hotspots();
      if (res && res.success) {
        return {
          success: true,
          hotspots: res.data || [],
          source: res.source || "firms",
        };
      }
      return {
        success: false,
        hotspots: [],
        error: res?.error || "Failed to fetch FIRMS wildfire data",
      };
    } catch (err) {
      return {
        success: false,
        hotspots: [],
        error: err.message || "Network error requesting NASA FIRMS hotspots",
      };
    }
  },

  /**
   * Converts hotspot data array into standard GeoJSON FeatureCollection format
   * @param {Array} hotspots 
   * @returns {Object} GeoJSON FeatureCollection
   */
  toGeoJSON(hotspots = []) {
    return {
      type: "FeatureCollection",
      features: hotspots.map((h, i) => ({
        type: "Feature",
        id: h.id || `hotspot-${i}`,
        properties: {
          intensity: h.intensity || 0.5,
          frp: h.frp || 0,
          acq_date: h.acq_date || "Recent",
          satellite: h.satellite || "VIIRS/MODIS",
          title: `Active Hotspot (FRP: ${h.frp || 0} MW)`,
        },
        geometry: {
          type: "Point",
          coordinates: [h.longitude, h.latitude],
        },
      })),
    };
  },

  /**
   * Calculates key summary analytics from hotspot list
   * @param {Array} hotspots 
   */
  getSummary(hotspots = []) {
    if (!hotspots.length) {
      return {
        totalCount: 0,
        maxFRP: 0,
        avgFRP: 0,
        threatLevel: "LOW",
        color: "#10B981",
      };
    }

    const totalCount = hotspots.length;
    const maxFRP = Math.max(...hotspots.map((h) => h.frp || 0));
    const avgFRP = hotspots.reduce((acc, h) => acc + (h.frp || 0), 0) / totalCount;

    let threatLevel = "MODERATE";
    let color = "#F59E0B";

    if (totalCount >= 20 || maxFRP > 100) {
      threatLevel = "EXTREME";
      color = "#DC2626";
    } else if (totalCount >= 10 || maxFRP > 50) {
      threatLevel = "HIGH";
      color = "#EF4444";
    }

    return {
      totalCount,
      maxFRP: Math.round(maxFRP * 10) / 10,
      avgFRP: Math.round(avgFRP * 10) / 10,
      threatLevel,
      color,
    };
  },
};

export default firmsService;
