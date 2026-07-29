import { createClient } from "../../../lib/supabase-api";
import { createAdminClient } from "../../../lib/supabase-admin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  const admin = createAdminClient();
  if (!admin) {
    return res.status(200).json({
      success: false,
      note: "Database admin client not available. Run the SQL script in Supabase dashboard: open scripts/setup-profiles.sql",
      sqlScript: "scripts/setup-profiles.sql",
    });
  }

  try {
    const { error: testError } = await admin.from("profiles").select("id").limit(1);
    if (!testError) {
      return res.json({ success: true, message: "Profiles table already exists" });
    }
  } catch {}

  try {
    await admin.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          username TEXT UNIQUE,
          display_name TEXT,
          email TEXT,
          avatar_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    });
    return res.json({ success: true, message: "Profiles table created" });
  } catch (err) {
    return res.status(200).json({
      success: false,
      note: `Could not auto-create table: ${err.message}. Run the SQL in Supabase dashboard using scripts/setup-profiles.sql`,
      sqlScript: "scripts/setup-profiles.sql",
    });
  }
}
