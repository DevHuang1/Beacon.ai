/**
 * Send an emergency alert to a family member. Persists it to the alerts table.
 * The recipient's app picks it up via the EmergencyAlertListener polling
 * endpoint and shows a live popup.
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

  const res = await fetch("/api/profiles/alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: recipientId, message: text }),
  });
  const d = await res.json();

  if (!res.ok || d?.success === false) {
    if (d?.code === "TABLE_MISSING") {
      throw new Error("Alerts table not set up — run scripts/setup-profiles.sql.");
    }
    throw new Error(d?.error || "Could not send alert");
  }

  return { sent: true, mode: "app" };
}
