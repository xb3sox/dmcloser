export type MailTemplateInput = { purpose: string; link?: string };

const copy: Record<string, { title: string; body: string; action?: string }> = {
  verify: {
    title: "Verify your DMCloser email",
    body: "Confirm this address to finish setting up your workspace.",
    action: "Verify email",
  },
  reset: {
    title: "Reset your DMCloser password",
    body: "Use this single-use link to choose a new password. It expires in one hour.",
    action: "Choose a new password",
  },
  invite: {
    title: "Join a DMCloser workspace",
    body: "Sign in with the invited address and accept the invitation. The link expires in 48 hours.",
    action: "Accept invitation",
  },
  "delivery-failure": {
    title: "A message could not be delivered",
    body: "Review the conversation in Activity before retrying. An ambiguous provider outcome is never resent automatically.",
  },
};

const footer =
  "If you did not request this email, ignore it. DMCloser never asks for your password by email.";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function safeActionUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password)
      return url.href;
  } catch {
    // A malformed configured URL must not become an active email link.
  }
  return undefined;
}

export async function renderMail(input: MailTemplateInput) {
  const content = copy[input.purpose] ?? { title: "DMCloser", body: "Open DMCloser to continue." };
  const actionUrl = safeActionUrl(input.link);
  const title = escapeHtml(content.title);
  const body = escapeHtml(content.body);
  const action = content.action ? escapeHtml(content.action) : "Open";
  const href = actionUrl ? escapeHtml(actionUrl) : undefined;
  const html = [
    "<!doctype html>",
    '<html><head><meta charset="utf-8"></head>',
    '<body style="margin:0;background-color:#f7f4ec;color:#1c2a22;padding:24px;font-family:Arial,sans-serif">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#fffdf7"><tr><td style="padding:24px">',
    `<h1 style="font-size:24px;line-height:1.3;margin:0 0 16px">${title}</h1>`,
    `<p style="font-size:16px;line-height:1.5;margin:0 0 20px">${body}</p>`,
    href
      ? `<p style="margin:0 0 24px"><a href="${href}" style="display:inline-block;background-color:#1f4d3a;color:#fffdf7;padding:12px 18px;text-decoration:none;border-radius:4px">${action}</a></p>`
      : "",
    `<p style="color:#6b6558;font-size:12px;line-height:1.5;margin:0">${escapeHtml(footer)}</p>`,
    "</td></tr></table></td></tr></table></body></html>",
  ].join("");
  const text = [
    content.title,
    content.body,
    actionUrl ? `${content.action ?? "Open"}: ${actionUrl}` : "",
    footer,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { html, text };
}
