import { createClient } from "../../../lib/supabase-api";
import { createAdminClient } from "../../../lib/supabase-admin";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  const profile = {
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username || null,
    display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Unknown",
  };

  try {
    const admin = createAdminClient();
    if (admin) {
      const { data: dbProfile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (dbProfile) {
        profile.dbProfile = dbProfile;
        profile.tableExists = true;
      }
    }
  } catch {
    profile.tableExists = false;
  }

  res.json({ success: true, profile });
}
