# Disaster Escape

A real-time disaster preparedness and evacuation app built with Next.js, Leaflet maps, and live government/satellite APIs.

## Features

| Screen | What it does |
|--------|-------------|
| **Escape Assistant** | Find nearby shelters on the map, get walking/driving routes drawn in-app, track your live location |
| **Flood Monitoring** | USGS river gauge readings, global GDACS flood alerts, and satellite water detection |
| **Earthquake Info** | Live USGS seismic events, safety guides, emergency contacts |
| **Wildfire Risk** | Active fire hotspots from NASA FIRMS satellite imagery, burn scar segmentation |
| **Weather Alerts** | NWS forecast, storm alerts, 12-hour rain prediction |
| **Shelter Finder** | Search and filter open shelters by capacity and facilities |
| **Safe Route Planner** | Plan routes that auto-recalculate around expanding disaster zones |

## Data sources

| API | Source | Status | Key needed? |
|-----|--------|--------|-------------|
| Weather | [NWS API](https://www.weather.gov/documentation/services-web-api) | Live | No |
| Earthquakes | [USGS Earthquake Catalog](https://earthquake.usgs.gov/fdsnws/event/1/) | Live | No |
| River gauges | [USGS NWIS](https://waterservices.usgs.gov/) | Live | No |
| Flood alerts | [GDACS RSS](https://www.gdacs.org/) | Live | No |
| Routing | [OSRM](https://project-osrm.org/) (OpenStreetMap) | Live | No |
| Wildfire | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Live | Yes (free) |
| Satellite imagery | [NASA GIBS](https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs) | Live | No |
| Satellite flood | OpenGeoAI / NDWI (`geoai-service/main.py`) | Live (mock) | Python backend on :8001 |
| Burn scar | OpenGeoAI / SAM segmentation | Live (mock) | Python backend on :8001 |
| Damage assessment | OpenGeoAI / change detection | Live (mock) | Python backend on :8001 |
| Shelters | Hardcoded demo (Eureka, CA) | Mock | No |
| GeoAI proxy | `pages/api/geoai/[[...path]].js` | Live | Python backend on :8001 |
| detect/change/segment/classify | Hardcoded demo | Mock | No |

## Quick start

```bash
npm install
cp .env.example .env.local   # add your FIRMS_API_KEY for wildfire
npm run dev
```

Open http://localhost:3000.

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## Architecture

```
pages/
├── index.jsx              — Main app (SSG)
└── api/
    ├── weather.js         — NWS forecast + alerts
    ├── earthquake.js      — USGS quake feed (nearest events)
    ├── water.js           — USGS river gauges (nearest stations)
    ├── flood-alerts.js    — GDACS global flood alerts (nearest)
    ├── wildfire.js        — NASA FIRMS hotspots (bbox + nearest)
    ├── satellite.js       — NASA GIBS imagery proxy (cached)
    ├── route.js           — OSRM routing proxy (supports via points)
    ├── shelters.js        — Mock shelter data
    ├── geoai/[[...path]].js — GeoAI proxy → :8001
    ├── health.js          — Health check
    ├── modules.js         — Module listing
    ├── detect.js          — Mock detection
    ├── change.js          — Mock change detection
    ├── segment.js         — Mock segmentation
    └── classify.js        — Mock classification

screens/
├── EscapeAssistant.jsx    — Shelter finder + in-app routing
├── EscapeMapContent.jsx   — Leaflet markers/popups (client-only)
├── FloodMonitoring.jsx    — USGS gauges + GDACS alerts + satellite flood
├── EarthquakeInfo.jsx     — USGS events
├── WildfireRisk.jsx       — FIRMS hotspots + burn scar
├── WeatherAlerts.jsx      — NWS forecasts
├── ShelterFinder.jsx      — Shelter search
└── SafeRoutePlanner.jsx   — Disaster-aware route planning

components/
├── MapFrame.jsx           — Leaflet map container (GeoJSON remount + ImageOverlay)
├── MapFrameWrapper.jsx    — Dynamic import (SSR fix)
├── Navigation.jsx         — Side nav + top bar + alert drawer
├── Button.jsx             — Styled button
├── ShelterCard.jsx        — Shelter card UI
├── ui2.jsx                — PageHeader, Panel, Badge
├── Tutorial.jsx           — Walkthrough overlay
├── GlobalStyle.jsx        — Global CSS
└── index.js               — Barrel export
```

## What's been done

### Fake data removed
- `data/mockDangerZones.json` deleted
- `data/mockData.js` stripped (removed hardcoded shelters, quakes, rainfall)
- Fake SVG overlays (danger zones, safe routes) removed from all screens
- StatusRibbon hardcoded messages replaced

### APIs fixed
- Weather: fixed `User-Agent` format
- Earthquake: switched `all_hour` → `all_day` feed
- Wildfire: reads `FIRMS_API_KEY` from `process.env` with clear error
- Water: removed mock fallback, proper error propagation
- Added `fetchWithTimeout` (6s timeout) to prevent hangs

### Escape Assistant redesigned
- Real Leaflet `Marker` + `Popup` at actual `[lat, lon]` (not fake SVG)
- Shelter cards → pan map + open popup
- "Show route on map" → OSRM routing via `/api/route`, draws GeoJSON Polyline, shows turn-by-turn directions
- Locate / Watch buttons for live GPS tracking
- Real NWS weather panel

### Map infra
- Children render directly inside `MapContainer` (supports Marker, Popup, Circle, GeoJSON)
- GeoJSON routes styled via `geoStyle` prop
- SSR-safe via dynamic import wrapper

### GeoAI features added
- **Flood Monitoring** — toggle "Satellite" button to overlay satellite-derived flood extent polygon from OpenGeoAI NDWI analysis
- **Wildfire Risk** — toggle "Burn scar" to overlay burned area polygon from SAM segmentation
- **Earthquake Info** — toggle "Damage" to show before/after change detection polygons with change percentage, per-change-type breakdown (construction, deforestation, flooding)

### Real-data live maps (location-aware, nearest-only)
- **Wildfire** — FIRMS now queries a bounding box around the user's location (default 300 km) instead of the global feed, sorts hotspots by distance, and returns only the nearest 10. Gracefully reports 0 hotspots when the region is clear.
- **Flood** — Added a **GDACS global flood alerts** feed (`/api/flood-alerts.js`, no key needed) so non-US locations are covered. Returns only the nearest 3 alerts with severity, distance, and a localized map polygon. USGS gauges are now sorted by distance and capped to the nearest 6.
- **Earthquake** — USGS feed is filtered by the user's location (default 500 km), sorted by distance, and capped to the nearest 8. Fixed a bug where the global `.slice()` ran before the location filter and dropped nearby events.
- **Satellite imagery** — New `/api/satellite.js` proxies NASA GIBS (MODIS true color) with a 30-minute cache; feeds both flood water detection and burn scar segmentation.

### Disaster-aware route rerouting
- `SafeRoutePlanner` simulation now spawns the disaster **on the current escape route** so it actually blocks it.
- `rerouteAroundDetour` first tries OSRM alternatives that clear the danger zone, then batches perpendicular detour waypoints (parallel, 5 at a time) and picks the fastest safe route, falling back to the nearest safe shelter.
- `routeService.pickSafestRoute` now always returns a best route (safety ≥ 80% preferred, then duration), instead of bailing with "no safe route" when no route is fully clear.

### Emergency alert notification flow
- Family evacuation now fires emergency alerts to tracked family members via `sendEmergencyAlert`.
- Top-bar bell polls `/api/profiles/alert` every 10 seconds and shows the count of unacknowledged alerts.
- Alert drawer merges unacknowledged emergency alerts with NWS weather alerts, with severity-aware tones.
- Fixed the listener that previously swallowed the very first incoming alert.

### Map infra
- GeoJSON layers are remounted via a version/`geoKey` ref so updated routes actually re-render (react-leaflet ignores prop changes on the same component instance).
- `MapFrame` supports `imageOverlay` (NASA GIBS imagery) via react-leaflet `ImageOverlay`.
