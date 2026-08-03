import { createClient } from "../../../lib/supabase-api";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("shared_locations")
      .select("id, user_id, latitude, longitude, shared_at, expires_at, profiles!shared_locations_user_id_fkey(username, display_name)")
      .gt("expires_at", now)
      .order("shared_at", { ascending: false });

    if (error && error.code === "42P01") {
      return res.status(200).json({
        success: true,
        data: { locations: [], note: "DB not set up. Run scripts/setup-profiles.sql.", code: "TABLE_MISSING" },
      });
    }
    if (error) throw error;

    const locations = (data || []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      latitude: r.latitude,
      longitude: r.longitude,
      shared_at: r.shared_at,
      expires_at: r.expires_at,
      username: r.profiles?.username || null,
      display_name: r.profiles?.display_name || r.profiles?.username || "Unknown",
    }));

    return res.status(200).json({ success: true, data: { locations } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}