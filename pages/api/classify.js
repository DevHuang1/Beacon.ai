export default function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  res.status(200).json({
    success: true,
    data: {
      classifications: [
        { class: "water", confidence: 0.25 },
        { class: "forest", confidence: 0.35 },
        { class: "urban", confidence: 0.20 },
        { class: "barren", confidence: 0.15 },
        { class: "agriculture", confidence: 0.05 },
      ],
      dominant_class: "forest",
      model_used: "landcover",
    },
  });
}
