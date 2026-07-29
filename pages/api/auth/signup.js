import { createClient } from "../../../lib/supabase-api";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const { email, password, username } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });

  const supabase = createClient(req, res);

  const options = {};
  if (username && typeof username === "string") {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (clean.length >= 2) {
      options.data = { username: clean, display_name: clean };
    }
  }

  const { data, error } = await supabase.auth.signUp({ email, password, options });

  if (error) return res.status(400).json({ success: false, error: error.message });

  res.json({ success: true, user: data.user, session: data.session });
}
