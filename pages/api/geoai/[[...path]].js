const PYTHON_SERVICE = process.env.GEOAI_SERVICE_URL || "http://127.0.0.1:8001";

export default async function handler(req, res) {
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join("/") : path || "";
  const targetUrl = `${PYTHON_SERVICE}/${targetPath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const body = req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}),
      },
      body,
      signal: controller.signal,
    });

    const data = await response.json();
    return res.status(response.status).json({ ...data, geoai: { reachable: true, url: PYTHON_SERVICE } });
  } catch (err) {
    const diagnosed =
      PYTHON_SERVICE === "http://127.0.0.1:8001"
        ? "[GeoAI backend NOT deployed or GEOAI_SERVICE_URL not set] "
        : "[GeoAI service unreachable] ";

    if (targetPath === "health") {
      return res.status(200).json({
        status: "degraded",
        pythonService: false,
        error: `${diagnosed}${err.message || "failed to reach backend"}`,
        geoaiUrl: PYTHON_SERVICE,
        modules: { water: false, segment: false, classify: false, detect: false, change: false },
        libs: { numpy: false, pil: false, samgeo: false, torchgeo: false },
      });
    }

    return res.status(200).json({
      success: false,
      error: `${diagnosed}GeoAI feature unavailable (${err.message || "no response"}). Set GEOAI_SERVICE_URL and deploy the Python service to enable it.`,
      source: "geoai_unavailable",
    });
  } finally {
    clearTimeout(timeout);
  }
}