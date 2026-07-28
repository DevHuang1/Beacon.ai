export default function handler(req, res) {
  res.status(200).json({ status: "ok", service: "beacon-geoai", version: "1.0.0" });
}
