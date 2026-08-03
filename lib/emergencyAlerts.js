import { createClient } from "./supabase-client";

const CHANNEL = "beacon-family-alerts";
const EVENT = "emergency-alert";

/**
 * Send an emergency alert to a family member. Persists it to the alerts table
 * for history and broadcasts it over Supabase Realtime so the recipient's open
 * app shows a live popup immediately.
 * @param {Object} opts
 * @param {string} opts.recipientId Target family member's user id
 * @param {string} [opts.recipientName] Target member name for display
 * @param {string} [opts.message] Alert text (defaults to emergency message)
 * @returns {Promise<{sent: boolean, mode: "app"}>}
 */
export async function sendEmergencyAlert({ recipientId, recipientName, message }) {
  let senderName = "A family member";
  try {
    const res = await fetch("/api/auth/session");
    const d = await res.json();
    if (d?.user?.user_metadata?.display_name) senderName = d.user.user_metadata.display_name;
    else if (d?.user?.email) senderName = d.user.email.split("@")[0];
  } catch {}

  const text =
    message ||
    `🚨 EMERGENCY ALERT from ${senderName} on Beacon.AI. Check your app immediately!`;

  const payload = {
    recipient_id: recipientId,
    recipient_name: recipientName || null,
    sender_name: senderName,
    message: text,
  };

  try {
    await fetch("/api/profiles/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: recipientId, message: text }),
    });
  } catch {}

  try {
    const supabase = createClient();
    const channel = supabase.channel(CHANNEL);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: EVENT, payload });
        setTimeout(() => supabase.removeChannel(channel), 1500);
      }
    });
  } catch {}

  return { sent: true, mode: "app" };
}
