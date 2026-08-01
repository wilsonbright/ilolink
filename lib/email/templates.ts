// Email bodies. Pure functions returning {subject, html, text} so they are
// unit-testable with no bindings and no network.
//
// Every template ships BOTH a code and a link. The code is what the composer
// flow uses (it keeps the user in the same tab, so an in-progress draft — which
// can be a 15 MB File held in React state — survives). The link is for the
// "sign in on my laptop" and invite-acceptance paths.

export interface EmailBody {
  subject: string;
  html: string;
  text: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Inline styles only — no external stylesheet survives an email client. Colors
// mirror the app's light-mode tokens from app/globals.css.
function shell(heading: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#fafaf8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf8;padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #eae8e1;border-radius:12px;padding:32px">
<tr><td style="font-family:Inter,-apple-system,system-ui,sans-serif;color:#1a1a17">
<h1 style="margin:0 0 16px;font-size:20px;font-weight:620;color:#1a1a17">${esc(heading)}</h1>
${inner}
<p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#8a8a80">If you didn't request this, you can ignore this email — nothing will happen.</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

function codeBlock(code: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#56564f">Enter this code to continue:</p>
<p style="margin:0 0 24px;font-size:32px;font-weight:600;letter-spacing:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#1a1a17">${esc(code)}</p>`;
}

function linkBlock(url: string, label: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#56564f">Or ${esc(label)} in this browser:</p>
<p style="margin:0 0 8px"><a href="${esc(url)}" style="display:inline-block;padding:12px 20px;background:#3b5bdb;color:#ffffff;text-decoration:none;border-radius:9px;font-size:15px;font-weight:560">${esc(label)}</a></p>
<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#8a8a80;word-break:break-all">${esc(url)}</p>`;
}

export function signInEmail(code: string, linkUrl: string, minutes: number): EmailBody {
  return {
    subject: `${code} is your ilolink sign-in code`,
    html: shell(
      "Sign in to ilolink",
      codeBlock(code) + linkBlock(linkUrl, "sign in") +
        `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#8a8a80">This code and link expire in ${minutes} minutes and can each be used once.</p>`,
    ),
    text: [
      "Sign in to ilolink",
      "",
      `Your code: ${code}`,
      "",
      `Or open this link: ${linkUrl}`,
      "",
      `This code and link expire in ${minutes} minutes and can each be used once.`,
      "If you didn't request this, you can ignore this email.",
    ].join("\n"),
  };
}

export function inviteEmail(
  teamspaceName: string,
  inviterEmail: string,
  linkUrl: string,
): EmailBody {
  return {
    subject: `${inviterEmail} invited you to ${teamspaceName} on ilolink`,
    html: shell(
      `Join ${teamspaceName}`,
      `<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#56564f">${esc(inviterEmail)} invited you to collaborate in <strong style="color:#1a1a17">${esc(teamspaceName)}</strong> on ilolink.</p>` +
        linkBlock(linkUrl, "accept the invitation") +
        `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#8a8a80">This invitation expires in 14 days.</p>`,
    ),
    text: [
      `Join ${teamspaceName} on ilolink`,
      "",
      `${inviterEmail} invited you to collaborate in ${teamspaceName}.`,
      "",
      `Accept: ${linkUrl}`,
      "",
      "This invitation expires in 14 days.",
    ].join("\n"),
  };
}
