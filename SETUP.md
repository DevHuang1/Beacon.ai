SETUP INSTRUCTIONS
===================

1. FIRMS API KEY (Wildfire Risk)
---------------------------------
- Go to: https://firms.modaps.eosdis.nasa.gov/api/
- Sign up for a free account
- You'll receive an API key via email
- Copy .env.example to .env.local:
    cp .env.example .env.local
- Edit .env.local and paste your key:
    FIRMS_API_KEY=your_key_here


2. GEOAI BACKEND (Flood satellite maps, burn scar overlay, damage assessment)
-------------------------------------------------------------------------------
The GeoAI Python backend is already at geoai-service/main.py.
It provides:
- /water/detect     — satellite flood extent (used by Flood Monitoring)
- /segment          — burn scar / land segmentation (used by Wildfire Risk)
- /change           — before/after damage assessment (used by Earthquake Info)
- /detect           — object detection (builtings, roads, vehicles)
- /classify         — land cover classification

Start it:
    cd geoai-service
    pip install -r requirements.txt
    python3 -m uvicorn main:app --port 8001

Required: fastapi, uvicorn, Pillow, numpy
Optional (for real AI): segment-geospatial, torchgeo, rasterio, geopandas


3. SHELTERS (optional — replace demo data)
-------------------------------------------
pages/api/shelters.js returns 5 hardcoded shelters in Eureka, CA.
Replace with a real source like:
- Red Cross shelter API
- A database / CMS
- Google Sheets / Airtable
- Any evac shelter feed from your local emergency services


4. RUN THE APP
--------------
npm install
npm run dev
Open http://localhost:3000


5. VERIFY EVERYTHING WORKS
---------------------------
- Escape Assistant: map loads, shelter markers visible, click "Show route on map"
- Weather: shows real NWS forecast for your area
- Earthquake: lists recent USGS events, toggle "Damage" for satellite change detection
- Flood: shows USGS river gauges, toggle "Satellite" for flood extent overlay
- Wildfire: shows FIRMS hotspots, toggle "Burn scar" for segmentation overlay
- Shelters: works with demo data
- Routes: works if shelters are loaded

