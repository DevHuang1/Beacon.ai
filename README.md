# Disaster Escape

A real-time disaster preparedness and evacuation app built with Next.js, Leaflet maps, and live government/satellite APIs. Includes full dark mode, location-aware live data, emergency alerting, and family tracking.

## Features

| Screen | What it does |
|--------|-------------|
| **Escape Assistant** | Find nearby shelters on the map, get walking/driving routes drawn in-app, track your live location |
| **Flood Monitoring** | USGS river gauge readings, global GDACS flood alerts, and satellite water detection |
| **Earthquake Info** | Live USGS seismic events, safety guides, emergency contacts |
| **Wildfire Risk** | Active fire hotspots from NASA FIRMS satellite imagery, burn scar segmentation |
| **Weather Alerts** | NWS forecast, active storm alerts, 12-hour rain prediction, live NEXRAD radar map |
| **Shelter Finder** | Search and filter open shelters by capacity and facilities |
| **Safe Route Planner** | Plan routes that auto-recalculate around expanding disaster zones |
| **Family Tracking** | Live map of tracked family members with emergency alerting |
| **Profile / Settings** | Saved location, dark mode toggle, theme preferences |

### Appearance
- **Dark mode** toggled in Profile → Settings, persisted in localStorage (`beacon_ai_theme`), defaults to the system `prefers-color-scheme`, and applies without a flash of light theme on load.
- Every surface, chart, sidebar, top bar, and map control follows the active theme. Leaflet's light OSM base tiles are inverted in dark mode so map squares match, while route/hazard vector layers keep their real colors.

### Alerts & email
- Emergency alerts notify tracked family members by email (Resend) with app buttons that deep-link into the app.
- The top-bar bell polls `/api/profiles/alert` and merges unacknowledged emergency alerts with NWS weather alerts, with severity-aware tones.

## Languages & tools

- **JavaScript** — app logic, SSR with Next.js
- **React** — UI components and state
- **HTML & CSS** — inline-styled UI, theme-aware global styles
- **Node.js** — serverless API routes (`/api/*`)

### Key libraries

- **Next.js** — React framework (SSG + API routes)
- **Leaflet / react-leaflet** — interactive maps
- **SWR** — data fetching and caching
- **Supabase** — profiles, family, alert persistence
- **Resend** — emergency email notifications
- **Groq / Google GenAI** — GeoAI assistant features
- **lucide-react** — icons

## Data sources

| API | Source | Status | Key needed? |
|-----|--------|--------|-------------|
| Weather | ☁️ [NWS API](https://www.weather.gov/documentation/services-web-api) | Live | No |
| Weather fallback | 🌍 [Open-Meteo](https://open-meteo.com/) | Live (non-US) | No |
| Geocoding | 📍 [Nominatim](https://nominatim.openstreetmap.org/) | Live | No |
| Earthquakes | 🌐 [USGS Earthquake Catalog](https://earthquake.usgs.gov/fdsnws/event/1/) | Live | No |
| River gauges | 💧 [USGS NWIS](https://waterservices.usgs.gov/) | Live | No |
| Flood alerts | 🌊 [GDACS RSS](https://www.gdacs.org/) | Live | No |
| Routing | 🛣️ [OSRM](https://project-osrm.org/) (OpenStreetMap) | Live | No |
| Wildfire | 🔥 [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Live | Yes (free) |
| Satellite imagery | 🛰️ [NASA GIBS](https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs) | Live | No |
| Radar | 📡 NOAA NEXRAD (Iowa Environmental Mesonet) | Live | No |
| NWS alerts | ⚠️ [NWS API](https://api.weather.gov/alerts) | Live | No |
| Map tiles | 🗺️ [OpenStreetMap](https://www.openstreetmap.org/) | Live | No |
| Emergency email | ✉️ [Resend](https://resend.com/) | Live | Yes (free) |
| Shelters | 🏠 [OpenStreetMap / Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) | Live | No |

## Quick start

```bash
npm install
cp .env.example .env.local   # add your FIRMS_API_KEY, RESEND_API_KEY
npm run dev
```

Open http://localhost:3000.

## Architecture

```
pages/
├── index.jsx              — Main app (SSG)
└── api/
    ├── weather.js         — NWS forecast + alerts (Open-Meteo fallback)
    ├── earthquake.js      — USGS quake feed (nearest events)
    ├── water.js           — USGS river gauges (nearest stations)
    ├── flood-alerts.js    — GDACS global flood alerts (nearest)
    ├── wildfire.js        — NASA FIRMS hotspots (bbox + nearest)
    ├── satellite.js       — NASA GIBS imagery proxy (cached)
    ├── route.js           — OSRM routing proxy (supports via points)
    ├── shelters.js        — Mock shelter data
    ├── geoai/[[...path]].js — GeoAI proxy → :8001
    ├── profiles/          — Profile, family, alert, shared-location APIs
    └── health.js          — Health check

screens/
├── EscapeAssistant.jsx    — Shelter finder + in-app routing
├── FloodMonitoring.jsx    — USGS gauges + GDACS alerts + satellite flood
├── EarthquakeInfo.jsx     — USGS events
├── WildfireRisk.jsx       — FIRMS hotspots + burn scar
├── WeatherAlerts.jsx      — NWS forecasts + radar map
├── ShelterFinder.jsx      — Shelter search
├── SafeRoutePlanner.jsx   — Disaster-aware route planning
├── FamilyTracking.jsx     — Family members map + emergency alerts
└── Profile.jsx            — Settings, location, dark mode

components/
├── MapFrame.jsx           — Leaflet map container (GeoJSON remount + ImageOverlay)
├── Navigation.jsx         — Side nav + top bar + alert drawer
├── Button.jsx             — Styled button
├── ShelterCard.jsx        — Shelter card UI
├── GlobalStyle.jsx        — Theme-aware global CSS
└── index.js               — Barrel export
```

## Deployment

Deployed on [Railway](https://railway.app). Required env vars: `FIRMS_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
