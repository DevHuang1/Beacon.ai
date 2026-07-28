export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  res.status(200).json({
    success: true,
    data: {
      detections: [
        { type: "building", confidence: 0.92, bbox: [120, 45, 200, 130] },
        { type: "building", confidence: 0.88, bbox: [310, 80, 380, 155] },
        { type: "vehicle", confidence: 0.76, bbox: [50, 200, 85, 230] },
        { type: "road", confidence: 0.95, bbox: [0, 150, 400, 170] },
        { type: "vegetation", confidence: 0.91, bbox: [200, 200, 350, 280] },
      ],
      model_used: "detectron2",
    },
    source: "geoai",
  });
}
