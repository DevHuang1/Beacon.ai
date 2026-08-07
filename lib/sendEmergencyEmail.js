import { Resend } from "resend";
import { emergencyAlertHtml } from "./emailTemplates.js";

/**
 * Send an emergency alert email to a family member via Resend.
 * Fire-and-forget: failures are swallowed so the alert itself still succeeds.
 * @param {Object} opts
 * @param {string} opts.to Recipient email address
 * @param {string} opts.recipientName Recipient display name
 * @param {string} opts.senderName Sender display name
 * @param {string} opts.message Alert message
 * @param {string} [opts.from] Verified sender address (defaults to env)
 */
export async function sendEmergencyEmail({ to, recipientName, senderName, message, from }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[sendEmergencyEmail] RESEND_API_KEY not set — skipping email.");
    return { sent: false, reason: "no_key" };
  }
  if (!to) {
    return { sent: false, reason: "no_recipient_email" };
  }

  const resend = new Resend(apiKey);
  const fromAddr =
    from || process.env.RESEND_FROM || "Beacon.AI Emergency <emergency@yourdomain.com>";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://beaconai-production.up.railway.app";

  const subject = `🚨 EMERGENCY ALERT from ${senderName}`;
  const text =
    message ||
    `🚨 EMERGENCY ALERT from ${senderName} on Beacon.AI.\n\nCheck your app immediately!`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddr,
      to: [to],
      subject,
      text,
      html: emergencyAlertHtml({
        senderName,
        message,
        appUrl,
      }),
    });
    if (error) {
      console.warn("[sendEmergencyEmail] Resend error:", error);
      const reason = /verif|unauthorized|domain|spf|dkim/i.test(JSON.stringify(error))
        ? "sender_not_verified"
        : "resend_error";
      return { sent: false, reason, error };
    }
    return { sent: true, data };
  } catch (err) {
    console.warn("[sendEmergencyEmail] Failed:", err.message);
    return { sent: false, reason: "exception", error: err.message };
  }
}
