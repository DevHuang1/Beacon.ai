const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function headerRow() {
  return `
  <tr>
    <td align="center" style="padding-bottom:28px;">
      <span style="font-family:${FONT}; font-weight:700; font-size:13px; letter-spacing:5px; color:#0D9488;">BEACON&#183;AI</span>
    </td>
  </tr>`;
}

function baseShell({ head, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${head}</title>
</head>
<body style="margin:0; padding:0; background-color:#F4F7FB; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7FB; padding:64px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%;">
          ${headerRow()}
          <tr>
            <td style="background-color:#FFFFFF; border-radius:12px; border:1px solid #E9EEF4; box-shadow:0 4px 20px rgba(15,23,42,0.05);">
              ${body}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:28px;">
              <span style="font-family:${FONT}; font-size:11px; color:#A5B0BF; letter-spacing:0.3px; line-height:1.8;">
                Beacon.AI &middot; Family emergency readiness<br>
                Sent automatically by Beacon.AI
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Professional emergency alert email. Red used sparingly for gravity.
 */
export function emergencyAlertHtml({ senderName, message, appUrl }) {
  const body = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background-color:#DC2626; padding:40px 48px;">
        <div style="font-family:${FONT}; font-weight:600; font-size:12px; letter-spacing:3px; color:#FED7D7;">EMERGENCY ALERT</div>
        <div style="font-family:${FONT}; font-weight:600; font-size:19px; color:#FFFFFF; margin-top:8px;">${senderName} has requested help</div>
      </td>
    </tr>
    <tr>
      <td style="padding:44px 48px 12px;">
        <div style="font-family:${FONT}; font-size:11px; letter-spacing:2px; color:#A5B0BF; text-transform:uppercase; margin-bottom:16px;">Message</div>
        <div style="font-family:${FONT}; font-size:15px; color:#0F172A; line-height:1.8; white-space:pre-line;">
          ${message}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:34px 48px 44px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" width="50%" style="padding-right:6px;">
              <a href="${appUrl}" style="display:block; background-color:#DC2626; color:#FFFFFF; text-decoration:none; font-family:${FONT}; font-weight:600; font-size:13px; letter-spacing:0.5px; padding:14px 0; border-radius:8px; text-align:center;">OPEN APP</a>
            </td>
            <td align="center" width="50%" style="padding-left:6px;">
              <a href="${appUrl}" style="display:block; background-color:#FFFFFF; color:#DC2626; text-decoration:none; font-family:${FONT}; font-weight:600; font-size:13px; letter-spacing:0.5px; padding:13px 0; border-radius:8px; border:1px solid #DC2626; text-align:center;">I&#8217;M SAFE</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return baseShell({ head: `Emergency alert from ${senderName}`, body });
}

/**
 * Minimal welcome / demo email.
 */
export function demoEmailHtml({ name }) {
  const body = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:52px 48px 10px;">
        <div style="font-family:${FONT}; font-weight:600; font-size:18px; color:#0F172A;">Hello, ${name}</div>
        <div style="font-family:${FONT}; font-size:14px; color:#64748B; line-height:1.8; margin-top:16px;">
          Beacon.AI is your family&#8217;s emergency channel. When someone sends an alert, you&#8217;ll receive an email like this and an instant notification in the app.
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:30px 48px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="border-top:1px solid #EEF2F7; padding:20px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-family:${FONT}; font-size:12px; color:#64748B; line-height:1.7; padding-right:18px;">
                    <strong style="color:#0F172A;">Live alerts</strong><br>
                    Emergency messages reach you instantly.
                  </td>
                  <td style="font-family:${FONT}; font-size:12px; color:#64748B; line-height:1.7;">
                    <strong style="color:#0F172A;">One-tap check-in</strong><br>
                    Confirm you&#8217;re safe in seconds.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:30px 48px 52px;">
        <a href="#" style="display:block; background-color:#0D9488; color:#FFFFFF; text-decoration:none; font-family:${FONT}; font-weight:600; font-size:13px; letter-spacing:0.5px; padding:14px 0; border-radius:8px; text-align:center;">OPEN BEACON&#183;AI</a>
      </td>
    </tr>
  </table>`;

  return baseShell({ head: "Welcome to Beacon.AI", body });
}

export default { emergencyAlertHtml, demoEmailHtml };
