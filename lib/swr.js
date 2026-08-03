import useSWR from "swr";
import { api } from "./api";
import shelterService from "./services/shelterService";

export const SWR_CACHE_KEY = "beacon_swr_cache";
export const SWR_CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * SWR cache provider backed by localStorage so data survives full page
 * refreshes (instant paint) and is revalidated in the background.
 */
export function localStorageSWRProvider() {
  const initial = [];
  try {
    const raw = localStorage.getItem(SWR_CACHE_KEY);
    if (raw) {
      const now = Date.now();
      for (const [k, v] of JSON.parse(raw)) {
        if (v && v._t !== undefined && now - v._t < SWR_CACHE_TTL_MS) {
          initial.push([k, v]);
        }
      }
    }
  } catch {}

  const map = new Map(initial);

  window.addEventListener("beforeunload", () => {
    try {
      const now = Date.now();
      const snapshot = Array.from(map.entries()).map(([k, v]) => [k, { ...v, _t: now }]);
      localStorage.setItem(SWR_CACHE_KEY, JSON.stringify(snapshot));
    } catch {}
  });

  return map;
}

export const swrConfig = {
  provider: () => (typeof window === "undefined" ? new Map() : localStorageSWRProvider()),
  dedupingInterval: 2000,
  focusThrottleInterval: 5000,
  errorRetryCount: 2,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  keepPreviousData: true,
};

function errMessage(data, error) {
  if (data && data.success === false && data.error) return data.error;
  if (error) return error.message;
  return null;
}

export function useShelters(lat, lon, radiusMiles) {
  const radius = radiusMiles || shelterService.getDefaultRadius();
  const key = lat != null && lon != null ? `/api/shelters?lat=${lat}&lon=${lon}&radius=${radius}` : null;
  const { data, error, mutate } = useSWR(key, () => api.shelters.list(lat, lon, radius));
  return {
    shelters: data?.data?.shelters || [],
    userLocation: data?.data?.userLocation || null,
    shelterLoading: !data && !error,
    shelterError: errMessage(data, error),
    mutate,
  };
}

export function useWeatherNow(lat, lon) {
  const key = lat != null && lon != null ? `/api/weather?type=now&lat=${lat}&lon=${lon}` : null;
  const { data, error } = useSWR(key, () => api.weather.now(lat, lon));
  return {
    weather: data?.success ? data.data : null,
    weatherError: errMessage(data, error),
  };
}

export function useWeatherAlerts(lat, lon) {
  const key = lat != null && lon != null ? `/api/weather?type=alerts&lat=${lat}&lon=${lon}` : null;
  const { data, error } = useSWR(key, () => api.weather.alerts(lat, lon));
  return {
    alerts: data?.alerts || [],
    alertsError: errMessage(data, error),
  };
}

export function useWeatherForecast(lat, lon) {
  const key = lat != null && lon != null ? `/api/weather?lat=${lat}&lon=${lon}` : null;
  const { data, error } = useSWR(key, () => api.weather.forecast(lat, lon));
  return {
    forecastData: data?.success ? data.data : null,
    forecastError: errMessage(data, error),
  };
}

export function useHotspots() {
  const { data, error } = useSWR("/api/wildfire?type=hotspots", () => api.wildfire.hotspots());
  return {
    hotspots: data?.success ? data.data || [] : [],
    hotspotsError: errMessage(data, error),
  };
}

export function useEarthquakes(minMag = 0, hours = 24, lat, lon, radiusKm = 200) {
  let key = `/api/earthquake?min_magnitude=${minMag}&hours=${hours}`;
  if (lat != null && lon != null) key += `&lat=${lat}&lon=${lon}&radius_km=${radiusKm}`;
  const { data, error } = useSWR(key, () => api.earthquake.recent(minMag, hours, lat, lon, radiusKm));
  return {
    quakes: data?.success ? data.data || [] : [],
    quakeError: errMessage(data, error),
  };
}

export default useSWR;
