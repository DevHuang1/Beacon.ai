import { fetchWithTimeout } from "../../lib/api-utils";

export default async function handler(req, res) {
  const { min_magnitude = 0, hours = 24, lat, lon, radius_km = 250 } = req.query;
  const magMin = Number(min_magnitude);

  try {
    // Use all_day feed for reliable data, all_hour often has 0 events
    const usgsUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
    const response = await fetchWithTimeout(usgsUrl, {}, 10000);
    if (!response.ok) throw new Error(`USGS returned ${response.status}`);

    const geo = await response.json();
    const cutoff = Date.now() - Number(hours) * 3600000;

    const latNum = Number(lat);
    const lonNum = Number(lon);
    const hasCenter = Number.isFinite(latNum) && Number.isFinite(lonNum);
    const rKm = Number.isFinite(parseFloat(radius_km)) ? Math.max(parseFloat(radius_km), 10) : 250;
    const degKm = 111.32;

    const distKm = (aLat, aLon) => {
      const dLat = ((aLat - latNum) * Math.PI) / 180;
      const dLon = ((aLon - lonNum) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((latNum * Math.PI) / 180) * Math.cos((aLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    let events = geo.features.filter((f) => f.properties.mag >= magMin && f.properties.time >= cutoff);

    if (hasCenter) {
      const latRange = rKm / degKm;
      const lonRange = rKm / (degKm * Math.cos((latNum * Math.PI) / 180));
      events = events
        .filter((f) => {
          const [flon, flat] = f.geometry.coordinates;
          return (
            Math.abs(flat - latNum) <= latRange &&
            Math.abs(flon - lonNum) <= lonRange
          );
        })
        .sort((a, b) => {
          const [alon, alat] = a.geometry.coordinates;
          const [blon, blat] = b.geometry.coordinates;
          return distKm(alat, alon) - distKm(blat, blon);
        })
        .slice(0, 8);
    } else {
      events = events.slice(0, 50);
    }

    const mapped = events.map((f, i) => {
      const mag = f.properties.mag;
      const level = mag >= 5 ? "major" : mag >= 3.5 ? "moderate" : "light";
      const ago = Math.round((Date.now() - f.properties.time) / 60000);
      return {
        id: i + 1,
        place: f.properties.place,
        mag,
        depth: `${f.geometry.coordinates[2].toFixed(1)} km`,
        time: ago < 60 ? `${ago} min ago` : `${Math.round(ago / 60)} hr ago`,
        level,
        timestamp: new Date(f.properties.time).toISOString(),
        url: f.properties.url,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      };
    });

    return res.status(200).json({
      success: true,
      data: { count: mapped.length, events: mapped, feed: "all_day" },
      source: "usgs",
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      error: `USGS query failed: ${err.message}`,
      source: "usgs_error",
    });
  }
}
