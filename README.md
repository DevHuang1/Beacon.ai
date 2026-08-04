# Disaster Escape

A real-time disaster preparedness and evacuation app built with Next.js, Leaflet maps, and live government/satellite APIs.

## Features

| Screen | What it does |
|--------|-------------|
| **Escape Assistant** | Find nearby shelters on the map, get walking/driving routes drawn in-app, track your live location |
| **Flood Monitoring** | USGS river gauge readings, flood risk indicators |
| **Earthquake Info** | Live USGS seismic events, safety guides, emergency contacts |
| **Wildfire Risk** | Active fire hotspots from NASA FIRMS satellite imagery |
| **Weather Alerts** | NWS forecast, storm alerts, 12-hour rain prediction |
| **Shelter Finder** | Search and filter open shelters by capacity and facilities |
| **Safe Route Planner** | Plan routes avoiding closures and hazards |

## Data sources

| API | Source | Status | Key needed? |
|-----|--------|--------|-------------|
| Weather | [NWS API](https://www.weather.gov/documentation/services-web-api) | Live | No |
| Earthquakes | [USGS Earthquake Catalog](https://earthquake.usgs.gov/fdsnws/event/1/) | Live | No |
| River gauges | [USGS NWIS](https://waterservices.usgs.gov/) | Live | No |
| Routing | [OSRM](https://project-osrm.org/) (OpenStreetMap) | Live | No |
| Wildfire | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Live | Yes (free) |
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

The dev server will automatically bind to an available port when `3000` is already in use. The console will print the actual URL to open.

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## Architecture

```
pages/
├── index.jsx              — Main app (SSG)
└── api/
    ├── weather.js         — NWS forecast + alerts
    ├── earthquake.js      — USGS quake feed
    ├── water.js           — USGS river gauges
    ├── wildfire.js        — NASA FIRMS hotspots
    ├── route.js           — OSRM routing proxy
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
├── FloodMonitoring.jsx    — USGS gauges
├── EarthquakeInfo.jsx     — USGS events
├── WildfireRisk.jsx       — FIRMS hotspots
├── WeatherAlerts.jsx      — NWS forecasts
├── ShelterFinder.jsx      — Shelter search
└── SafeRoutePlanner.jsx   — Route planning

components/
├── MapFrame.jsx           — Leaflet map container
├── MapFrameWrapper.jsx    — Dynamic import (SSR fix)
├── Navigation.jsx         — Side nav + top bar + status
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
