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
// mirror the app's light-mode tokens from app/globals.css (Modernist: emails
// are fixed-light, square corners, one red, extrabold headings; the soft/faint
// mixes are precomposited to hex since email clients know no color-mix). The
// font stack names Archivo but no client will have it — system sans carries
// the weightwork, same as every product email.
function shell(heading: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f2f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2f2;padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#f3f2f2;border:2px solid #9f9d9d;padding:32px">
<tr><td style="font-family:Archivo,-apple-system,system-ui,sans-serif;color:#201e1d">
<h1 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:-0.015em;color:#201e1d">${esc(heading)}</h1>
${inner}
<p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#6a6868">If you didn't request this, you can ignore this email — nothing will happen.</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

function codeBlock(code: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#4e4d4c">Enter this code to continue:</p>
<p style="margin:0 0 24px;font-size:32px;font-weight:600;letter-spacing:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#201e1d">${esc(code)}</p>`;
}

function linkBlock(url: string, label: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4e4d4c">Or ${esc(label)} in this browser:</p>
<p style="margin:0 0 8px"><a href="${esc(url)}" style="display:inline-block;padding:12px 20px;background:#ec3013;color:#f3f2f2;text-decoration:none;font-size:15px;font-weight:800">${esc(label)}</a></p>
<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#6a6868;word-break:break-all">${esc(url)}</p>`;
}

export function signInEmail(code: string, linkUrl: string, minutes: number): EmailBody {
  return {
    subject: `${code} is your ilolink sign-in code`,
    html: shell(
      "Sign in to ilolink",
      codeBlock(code) + linkBlock(linkUrl, "sign in") +
        `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6a6868">This code and link expire in ${minutes} minutes and can each be used once.</p>`,
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
      `<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#4e4d4c">${esc(inviterEmail)} invited you to collaborate in <strong style="color:#201e1d">${esc(teamspaceName)}</strong> on ilolink.</p>` +
        linkBlock(linkUrl, "accept the invitation") +
        `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6a6868">This invitation expires in 14 days.</p>`,
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
