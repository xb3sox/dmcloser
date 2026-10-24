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
import { useLocale, useStrings } from "@/context/LocaleContext";
import { workspaceStrings } from "@/i18n/surfaces/workspace";
import { DialogShell } from "../ui/Dialog";
import { InstagramIcon, WhatsAppIcon } from "../landing/Brand";
import type { Platform } from "@/types";

export default function AccountSettings() {
  const { live } = useApp();
  const [connection, setConnection] = useState<Platform | null>(null);
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
  const t = useStrings(workspaceStrings);
  const { formatDate, formatDateTime, formatNumber } = useLocale();
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
        failure instanceof Error
          ? failure.message
          : t("workspace.common.tryAgain"),
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
          <h2 id="live-account-heading">
            {t("workspace.account.messaging.title")}
          </h2>
          <p>{t("workspace.account.messaging.description")}</p>
        </div>
        {!snapshot.user.verified && (
          <p className="app-field-help">
            {t("workspace.account.messaging.emailUnverified")}
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
                    setNotice(
                      t("workspace.account.messaging.verificationSent"),
                    );
                  });
                }}
              >
                {t("workspace.account.messaging.sendVerification")}
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
                <div className="ltr-isolate">
                  <strong>
                    {platform === "instagram" ? "Instagram" : "WhatsApp"}
                  </strong>
                  <span className="ltr-isolate">
                    {connected
                      ? `${connected.label} · ${connected.status}`
                      : snapshot.capabilities[platform]
                        ? t("workspace.account.messaging.readyToConnect")
                        : t(
                            "workspace.account.messaging.serverConfigurationRequired",
                          )}
                  </span>
                  {connected?.error && (
                    <p className="workspace-inline-error ltr-isolate">{connected.error}</p>
                  )}
                </div>
                <button
                  className="app-text-button"
                  disabled={!owner || pending}
                  onClick={() => {
                    setConnection(platform);
                    setError("");
                  }}
                >
                  {connected
                    ? t("workspace.account.messaging.manage")
                    : t("workspace.account.messaging.connect")}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <p className="app-field-help">
          {t("workspace.account.messaging.serviceWindow")}
        </p>
      </section>

      <section className="settings-section" aria-labelledby="usage-heading">
        <div className="settings-section-intro">
          <h2 id="usage-heading">{t("workspace.account.usage.title")}</h2>
          <p>
            {snapshot.workspace.plan === "trial"
              ? t("workspace.account.usage.trialEnds", {
                  date: formatDate(snapshot.workspace.trialUntil),
                })
              : t("workspace.account.usage.planLine", {
                  plan: t(
                    snapshot.workspace.plan === "growth"
                      ? "workspace.account.usage.plan.growth"
                      : "workspace.account.usage.plan.starter",
                  ),
                  status: snapshot.workspace.billingStatus,
                })}
          </p>
        </div>
        <dl className="workspace-usage">
          <div>
            <dt>{t("workspace.account.usage.aiRequests")}</dt>
            <dd>
              {formatNumber(snapshot.usage.aiReplies)} /{" "}
              {formatNumber(snapshot.workspace.aiLimit)}
            </dd>
          </div>
          <div>
            <dt>{t("workspace.account.usage.newConversations")}</dt>
            <dd>
              {formatNumber(snapshot.usage.conversations)} /{" "}
              {formatNumber(snapshot.workspace.conversationLimit)}
            </dd>
          </div>
        </dl>
        {!snapshot.workspace.active && (
          <p className="workspace-inline-error">
            {t("workspace.account.usage.automationPaused")}
          </p>
        )}
        {owner && (
          <>
            <label
              className="workspace-billing-frequency"
              htmlFor="billing-frequency"
            >
              {t("workspace.account.billing.frequency")}
              <select
                id="billing-frequency"
                value={billingInterval}
                onChange={(event) => setBillingInterval(event.target.value)}
              >
                <option value="monthly">
                  {t("workspace.account.billing.monthly")}
                </option>
                <option value="yearly">
                  {t("workspace.account.billing.yearly")}
                </option>
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
                {t("workspace.account.billing.chooseStarter")}
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
                {t("workspace.account.billing.chooseGrowth")}
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
                {t("workspace.account.billing.manage")}
                <ArrowUpRight size={14} />
              </button>
            </div>
          </>
        )}
        {!snapshot.capabilities.billing && (
          <p className="app-field-help">
            {t("workspace.account.billing.notConfigured")}
          </p>
        )}
      </section>

      <section className="settings-section" aria-labelledby="team-heading">
        <div className="settings-section-intro">
          <h2 id="team-heading">{t("workspace.account.team.title")}</h2>
          <p>
            {t("workspace.account.team.seats", {
              count: snapshot.members.length,
              seats: snapshot.workspace.plan === "growth" ? 5 : 2,
            })}
          </p>
        </div>
        <ul className="workspace-team">
          {snapshot.members.map((member) => (
            <li key={member.id}>
              <div className="ltr-isolate">
                <strong className="ltr-isolate">{member.name}</strong>
                <span className="ltr-isolate">
                  {member.email} · {member.role}
                </span>
              </div>
              {owner && member.role !== "owner" && (
                <button
                  className="app-icon-button"
                  aria-label={t("workspace.account.team.removeMember", {
                    name: member.name,
                  })}
                  disabled={pending}
                  onClick={() => {
                    void run(async () => {
                      await request(`/team/${member.id}`, {
                        method: "DELETE",
                        body: {},
                      });
                      setNotice(t("workspace.account.team.memberRemoved"));
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
                    ? t("workspace.account.team.invitationSent")
                    : t("workspace.account.team.emailNotConfigured"),
                );
                setInviteEmail("");
              });
            }}
          >
            <label htmlFor="team-email">
              {t("workspace.account.team.inviteByEmail")}
              <input
                type="email"
                id="team-email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
            </label>
            <button className="app-small-button" disabled={pending}>
              {t("workspace.account.team.createInvitation")}
              <ArrowRight size={13} />
            </button>
          </form>
        )}
        {inviteLink && (
          <label className="workspace-invite-link">
            {t("workspace.account.team.inviteLinkLabel")}
            <input
              readOnly
              value={inviteLink}
              onFocus={(event) => event.target.select()}
            />
            <span>{t("workspace.account.team.inviteLinkHelp")}</span>
          </label>
        )}
      </section>

      {owner && (
        <section
          className="settings-section"
          aria-labelledby="operations-heading"
        >
          <div className="settings-section-intro">
            <h2 id="operations-heading">
              {t("workspace.account.operations.title")}
            </h2>
            <p>{t("workspace.account.operations.description")}</p>
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
            {t("workspace.account.operations.check")}
          </button>
          {operations && (
            <div className="workspace-operations">
              <p>
                {operations.latency.count
                  ? t("workspace.account.operations.latency", {
                      ms: Math.round(operations.latency.p95_ms || 0),
                      count: operations.latency.count,
                    })
                  : t("workspace.account.operations.noLatency")}{" "}
                {t("workspace.account.operations.target")}
              </p>
              {operations.jobs.length ? (
                operations.jobs.map((job) => (
                  <div key={job.id}>
                    <span>
                      <strong>{job.kind}</strong> · {job.state} ·{" "}
                      {t("workspace.account.operations.attempt", {
                        attempts: job.attempts,
                      })}
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
                            setNotice(
                              t("workspace.account.operations.retryScheduled"),
                            );
                            setOperations(null);
                          });
                        }}
                      >
                        {t("workspace.account.operations.retrySafely")}
                        <RefreshCw size={13} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>{t("workspace.account.operations.noJobs")}</p>
              )}
            </div>
          )}
          <details className="workspace-audit">
            <summary>{t("workspace.account.operations.auditSummary")}</summary>
            <ul>
              {snapshot.audit.map((event, index) => (
                <li key={`${event.created_at}-${index}`}>
                  <span>{event.action.replace(/\./g, " ")}</span>
                  <time>{formatDateTime(event.created_at)}</time>
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
          <h2 id="account-security-heading">
            {t("workspace.account.security.title")}
          </h2>
          <p>
            {t("workspace.account.security.signedInAs", {
              email: snapshot.user.email,
            })}
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
          {t("workspace.account.security.switchWorkspace")}
          <ArrowRight size={13} />
        </button>
        {workspaces && (
          <div className="workspace-switch-list">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className="app-text-button ltr-isolate"
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
                <span className="ltr-isolate">{workspace.name}</span> · {workspace.role}
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
          <summary>{t("workspace.account.security.changePassword")}</summary>
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
                setNotice(t("workspace.account.security.passwordUpdated"));
              });
            }}
          >
            <label htmlFor="current-password">
              {t("workspace.account.security.currentPassword")}
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
              {t("workspace.account.security.newPassword")}
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
              {t("workspace.account.security.updatePassword")}
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
                  setNotice(t("workspace.account.security.exportDownloaded"));
                });
              }}
            >
              <Download size={14} />
              {t("workspace.account.security.exportWorkspace")}
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
            {t("workspace.account.security.signOut")}
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
              {t("workspace.account.security.deleteWorkspace")}
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
          title={t("workspace.account.connect.title", {
            platform: connection === "instagram" ? "Instagram" : "WhatsApp",
          })}
          onClose={() => {
            setConnection(null);
            setError("");
          }}
        >
          <div className="legal-copy">
            <p>
              {snapshot.capabilities[connection]
                ? connection === "instagram"
                  ? t("workspace.account.connect.instagramInfo")
                  : t("workspace.account.connect.whatsappInfo")
                : t("workspace.account.connect.notConfigured", {
                    what: t(
                      connection === "instagram"
                        ? "workspace.account.connect.instagramRequirement"
                        : "workspace.account.connect.whatsappRequirement",
                    ),
                  })}
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
                {t("workspace.account.connect.continueWithInstagram")}
                <ArrowUpRight size={15} />
              </button>
            ) : (
              <button
                className="closer-button closer-button-primary"
                disabled={pending || !snapshot.capabilities.whatsapp}
                onClick={() => {
                  void run(async () => {
                    const value = await request<{ url: string }>(
                      "/integrations/whatsapp/start",
                      { method: "POST", body: {} },
                    );
                    window.location.assign(value.url);
                  });
                }}
              >
                {t("workspace.account.connect.continueWithWhatsApp")}
                <ArrowUpRight size={15} />
              </button>
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
                    setConnection(null);
                    setNotice(t("workspace.account.connect.disconnected"));
                  });
                }}
              >
                {t("workspace.account.connect.disconnect")}
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
          title={t("workspace.account.delete.title")}
          onClose={() => setDeleting(false)}
        >
          <div className="legal-copy">
            <p>{t("workspace.account.delete.warning")}</p>
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
                {t("workspace.account.delete.confirmPassword")}
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
                {t("workspace.account.delete.understood")}
              </label>
              <button
                className="closer-button closer-button-primary"
                disabled={pending || !confirmed}
              >
                {t("workspace.account.delete.submit")}
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
  const t = useStrings(workspaceStrings);
  const params = new URLSearchParams(window.location.search);
  useEffect(() => {
    const result = params.get("connection");
    if (result)
      setNotice(
        result === "connected"
          ? t("workspace.notice.connected")
          : result === "cancelled"
            ? t("workspace.notice.cancelled")
            : t("workspace.notice.failed"),
      );
    if (params.get("billing"))
      setNotice(
        params.get("billing") === "processing"
          ? t("workspace.notice.checkoutReturned")
          : t("workspace.notice.checkoutCancelled"),
      );
  }, [t]);
  if (!live) return null;
  const invitation = params.get("invite");
  const verification = params.get("verify");
  return (
    <>
      {(invitation || verification) && (
        <div className="workspace-banner">
          <span>
            {invitation
              ? t("workspace.notice.invitation")
              : t("workspace.notice.verifyEmail")}
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
                  error instanceof Error
                    ? error.message
                    : t("workspace.common.tryAgain"),
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {invitation
              ? t("workspace.notice.acceptInvitation")
              : t("workspace.notice.verify")}
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
            {live.error || notice || t("workspace.notice.reconnecting")}
          </span>
          <button
            className="app-text-button"
            onClick={() => {
              setNotice("");
              live.clearError();
              void live.refresh();
            }}
          >
            {t("workspace.common.refresh")}
            <RefreshCw size={13} />
          </button>
        </div>
      )}
    </>
  );
}
