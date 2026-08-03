import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-side admin operations (e.g. auth.admin).
 * Must only be used inside API routes / server code.
 */
export const createServiceClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

function serialize(name, value, options = {}) {
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (options.maxAge != null) str += `; Max-Age=${options.maxAge}`;
  if (options.domain) str += `; Domain=${options.domain}`;
  if (options.path) str += `; Path=${options.path}`;
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) str += "; HttpOnly";
  if (options.secure) str += "; Secure";
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}

export const createClient = (req, res) =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map((name) => ({
            name,
            value: req.cookies[name],
          }));
        },
        setAll(cookiesToSet) {
          const headers = cookiesToSet.map(({ name, value, options }) =>
            serialize(name, value, options)
          );
          res.setHeader("Set-Cookie", headers);
        },
      },
    },
  );
