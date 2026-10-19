import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  LogOut,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DialogShell } from "../ui/Dialog";
import { InstagramIcon, WhatsAppIcon } from "../landing/Brand";
import type { Platform } from "@/types";

export default function AccountSettings() {
  const { live } = useApp();
  const [connection, setConnection] = useState<Platform | null>(null);
  const [phoneId, setPhoneId] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [operations, setOperations] = useState<{
    jobs: {
      id: string;
      kind: string;
      state: string;
      attempts: number;
      error: string;
    }[];
    latency: { count: number; p95_ms: number | null };
    targetP95Ms: number;
  } | null>(null);
  const [workspaces, setWorkspaces] = useState<
    { id: string; name: string; role: string }[] | null
  >(null);
  const [billingInterval, setBillingInterval] = useState("monthly");
  if (!live) return null;
  const { snapshot, request, refresh } = live;
  const owner = snapshot.user.role === "owner";

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section
        className="settings-section"
        aria-labelledby="live-account-heading"
      >
        <div className="settings-section-intro">
          <h2 id="live-account-heading">Messaging accounts</h2>
          <p>
            Connect your approved business account. Messages appear here as soon
            as your webhook is active.
          </p>
        </div>
        {!snapshot.user.verified && (
          <p className="app-field-help">
            Email not verified.
            {snapshot.capabilities.email && (
              <button
                className="app-text-button"
                disabled={pending}
                onClick={() => {
                  void run(async () => {
                    await request("/auth/verify-email", {
                      method: "POST",
                      body: {},
                    });
                    setNotice("Verification email sent. Check your inbox.");
                  });
                }}
              >
                Send verification email
                <ArrowRight size={13} />
              </button>
            )}
          </p>
        )}
        <div className="account-connections">
          {(["instagram", "whatsapp"] as const).map((platform) => {
            const connected = snapshot.connections.find(
              (item) => item.platform === platform,
            );
            return (
              <div className="account-row" key={platform}>
                <span className="account-icon">
                  {platform === "instagram" ? (
                    <InstagramIcon />
                  ) : (
                    <WhatsAppIcon />
                  )}
                </span>
                <div>
                  <strong>
                    {platform === "instagram" ? "Instagram" : "WhatsApp"}
                  </strong>
                  <span>
                    {connected
                      ? `${connected.label} · ${connected.status}`
                      : snapshot.capabilities[platform]
                        ? "Ready to connect"
                        : "Server configuration required"}
                  </span>
                  {connected?.error && (
                    <p className="workspace-inline-error">{connected.error}</p>
                  )}
                </div>
                <button
                  className="app-text-button"
                  disabled={!owner || pending}
                  onClick={() => {
                    setConnection(platform);
                    setToken("");
                    setError("");
                  }}
                >
                  {connected ? "Manage" : "Connect"}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <p className="app-field-help">
          Free-form replies are limited to 24 hours after the latest customer
          message. Automatic replies never bypass Meta's service window.
        </p>
      </section>

      <section className="settings-section" aria-labelledby="usage-heading">
        <div className="settings-section-intro">
          <h2 id="usage-heading">Plan & usage</h2>
          <p>
            {snapshot.workspace.plan === "trial"
              ? `Your trial ends ${new Date(snapshot.workspace.trialUntil).toLocaleDateString()}.`
              : `${snapshot.workspace.plan === "growth" ? "Growth" : "Starter"} plan · ${snapshot.workspace.billingStatus}`}
          </p>
        </div>
        <dl className="workspace-usage">
          <div>
            <dt>AI requests this month</dt>
            <dd>
              {snapshot.usage.aiReplies.toLocaleString()} /{" "}
              {snapshot.workspace.aiLimit.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt>New conversations</dt>
            <dd>
              {snapshot.usage.conversations.toLocaleString()} /{" "}
              {snapshot.workspace.conversationLimit.toLocaleString()}
            </dd>
          </div>
        </dl>
        {!snapshot.workspace.active && (
          <p className="workspace-inline-error">
            Automation is paused until your subscription is active. Your inbox
            and export remain available.
          </p>
        )}
        {owner && (
          <>
            <label
              className="workspace-billing-frequency"
              htmlFor="billing-frequency"
            >
              Billing frequency
              <select
                id="billing-frequency"
                value={billingInterval}
                onChange={(event) => setBillingInterval(event.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <div className="workspace-billing-actions">
              <button
                className="app-small-button"
                disabled={pending || !snapshot.capabilities.billing}
                onClick={() => {
                  void run(async () => {
                    const value = await request<{ url: string }>(
                      "/billing/checkout",
                      {
                        method: "POST",
                        body: { plan: "starter", interval: billingInterval },
                        key: crypto.randomUUID(),
                      },
                    );
                    window.location.assign(value.url);
                  });
                }}
              >
                Choose Starter
                <ArrowUpRight size={14} />
              </button>
              <button
                className="app-text-button"
                disabled={pending || !snapshot.capabilities.billing}
                onClick={() => {
                  void run(async () => {
                    const value = await request<{ url: string }>(
                      "/billing/checkout",
                      {
                        method: "POST",
                        body: { plan: "growth", interval: billingInterval },
                        key: crypto.randomUUID(),
                      },
                    );
                    window.location.assign(value.url);
                  });
                }}
              >
                Choose Growth
                <ArrowUpRight size={14} />
              </button>
              <button
                className="app-text-button"
                disabled={pending || !snapshot.capabilities.billing}
                onClick={() => {
                  void run(async () => {
                    const value = await request<{ url: string }>(
                      "/billing/portal",
                      { method: "POST", body: {} },
                    );
                    window.location.assign(value.url);
                  });
                }}
              >
                Manage billing
                <ArrowUpRight size={14} />
              </button>
            </div>
          </>
        )}
        {!snapshot.capabilities.billing && (
          <p className="app-field-help">
            Payments are not configured by the service owner. No payment will be
            collected here.
          </p>
        )}
      </section>

      <section className="settings-section" aria-labelledby="team-heading">
        <div className="settings-section-intro">
          <h2 id="team-heading">Your team</h2>
          <p>
            {snapshot.members.length} of{" "}
            {snapshot.workspace.plan === "growth" ? 5 : 2} seats. Only the owner
            can change billing, integrations, or workspace policy.
          </p>
        </div>
        <ul className="workspace-team">
          {snapshot.members.map((member) => (
            <li key={member.id}>
              <div>
                <strong>{member.name}</strong>
                <span>
                  {member.email} · {member.role}
                </span>
              </div>
              {owner && member.role !== "owner" && (
                <button
                  className="app-icon-button"
                  aria-label={`Remove ${member.name}`}
                  disabled={pending}
                  onClick={() => {
                    void run(async () => {
                      await request(`/team/${member.id}`, {
                        method: "DELETE",
                        body: {},
                      });
                      setNotice("Team member removed.");
                    });
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {owner && (
          <form
            className="workspace-invite-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const value = await request<{ url: string; emailed: boolean }>(
                  "/team/invites",
                  { method: "POST", body: { email: inviteEmail } },
                );
                setInviteLink(value.url);
                setNotice(
                  value.emailed
                    ? "Invitation email sent."
                    : "Email is not configured. Share this private invitation link directly.",
                );
                setInviteEmail("");
              });
            }}
          >
            <label htmlFor="team-email">
              Invite by email
              <input
                type="email"
                id="team-email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
            </label>
            <button className="app-small-button" disabled={pending}>
              Create invitation
              <ArrowRight size={13} />
            </button>
          </form>
        )}
        {inviteLink && (
          <label className="workspace-invite-link">
            Private invite link
            <input
              readOnly
              value={inviteLink}
              onFocus={(event) => event.target.select()}
            />
            <span>
              Expires in 48 hours. The recipient must sign in with the invited
              email.
            </span>
          </label>
        )}
      </section>

      {owner && (
        <section
          className="settings-section"
          aria-labelledby="operations-heading"
        >
          <div className="settings-section-intro">
            <h2 id="operations-heading">Activity & reliability</h2>
            <p>
              Review failures before retrying. Provider timeouts are never
              blindly resent.
            </p>
          </div>
          <button
            className="app-text-button"
            disabled={pending}
            onClick={() => {
              void run(async () => {
                setOperations(await request("/operations"));
              });
            }}
          >
            <RefreshCw size={14} />
            Check background work
          </button>
          {operations && (
            <div className="workspace-operations">
              <p>
                {operations.latency.count
                  ? `AI p95: ${Math.round(operations.latency.p95_ms || 0)}ms across ${operations.latency.count} replies in the last 24 hours.`
                  : "No AI latency samples yet."}{" "}
                Target: under two seconds, not a guaranteed result.
              </p>
              {operations.jobs.length ? (
                operations.jobs.map((job) => (
                  <div key={job.id}>
                    <span>
                      <strong>{job.kind}</strong> · {job.state} · attempt{" "}
                      {job.attempts}
                    </span>
                    <p>{job.error}</p>
                    {job.state === "dead" && job.kind !== "deliver" && (
                      <button
                        className="app-text-button"
                        disabled={pending}
                        onClick={() => {
                          void run(async () => {
                            await request(
                              `/operations/${encodeURIComponent(job.id)}/retry`,
                              { method: "POST", body: {} },
                            );
                            setNotice("Retry scheduled.");
                            setOperations(null);
                          });
                        }}
                      >
                        Retry safely
                        <RefreshCw size={13} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>No pending or failed jobs.</p>
              )}
            </div>
          )}
          <details className="workspace-audit">
            <summary>Recent workspace activity</summary>
            <ul>
              {snapshot.audit.map((event, index) => (
                <li key={`${event.created_at}-${index}`}>
                  <span>{event.action.replace(/\./g, " ")}</span>
                  <time>{new Date(event.created_at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <section
        className="settings-section"
        aria-labelledby="account-security-heading"
      >
        <div className="settings-section-intro">
          <h2 id="account-security-heading">Account & data</h2>
          <p>
            Signed in as {snapshot.user.email}. Your workspace is stored on the
            server, not in browser local storage.
          </p>
        </div>
        <button
          className="app-text-button"
          onClick={() => {
            void run(async () => {
              setWorkspaces(await request("/workspaces"));
            });
          }}
        >
          Switch workspace
          <ArrowRight size={13} />
        </button>
        {workspaces && (
          <div className="workspace-switch-list">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className="app-text-button"
                disabled={pending || workspace.id === snapshot.workspace.id}
                onClick={() => {
                  void run(async () => {
                    await request("/workspaces/switch", {
                      method: "POST",
                      body: { workspaceId: workspace.id },
                    });
                    window.location.assign("/workspace");
                  });
                }}
              >
                {workspace.name} · {workspace.role}
                {workspace.id === snapshot.workspace.id ? (
                  <Check size={13} />
                ) : (
                  <ArrowRight size={13} />
                )}
              </button>
            ))}
          </div>
        )}
        <details className="workspace-password">
          <summary>Change password</summary>
          <form
            className="business-settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await request("/auth/password", {
                  method: "POST",
                  body: { currentPassword, password: newPassword },
                });
                setCurrentPassword("");
                setNewPassword("");
                setNotice("Password updated. Other sessions were signed out.");
              });
            }}
          >
            <label htmlFor="current-password">
              Current password
              <input
                type="password"
                id="current-password"
                autoComplete="current-password"
                maxLength={128}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
            <label htmlFor="new-password">
              New password
              <input
                type="password"
                id="new-password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
            <button className="app-small-button" disabled={pending}>
              Update password
              <Check size={14} />
            </button>
          </form>
        </details>
        <div className="workspace-data-actions">
          {owner && (
            <button
              className="app-text-button"
              disabled={pending}
              onClick={() => {
                void run(async () => {
                  const data = await request("/workspace/export");
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "dmcloser-workspace.json";
                  link.click();
                  URL.revokeObjectURL(url);
                  setNotice("Workspace export downloaded.");
                });
              }}
            >
              <Download size={14} />
              Export workspace
            </button>
          )}
          <button
            className="app-text-button"
            disabled={pending}
            onClick={() => {
              void run(async () => {
                await live.logout();
              });
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
          {owner && (
            <button
              className="app-text-button workspace-danger"
              onClick={() => {
                setDeleting(true);
                setPassword("");
                setConfirmed(false);
              }}
            >
              <Trash2 size={14} />
              Delete workspace
            </button>
          )}
        </div>
      </section>
      {(notice || error) && (
        <div
          className={`workspace-settings-feedback ${error ? "is-error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </div>
      )}

      {connection && (
        <DialogShell
          title={`Connect ${connection === "instagram" ? "Instagram" : "WhatsApp"}`}
          onClose={() => {
            setConnection(null);
            setToken("");
            setError("");
          }}
        >
          <div className="legal-copy">
            <p>
              {snapshot.capabilities[connection]
                ? connection === "instagram"
                  ? "Instagram will ask you to approve messaging access. Your account must be professional, and the service owner needs approved Meta permissions."
                  : "Use the phone number ID and a system-user token from your Meta Business account. The token is encrypted on the server and is never returned to this browser."
                : `The service owner must configure ${connection === "instagram" ? "Instagram Business Login and webhook credentials" : "the Meta app secret and webhook verification token"} before this account can connect.`}
            </p>
            {connection === "instagram" ? (
              <button
                className="closer-button closer-button-primary"
                disabled={pending || !snapshot.capabilities.instagram}
                onClick={() => {
                  void run(async () => {
                    const value = await request<{ url: string }>(
                      "/integrations/instagram/start",
                      { method: "POST", body: {} },
                    );
                    window.location.assign(value.url);
                  });
                }}
              >
                Continue with Instagram
                <ArrowUpRight size={15} />
              </button>
            ) : (
              <form
                className="setup-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    await request("/integrations/whatsapp", {
                      method: "POST",
                      body: { phoneNumberId: phoneId, accessToken: token },
                    });
                    setToken("");
                    setConnection(null);
                    setNotice(
                      "WhatsApp credentials verified and connected. Configure the webhook subscription in Meta before sending a test message.",
                    );
                  });
                }}
              >
                <label htmlFor="wa-phone-id">
                  Phone number ID
                  <input
                    id="wa-phone-id"
                    value={phoneId}
                    onChange={(event) => setPhoneId(event.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]{5,30}"
                    required
                  />
                </label>
                <label htmlFor="wa-access-token">
                  System-user access token
                  <input
                    id="wa-access-token"
                    type="password"
                    autoComplete="off"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    minLength={20}
                    maxLength={4096}
                    required
                  />
                </label>
                <button
                  className="closer-button closer-button-primary"
                  disabled={pending || !snapshot.capabilities.whatsapp}
                >
                  Verify & connect
                  <Check size={15} />
                </button>
              </form>
            )}
            {snapshot.connections.some(
              (item) => item.platform === connection,
            ) && (
              <button
                className="app-text-button workspace-danger"
                disabled={pending}
                onClick={() => {
                  void run(async () => {
                    await request(`/integrations/${connection}`, {
                      method: "DELETE",
                      body: {},
                    });
                    setToken("");
                    setConnection(null);
                    setNotice(
                      "Account disconnected. Automatic sends for this channel are disabled.",
                    );
                  });
                }}
              >
                Disconnect account
              </button>
            )}
            {error && (
              <p className="workspace-form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </DialogShell>
      )}
      {deleting && (
        <DialogShell
          title="Delete this workspace?"
          onClose={() => setDeleting(false)}
        >
          <div className="legal-copy">
            <p>
              All conversations, lead memory, drafts, connections, and team
              access in this workspace will be permanently deleted. Any active
              subscription will be cancelled first.
            </p>
            <form
              className="setup-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  await request("/workspace", {
                    method: "DELETE",
                    body: { password },
                  });
                  window.location.assign("/");
                });
              }}
            >
              <label htmlFor="delete-password">
                Confirm your password
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <label className="workspace-delete-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  required
                />
                I understand this cannot be undone.
              </label>
              <button
                className="closer-button closer-button-primary"
                disabled={pending || !confirmed}
              >
                Permanently delete workspace
                <Trash2 size={14} />
              </button>
            </form>
            {error && (
              <p className="workspace-form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </DialogShell>
      )}
    </>
  );
}

export function WorkspaceNotices() {
  const { live } = useApp();
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const params = new URLSearchParams(window.location.search);
  useEffect(() => {
    const result = params.get("connection");
    if (result)
      setNotice(
        result === "connected"
          ? "Messaging account connected."
          : result === "cancelled"
            ? "Account connection was cancelled."
            : "Connection could not be completed. Review account permissions and try again.",
      );
    if (params.get("billing"))
      setNotice(
        params.get("billing") === "processing"
          ? "Checkout returned. Your plan changes only after the verified billing webhook arrives."
          : "Checkout cancelled. No plan change was made.",
      );
  }, []);
  if (!live) return null;
  const invitation = params.get("invite");
  const verification = params.get("verify");
  return (
    <>
      {(invitation || verification) && (
        <div className="workspace-banner">
          <span>
            {invitation
              ? "You have a workspace invitation. Accepting switches this session to the invited workspace."
              : "Confirm the email for this account."}
          </span>
          <button
            className="app-text-button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await live.request(
                  invitation ? "/team/accept" : "/auth/verify",
                  {
                    method: "POST",
                    body: { token: invitation || verification },
                  },
                );
                window.history.replaceState({}, "", "/workspace");
                window.location.reload();
              } catch (error) {
                setNotice(
                  error instanceof Error ? error.message : "Please try again.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {invitation ? "Accept invitation" : "Verify email"}
            <ArrowRight size={13} />
          </button>
        </div>
      )}
      {(notice || live.error || live.connectionState === "reconnecting") && (
        <div
          className={`workspace-banner ${live.error ? "is-error" : ""}`}
          role={live.error ? "alert" : "status"}
        >
          <span>
            {live.error ||
              notice ||
              "Reconnecting to live updates. Your draft is preserved."}
          </span>
          <button
            className="app-text-button"
            onClick={() => {
              setNotice("");
              live.clearError();
              void live.refresh();
            }}
          >
            Refresh
            <RefreshCw size={13} />
          </button>
        </div>
      )}
    </>
  );
}
