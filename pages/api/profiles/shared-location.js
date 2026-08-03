import { createClient } from "../../../lib/supabase-api";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  const { latitude, longitude } = req.body;
  if (!Number.isFinite(parseFloat(latitude)) || !Number.isFinite(parseFloat(longitude))) {
    return res.status(400).json({ success: false, error: "latitude and longitude required" });
  }

  try {
    // Replace any existing location row for this user with the new one.
    const { error: delErr } = await supabase
      .from("shared_locations")
      .delete()
      .eq("user_id", user.id);
    if (delErr && delErr.code !== "42P01") throw delErr;

    const { data, error } = await supabase
      .from("shared_locations")
      .insert({
        user_id: user.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        shared_at: new Date().toISOString(),
      })
      .select("latitude, longitude, shared_at")
      .single();

    if (error && error.code === "42P01") {
      return res.status(200).json({
        success: true,
        data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), shared_at: null },
        note: "DB not set up. Run scripts/setup-profiles.sql.",
        code: "TABLE_MISSING",
      });
    }
    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: "DB_ERROR" });
  }
}