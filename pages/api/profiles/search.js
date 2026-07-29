import { createClient } from "../../../lib/supabase-api";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  const { q } = req.query;
  if (!q || q.trim().length < 1) {
    return res.status(200).json({ success: true, data: { users: [] } });
  }

  const query = q.trim().toLowerCase();

  try {
    const { data: { users: matched }, error } = await supabase.auth.admin.listUsers({
      search: query,
    });

    if (error) {
      return res.status(200).json({
        success: true,
        data: { users: [], note: "User search requires admin permissions. Ask your admin to add the service_role key." },
      });
    }

    const results = matched
      .filter((u) => u.id !== user.id)
      .filter((u) => {
        const meta = u.user_metadata || {};
        const name = (meta.username || meta.display_name || u.email || "").toLowerCase();
        return name.includes(query);
      })
      .slice(0, 10)
      .map((u) => ({
        id: u.id,
        email: u.email,
        username: u.user_metadata?.username || null,
        display_name: u.user_metadata?.display_name || u.email?.split("@")[0] || "Unknown",
      }));

    return res.status(200).json({ success: true, data: { users: results } });
  } catch (err) {
    return res.status(200).json({
      success: true,
      data: { users: [], note: "Search unavailable without admin permissions." },
    });
  }
}
