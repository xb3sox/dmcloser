import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type EmailTemplatePurpose = "verify" | "reset" | "invite" | "delivery_failure";

export interface VerifyTemplateProps {
  url: string;
  recipientName?: string;
}

export interface ResetTemplateProps {
  url: string;
  recipientName?: string;
}

export interface InviteTemplateProps {
  url: string;
  workspaceName?: string;
  recipientName?: string;
}

export interface DeliveryFailureTemplateProps {
  conversationUrl?: string;
  errorMessage: string;
  recipientName?: string;
}

// Shared visual system style constants (Ivory background #fcfbf9, Forest Green header/accent #1b382b, neutral text #1c1c1c)
const layoutStyle: React.CSSProperties = {
  backgroundColor: "#fcfbf9",
  color: "#1c1c1c",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: "40px 20px",
  margin: 0,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e2ded4",
  padding: "32px",
  maxWidth: "560px",
  margin: "0 auto",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)",
};

const logoStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#1b382b",
  marginBottom: "24px",
  letterSpacing: "-0.02em",
};

const headingStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 600,
  color: "#1b382b",
  margin: "0 0 16px 0",
};

const bodyStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#2c2c2c",
  margin: "0 0 24px 0",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#1b382b",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontWeight: 600,
  fontSize: "14px",
  textDecoration: "none",
  margin: "8px 0 24px 0",
};

const footerStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#6e6e6e",
  marginTop: "32px",
  borderTop: "1px solid #f0ede6",
  paddingTop: "16px",
};

export const VerifyEmailTemplate: React.FC<VerifyTemplateProps> = ({ url, recipientName }) => (
  <div style={layoutStyle}>
    <div style={cardStyle}>
      <div style={logoStyle}>DMCloser</div>
      <h1 style={headingStyle}>Verify your email</h1>
      <p style={bodyStyle}>
        Hello{recipientName ? ` ${recipientName}` : ""},
      </p>
      <p style={bodyStyle}>
        Please verify your email address to complete your account setup and access DMCloser.
      </p>
      <a href={url} style={buttonStyle}>
        Verify Email Address
      </a>
      <p style={bodyStyle}>
        Or copy and paste this single-use URL into your browser (expires in one hour):<br />
        <span style={{ wordBreak: "break-all", fontSize: "13px", color: "#1b382b" }}>{url}</span>
      </p>
      <div style={footerStyle}>
        If you did not request this email, you can safely ignore it.
      </div>
    </div>
  </div>
);

export const ResetPasswordTemplate: React.FC<ResetTemplateProps> = ({ url, recipientName }) => (
  <div style={layoutStyle}>
    <div style={cardStyle}>
      <div style={logoStyle}>DMCloser</div>
      <h1 style={headingStyle}>Reset your password</h1>
      <p style={bodyStyle}>
        Hello{recipientName ? ` ${recipientName}` : ""},
      </p>
      <p style={bodyStyle}>
        We received a request to reset your DMCloser account password.
      </p>
      <a href={url} style={buttonStyle}>
        Reset Password
      </a>
      <p style={bodyStyle}>
        Or copy and paste this link into your browser (expires in one hour):<br />
        <span style={{ wordBreak: "break-all", fontSize: "13px", color: "#1b382b" }}>{url}</span>
      </p>
      <div style={footerStyle}>
        If you did not request a password reset, ignore this email.
      </div>
    </div>
  </div>
);

export const InviteTemplate: React.FC<InviteTemplateProps> = ({ url, workspaceName, recipientName }) => (
  <div style={layoutStyle}>
    <div style={cardStyle}>
      <div style={logoStyle}>DMCloser</div>
      <h1 style={headingStyle}>You&apos;ve been invited</h1>
      <p style={bodyStyle}>
        Hello{recipientName ? ` ${recipientName}` : ""},
      </p>
      <p style={bodyStyle}>
        You have been invited to join{workspaceName ? ` ${workspaceName}` : " a workspace"} on DMCloser.
      </p>
      <a href={url} style={buttonStyle}>
        Accept Invitation
      </a>
      <p style={bodyStyle}>
        Or copy and paste this link into your browser (expires in 48 hours):<br />
        <span style={{ wordBreak: "break-all", fontSize: "13px", color: "#1b382b" }}>{url}</span>
      </p>
      <div style={footerStyle}>
        DMCloser AI Sales Inbox for Instagram &amp; WhatsApp.
      </div>
    </div>
  </div>
);

export const DeliveryFailureTemplate: React.FC<DeliveryFailureTemplateProps> = ({
  conversationUrl,
  errorMessage,
  recipientName,
}) => (
  <div style={layoutStyle}>
    <div style={cardStyle}>
      <div style={logoStyle}>DMCloser</div>
      <h1 style={{ ...headingStyle, color: "#991b1b" }}>Message delivery failure</h1>
      <p style={bodyStyle}>
        Hello{recipientName ? ` ${recipientName}` : ""},
      </p>
      <p style={bodyStyle}>
        An outbound message encountered a non-transient delivery failure or requires review:
      </p>
      <div
        style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "6px",
          padding: "16px",
          color: "#991b1b",
          fontSize: "14px",
          marginBottom: "20px",
          fontFamily: "monospace",
        }}
      >
        {errorMessage}
      </div>
      {conversationUrl && (
        <a href={conversationUrl} style={buttonStyle}>
          View in Inbox
        </a>
      )}
      <div style={footerStyle}>
        Please review your activity feed and conversation details in DMCloser.
      </div>
    </div>
  </div>
);

export function renderEmail(
  purpose: "verify" | "reset",
  props: VerifyTemplateProps | ResetTemplateProps,
): { subject: string; html: string; text: string };
export function renderEmail(
  purpose: "invite",
  props: InviteTemplateProps,
): { subject: string; html: string; text: string };
export function renderEmail(
  purpose: "delivery_failure",
  props: DeliveryFailureTemplateProps,
): { subject: string; html: string; text: string };
export function renderEmail(
  purpose: EmailTemplatePurpose,
  props: any,
): { subject: string; html: string; text: string } {
  let subject = "";
  let element: React.ReactElement = <></>;
  let text = "";

  switch (purpose) {
    case "verify": {
      const p = props as VerifyTemplateProps;
      subject = "Verify your DMCloser email";
      element = <VerifyEmailTemplate {...p} />;
      text = `Verify your email using this single-use link (expires in one hour):\n${p.url}\n\nIf you did not request this, ignore this email.`;
      break;
    }
    case "reset": {
      const p = props as ResetTemplateProps;
      subject = "Reset your DMCloser password";
      element = <ResetPasswordTemplate {...p} />;
      text = `Reset your password using this single-use link (expires in one hour):\n${p.url}\n\nIf you did not request this, ignore this email.`;
      break;
    }
    case "invite": {
      const p = props as InviteTemplateProps;
      subject = "Your DMCloser workspace invitation";
      element = <InviteTemplate {...p} />;
      text = `Sign in and accept your invitation:\n${p.url}\n\nThis link expires in 48 hours.`;
      break;
    }
    case "delivery_failure": {
      const p = props as DeliveryFailureTemplateProps;
      subject = "Action required: DMCloser email delivery failure";
      element = <DeliveryFailureTemplate {...p} />;
      text = `An outbound email message failed to deliver:\n${p.errorMessage}${p.conversationUrl ? `\n\nReview: ${p.conversationUrl}` : ""}`;
      break;
    }
    default:
      throw new Error(`Unknown email template purpose: ${purpose}`);
  }

  const html = `<!DOCTYPE html>${renderToStaticMarkup(element)}`;
  return { subject, html, text };
}
