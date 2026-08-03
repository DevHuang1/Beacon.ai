import { createClient } from "../../../lib/supabase-api";

export default async function handler(req, res) {
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("family_relationships")
        .select("user_id, family_member_id, role, profiles!family_relationships_family_member_id_fkey(username, display_name)")
        .eq("user_id", user.id);

      if (error && error.code === "42P01") {
        return res.status(200).json({
          success: true,
          data: { members: [], note: "DB not set up. Run scripts/setup-profiles.sql.", code: "TABLE_MISSING" },
        });
      }
      if (error) throw error;

      const members = (data || []).map((r) => ({
        user_id: r.user_id,
        family_member_id: r.family_member_id,
        role: r.role,
        username: r.profiles?.username || null,
        display_name: r.profiles?.display_name || r.profiles?.username || "Unknown",
      }));

      return res.status(200).json({ success: true, data: { members } });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === "POST") {
    const { username, role } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ success: false, error: "username required" });
    }
    try {
      const { data: members } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .ilike("username", username.trim().toLowerCase())
        .limit(1);
      if (!members || members.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      const target = members[0];
      if (target.id === user.id) {
        return res.status(400).json({ success: false, error: "Cannot add yourself" });
      }

      const { error: insErr } = await supabase
        .from("family_relationships")
        .upsert(
          { user_id: user.id, family_member_id: target.id, role: (role || "Family").slice(0, 100) },
          { onConflict: "user_id,family_member_id" }
        );

      if (insErr && insErr.code === "42P01") {
        return res.status(200).json({
          success: true,
          data: { member: null },
          note: "DB not set up. Run scripts/setup-profiles.sql.",
          code: "TABLE_MISSING",
        });
      }
      if (insErr) throw insErr;

      return res.status(200).json({
        success: true,
        data: {
          member: {
            user_id: user.id,
            family_member_id: target.id,
            role: role || "parent",
            username: target.username,
            display_name: target.display_name || target.username,
          },
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message, code: "DB_ERROR" });
    }
  }

  if (req.method === "DELETE") {
    const { family_member_id } = req.query;
    if (!family_member_id) {
      return res.status(400).json({ success: false, error: "family_member_id required" });
    }
    try {
      const { error } = await supabase
        .from("family_relationships")
        .delete()
        .eq("user_id", user.id)
        .eq("family_member_id", family_member_id);
      if (error && error.code === "42P01") {
        return res.status(200).json({ success: true, code: "TABLE_MISSING" });
      }
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}