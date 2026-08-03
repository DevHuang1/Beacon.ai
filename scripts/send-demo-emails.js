#!/usr/bin/env node
/**
 * Demo email sender for Beacon.AI.
 * Sends a branded "Welcome to Beacon.AI" HTML email to every registered user.
 *
 * Usage (from repo root):
 *   node scripts/send-demo-emails.js
 *
 * Config comes from .env.local:
 *   RESEND_API_KEY   required (https://resend.com/api-keys)
 *   RESEND_FROM      optional sender, defaults to Beacon.AI <onboarding@resend.dev>
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  to list users
 *
 * Options:
 *   --dry-run      print recipients instead of sending
 *   --to=a@b,c@d   override recipients (comma separated) instead of all users
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { demoEmailHtml } from "../lib/emailTemplates.js";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

async function main() {
  const env = loadEnvLocal();
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const toArg = args.find((a) => a.startsWith("--to="));

  if (!env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY in .env.local — see https://resend.com/api-keys");
    process.exit(1);
  }

  let recipients = [];
  let emailToName = {};
  if (toArg) {
    const emails = toArg
      .slice("--to=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Try to resolve real display names from the user list.
    if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const { data } = await sb.auth.admin.listUsers();
        data.users.forEach(
          (u) =>
            (emailToName[u.email.toLowerCase()] =
              (u.user_metadata || {}).display_name ||
              (u.user_metadata || {}).username ||
              u.email.split("@")[0])
        );
      } catch (e) {
        console.warn("Could not resolve names:", e.message);
      }
    }

    recipients = emails.map((email) => ({
      email,
      name: emailToName[email.toLowerCase()] || email.split("@")[0],
    }));
  } else {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase URL / service role key in .env.local");
      process.exit(1);
    }
    const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await sb.auth.admin.listUsers();
    if (error) {
      console.error("Failed to list users:", error.message);
      process.exit(1);
    }
    recipients = data.users.map((u) => ({
      email: u.email,
      name: (u.user_metadata || {}).display_name || (u.user_metadata || {}).username || "there",
    }));
  }

  const from = env.RESEND_FROM || "Beacon.AI <onboarding@resend.dev>";
  const resend = new Resend(env.RESEND_API_KEY);

  console.log(
    dryRun
      ? "DRY RUN — would send to:\n"
      : `Sending demo to ${recipients.length} recipient(s) from ${from}:\n`
  );

  for (const r of recipients) {
    if (!r.email) {
      console.log("- (no email) skipping");
      continue;
    }
    if (dryRun) {
      console.log(`- ${r.email} (${r.name})`);
      continue;
    }
    const { data, error } = await resend.emails.send({
      from,
      to: [r.email],
      subject: `Hello ${r.name} — welcome to Beacon.AI`,
      text: `Hello ${r.name},\n\nWelcome to Beacon.AI — your family's emergency safety channel.\n\nStay safe,\nBeacon.AI`,
      html: demoEmailHtml({ name: r.name }),
    });
    console.log(
      error
        ? `- ${r.email} -> FAILED (${error.message})`
        : `- ${r.email} -> sent  ${data && data.id}`
    );
  }

  console.log(dryRun ? "\nDry run complete. Run again without --dry-run to send." : "\nDone.");
}

main();