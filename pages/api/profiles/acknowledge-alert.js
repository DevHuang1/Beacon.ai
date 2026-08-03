import { createClient } from "../../../lib/supabase-api";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: "id required" });

  try {
    const { data, error } = await supabase
      .from("alerts")
      .update({ acknowledged: true })
      .eq("id", id)
      .eq("recipient_id", user.id)
      .select("id, sender_id, recipient_id, acknowledged")
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: "Alert not found" });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
