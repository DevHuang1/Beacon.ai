export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  res.status(200).json({
    success: true,
    data: {
      change_percentage: 15.3,
      significant_change: true,
      changes: [
        { type: "new_construction", area_m2: 4500, confidence: 0.87 },
        { type: "deforestation", area_m2: 12000, confidence: 0.93 },
        { type: "flooding", area_m2: 8200, confidence: 0.78 },
      ],
      model_used: "change_detection",
    },
  });
}
