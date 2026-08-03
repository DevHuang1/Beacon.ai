const PYTHON_SERVICE = process.env.GEOAI_SERVICE_URL || "http://127.0.0.1:8001";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const isGet = req.method === "GET";
    const body = isGet ? undefined : JSON.stringify(req.body);
    const response = await fetch(`${PYTHON_SERVICE}/classify`, {
      method: req.method,
      headers: {
        "Content-Type": req.headers["Content-Type"] || "application/json",
        ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}),
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`GeoAI service responded with ${response.status}`);
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: "GeoAI service unavailable on :8001 — start it with: uvicorn main:app --port 8001",
    });
  } finally {
    clearTimeout(timeout);
  }
}
