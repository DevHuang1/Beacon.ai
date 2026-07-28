export default function handler(req, res) {
  res.status(200).json({
    modules: [
      { id: "water", path: "/api/water", description: "Water and flood detection" },
      { id: "segment", path: "/api/segment", description: "Satellite image segmentation" },
      { id: "classify", path: "/api/classify", description: "Landcover classification" },
      { id: "detect", path: "/api/detect", description: "Object detection" },
      { id: "change", path: "/api/change", description: "Change detection" },
      { id: "weather", path: "/api/weather", description: "Weather forecast and alerts" },
      { id: "earthquake", path: "/api/earthquake", description: "Earthquake data" },
      { id: "wildfire", path: "/api/wildfire", description: "Wildfire risk data" },
      { id: "shelters", path: "/api/shelters", description: "Emergency shelter data" },
    ],
  });
}
