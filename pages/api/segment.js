export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  res.status(200).json({
    success: true,
    data: {
      segments: [
        { id: 0, label: "background", pixels: 512000, color: "#0A1526" },
        { id: 1, label: "water", pixels: 256000, color: "#3B82F6" },
        { id: 2, label: "vegetation", pixels: 384000, color: "#22C55E" },
        { id: 3, label: "urban", pixels: 128000, color: "#A78BFA" },
      ],
      image_size: { width: 800, height: 600 },
      model_used: "sam",
    },
    source: "geoai",
  });
}
