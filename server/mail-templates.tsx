import * as React from "react";
import { Body, Button, Container, Heading, Html, Text } from "@react-email/components";
import { render } from "@react-email/render";

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

export function MailTemplate({ purpose, link }: MailTemplateInput) {
  const content = copy[purpose] ?? { title: "DMCloser", body: "Open DMCloser to continue." };
  return (
    <Html>
      <Body style={{ backgroundColor: "#f7f4ec", color: "#1c2a22", padding: "24px" }}>
        <Container style={{ backgroundColor: "#fffdf7", padding: "24px" }}>
          <Heading>{content.title}</Heading>
          <Text>{content.body}</Text>
          {content.action && link ? (
            <Button href={link} style={{ backgroundColor: "#1f4d3a", color: "#fffdf7" }}>
              {content.action}
            </Button>
          ) : null}
          <Text style={{ color: "#6b6558", fontSize: "12px" }}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderMail(input: MailTemplateInput) {
  const content = copy[input.purpose] ?? { title: "DMCloser", body: "Open DMCloser to continue." };
  const html = await render(<MailTemplate {...input} />);
  const text = [
    content.title,
    content.body,
    input.link ? `${content.action ?? "Open"}: ${input.link}` : "",
    footer,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { html, text };
}
