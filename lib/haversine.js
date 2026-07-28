/**
 * Client-side Haversine Distance & Proximity Validation Utility
 */

/**
 * Calculates exact Haversine distance in miles between two GPS coordinates
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in miles
 */
export function calculateHaversineMiles(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  
  const R = 3958.8; // Earth's mean radius in miles
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validates proximity status based on distance in miles
 * @param {number} distanceMiles 
 * @returns {Object} Proximity validity assessment
 */
export function getProximityValidity(distanceMiles) {
  const d = Number(distanceMiles) || 0;
  
  if (d <= 3.0) {
    return {
      valid: true,
      maxRadiusValid: true,
      level: "immediate",
      zone: "Immediate Proximity",
      label: "Immediate Zone",
      badgeText: "✓ Immediate (<3 mi)",
      color: "#10B981", // Emerald Green
      bg: "#ECFDF5",
      border: "#A7F3D0",
    };
  } else if (d <= 10.0) {
    return {
      valid: true,
      maxRadiusValid: true,
      level: "moderate",
      zone: "Regional Proximity",
      label: "Regional Zone",
      badgeText: "✓ Verified (<10 mi)",
      color: "#D97706", // Amber
      bg: "#FFFBEB",
      border: "#FDE68A",
    };
  } else {
    return {
      valid: false,
      maxRadiusValid: false,
      level: "extended",
      zone: "Extended Distance",
      label: "Beyond 10 mi Radius",
      badgeText: "⚠️ >10 mi Beyond Perimeter",
      color: "#DC2626", // Red
      bg: "#FEF2F2",
      border: "#FCA5A5",
    };
  }
}

/**
 * Validates geolocation for a list of shelters, re-calculates exact Haversine distances,
 * attaches proximity validity metadata, and filters out shelters beyond maxRadiusMiles.
 * @param {Array} shelters List of shelter objects
 * @param {number} userLat User's latitude
 * @param {number} userLon User's longitude
 * @param {number} [maxRadiusMiles=10] Maximum radius cutoff in miles (default 10)
 * @returns {{ verifiedShelters: Array, allSheltersWithValidation: Array, filteredCount: number }}
 */
export function validateAndFilterShelters(shelters = [], userLat, userLon, maxRadiusMiles = 10) {
  if (!Array.isArray(shelters) || !userLat || !userLon) {
    return {
      verifiedShelters: shelters,
      allSheltersWithValidation: shelters,
      filteredCount: 0,
    };
  }

  const processed = shelters.map((s) => {
    const sLat = Number(s.lat);
    const sLon = Number(s.lon);
    
    // Calculate client-side Haversine distance
    const distMiles = calculateHaversineMiles(userLat, userLon, sLat, sLon);
    const proximity = getProximityValidity(distMiles);

    return {
      ...s,
      lat: sLat,
      lon: sLon,
      distMiles,
      dist: `${distMiles.toFixed(1)} mi`,
      proximity,
    };
  }).sort((a, b) => a.distMiles - b.distMiles);

  // Filter out any shelters beyond maxRadiusMiles (default 10 miles)
  const verifiedShelters = processed.filter((s) => {
    if (maxRadiusMiles === null || maxRadiusMiles === undefined || maxRadiusMiles === "All") {
      return true;
    }
    return s.distMiles <= Number(maxRadiusMiles);
  });

  const filteredCount = processed.length - verifiedShelters.length;

  return {
    verifiedShelters,
    allSheltersWithValidation: processed,
    filteredCount,
  };
}
