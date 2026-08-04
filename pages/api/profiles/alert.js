import { createClient, createServiceClient } from "../../../lib/supabase-api";
import { sendEmergencyEmail } from "../../../lib/sendEmergencyEmail.js";

export default async function handler(req, res) {
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  if (req.method === "GET") {
    try {
      if (req.query.sent === "1") {
        const { data, error } = await supabase
          .from("alerts")
          .select("id, sender_id, recipient_id, message, acknowledged, created_at, profiles!alerts_recipient_id_fkey(username, display_name)")
          .eq("sender_id", user.id)
          .eq("acknowledged", true)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error && error.code === "42P01") {
          return res.status(200).json({ success: true, data: [], code: "TABLE_MISSING" });
        }
        if (error) throw error;

        const acks = (data || []).map((a) => ({
          id: a.id,
          sender_id: a.sender_id,
          recipient_id: a.recipient_id,
          message: a.message,
          acknowledged: a.acknowledged,
          created_at: a.created_at,
          recipient_name: a.profiles?.display_name || a.profiles?.username || "A family member",
        }));

        return res.status(200).json({ success: true, data: acks });
      }

      const { data, error } = await supabase
        .from("alerts")
        .select("id, sender_id, recipient_id, message, acknowledged, created_at, profiles!alerts_sender_id_fkey(username, display_name)")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error && error.code === "42P01") {
        return res.status(200).json({ success: true, data: [], code: "TABLE_MISSING" });
      }
      if (error) throw error;

      const alerts = (data || []).map((a) => ({
        id: a.id,
        sender_id: a.sender_id,
        recipient_id: a.recipient_id,
        message: a.message,
        acknowledged: a.acknowledged,
        created_at: a.created_at,
        sender_name: a.profiles?.display_name || a.profiles?.username || "A family member",
      }));

      return res.status(200).json({ success: true, data: alerts });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

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

    void notifyByEmail(supabase, { recipient_id, senderId: user.id, message: data.message });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function notifyByEmail(supabase, { recipient_id, senderId, message }) {
  try {
    const svc = createServiceClient();
    const [{ data: recipient }, { data: sender }] = await Promise.all([
      svc.auth.admin.getUserById(recipient_id),
      svc.auth.admin.getUserById(senderId),
    ]);

    const recipientEmail = recipient?.user?.email;
    const recipientMeta = recipient?.user?.user_metadata || {};
    const senderMeta = sender?.user?.user_metadata || {};
    const recipientName = recipientMeta.display_name || recipientMeta.username || "Family member";
    const senderName = senderMeta.display_name || senderMeta.username || "A family member";

    await sendEmergencyEmail({
      to: recipientEmail,
      recipientName,
      senderName,
      message,
    });
  } catch (err) {
    console.warn("[alert] notifyByEmail failed:", err.message);
  }
}
