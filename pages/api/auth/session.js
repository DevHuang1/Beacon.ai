import { createClient } from "../../../lib/supabase-api";

export default async function handler(req, res) {
  const supabase = createClient(req, res);
  const { data } = await supabase.auth.getUser();
  res.json({ user: data.user });
}
