import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";

export type MailTemplateInput = {
  purpose: string;
  link?: string;
};

const copy: Record<
  string,
  { title: string; body: string; action?: string }
> = {
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

const fallback = {
  title: "DMCloser",
  body: "Open DMCloser to continue.",
};

export function MailTemplate({ purpose, link }: MailTemplateInput) {
  const content = copy[purpose] ?? fallback;
  return (
    <Html>
      <Head />
      <Preview>{content.title}</Preview>
      <Body
        style={{
          backgroundColor: "#f7f4ec",
          color: "#1c2a22",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#fffdf7",
            border: "1px solid #d9d2c2",
            borderRadius: "14px",
            margin: "0 auto",
            maxWidth: "520px",
            padding: "32px",
          }}
        >
          <Heading style={{ fontSize: "22px", margin: "0 0 16px" }}>
            {content.title}
          </Heading>
          <Text style={{ fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" }}>
            {content.body}
          </Text>
          {content.action && link ? (
            <Button
              href={link}
              style={{
                backgroundColor: "#1f4d3a",
                borderRadius: "10px",
                color: "#fffdf7",
                display: "inline-block",
                fontSize: "15px",
                padding: "12px 20px",
                textDecoration: "none",
              }}
            >
              {content.action}
            </Button>
          ) : null}
          <Hr style={{ borderColor: "#e7e0d1", margin: "28px 0 16px" }} />
          <Text style={{ color: "#6b6558", fontSize: "12px", margin: 0 }}>
            If you did not request this email, ignore it. DMCloser never asks for
            your password by email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderMail(input: MailTemplateInput) {
  const content = copy[input.purpose] ?? fallback;
  const html = await render(<MailTemplate {...input} />);
  const text = [
    content.title,
    "",
    content.body,
    input.link ? `${content.action ?? "Open"}: ${input.link}` : "",
    "",
    "If you did not request this email, ignore it. DMCloser never asks for your password by email.",
  ]
    .filter(Boolean)
    .join("\n");
  return { html, text };
}
