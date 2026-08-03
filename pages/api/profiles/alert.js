import { createClient } from "../../../lib/supabase-api";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  const { recipient_id, message, alert_type } = req.body || {};
  if (!recipient_id || typeof recipient_id !== "string") {
    return res.status(400).json({ success: false, error: "recipient_id required" });
  }

  try {
    const { data, error } = await supabase
      .from("alerts")
      .insert({
        sender_id: user.id,
        recipient_id,
        message: message || "🚨 EMERGENCY ALERT from your family member on Beacon.AI. Check your app immediately!",
        alert_type: alert_type || "emergency",
      })
      .select("id, sender_id, recipient_id, message, created_at")
      .single();

    if (error && error.code === "42P01") {
      return res.status(200).json({
        success: false,
        code: "TABLE_MISSING",
        error: "Alerts table not set up — run scripts/setup-profiles.sql.",
      });
    }
    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
