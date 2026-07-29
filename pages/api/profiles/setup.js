import { createClient } from "../../../lib/supabase-api";
import { createAdminClient } from "../../../lib/supabase-admin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  const { username, display_name } = req.body;
  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return res.status(400).json({ success: false, error: "Username must be at least 2 characters" });
  }

  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (clean !== username.trim().toLowerCase()) {
    return res.status(400).json({ success: false, error: "Username can only contain letters, numbers, hyphens, and underscores" });
  }

  try {
    const { error } = await supabase.auth.updateUser({
      data: { username: clean, display_name: display_name?.trim() || clean },
    });
    if (error) return res.status(400).json({ success: false, error: error.message });

    try {
      const admin = createAdminClient();
      if (admin) {
        await admin.from("profiles").upsert({
          id: user.id,
          username: clean,
          display_name: display_name?.trim() || clean,
          email: user.email,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }
    } catch {}

    return res.status(200).json({ success: true, data: { username: clean, display_name: display_name?.trim() || clean } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
