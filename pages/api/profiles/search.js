import { createClient } from "../../../lib/supabase-api";
import { createAdminClient } from "../../../lib/supabase-admin";

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
    // Prefer the public profiles table (RLS allows SELECT for authenticated users).
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);

    if (error && error.code === "42P01") {
      // profiles table doesn't exist yet; fall back to admin listUsers if a service key is set.
      const admin = createAdminClient();
      if (admin) {
        const { data: adminData, error: adminError } = await admin.auth.admin.listUsers({ search: query });
        if (!adminError) {
          const matched = (adminData?.users || [])
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
          return res.status(200).json({ success: true, data: { users: matched } });
        }
      }
      return res.status(200).json({
        success: true,
        data: {
          users: [],
          note: "Profile search requires the profiles table. Run scripts/setup-profiles.sql in Supabase SQL Editor, or add the service_role key.",
        },
      });
    }

    const results = (rows || [])
      .filter((u) => u.id !== user.id)
      .map((u) => ({
        id: u.id,
        email: null,
        username: u.username || null,
        display_name: u.display_name || u.username || "Unknown",
      }));

    return res.status(200).json({ success: true, data: { users: results } });
  } catch (err) {
    return res.status(200).json({
      success: true,
      data: { users: [], note: "Search unavailable." },
    });
  }
}