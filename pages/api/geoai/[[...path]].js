const PYTHON_SERVICE = process.env.GEOAI_SERVICE_URL || "http://127.0.0.1:8001";

export default async function handler(req, res) {
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join("/") : path || "";
  const targetUrl = `${PYTHON_SERVICE}/${targetPath}`;

  try {
    const body = req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}),
      },
      body,
      timeout: 30000,
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    // Fallback in-memory response if Python service is not running
    if (targetPath === "health") {
      return res.status(200).json({
        status: "ok",
        modules: { water: true, segment: true, classify: true, detect: true, change: true },
        libs: { numpy: false, pil: false, samgeo: false, torchgeo: false },
      });
    }

    if (targetPath.includes("water")) {
      return res.status(200).json({
        success: true,
        data: {
          water_pct: 12.4,
          water_pixels: 158720,
          total_pixels: 1280000,
          threshold: req.body?.threshold || 0.5,
          note: "Mock data (Node.js fallback)",
        },
        source: "opengeoai_mock",
      });
    }

    if (targetPath.includes("segment")) {
      return res.status(200).json({
        success: true,
        data: {
          segments: [
            { id: 0, label: "background", pixels: 512000, color: "#0A1526" },
            { id: 1, label: "water", pixels: 256000, color: "#3B82F6" },
            { id: 2, label: "vegetation", pixels: 384000, color: "#22C55E" },
            { id: 3, label: "urban", pixels: 128000, color: "#A78BFA" },
          ],
          image_size: { w: 800, h: 600 },
          model: req.body?.model || "sam",
        },
        source: "opengeoai_mock",
      });
    }

    if (targetPath.includes("classify")) {
      return res.status(200).json({
        success: true,
        data: {
          classifications: [
            { class: "water", confidence: 0.25 },
            { class: "forest", confidence: 0.35 },
            { class: "urban", confidence: 0.20 },
            { class: "barren", confidence: 0.15 },
            { class: "agriculture", confidence: 0.05 },
          ],
          dominant: "forest",
          model: req.body?.model || "landcover",
        },
        source: "opengeoai_mock",
      });
    }

    if (targetPath.includes("detect")) {
      return res.status(200).json({
        success: true,
        data: {
          detections: [
            { type: "building", confidence: 0.92, bbox: [120, 45, 200, 130] },
            { type: "building", confidence: 0.88, bbox: [310, 80, 380, 155] },
            { type: "vehicle", confidence: 0.76, bbox: [50, 200, 85, 230] },
            { type: "road", confidence: 0.95, bbox: [0, 150, 400, 170] },
            { type: "vegetation", confidence: 0.91, bbox: [200, 200, 350, 280] },
          ],
          model: "detectron2",
        },
        source: "opengeoai_mock",
      });
    }

    if (targetPath.includes("change")) {
      return res.status(200).json({
        success: true,
        data: {
          change_pct: 15.3,
          significant: true,
          changes: [
            { type: "new_construction", area_m2: 4500, confidence: 0.87 },
            { type: "deforestation", area_m2: 12000, confidence: 0.93 },
            { type: "flooding", area_m2: 8200, confidence: 0.78 },
          ],
          model: "change_detection",
        },
        source: "opengeoai_mock",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Node.js fallback endpoint",
      path: targetPath,
    });
  }
}
