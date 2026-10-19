import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DialogShell } from "../ui/Dialog";
import Switch from "../ui/Switch";
import {
  brainLabels,
  industryLabels,
  money,
  parseMoney,
  type BrainEntry,
  type BrainKind,
  type BrainLink,
  type BusinessProfile,
} from "@/types/revenue";
import "./revenue.css";

interface BrainData {
  profile: BusinessProfile;
  entries: BrainEntry[];
  links: BrainLink[];
  guidance: { question: string; next: string; boundary: string };
}
function EntryEditor({
  entry,
  onClose,
  onSave,
  currency,
}: {
  entry: BrainEntry | null;
  onClose: () => void;
  onSave: (input: unknown) => Promise<void>;
  currency: string;
}) {
  const [kind, setKind] = useState<BrainKind>(entry?.kind || "product");
  const [title, setTitle] = useState(entry?.title || "");
  const [content, setContent] = useState(entry?.content || "");
  const [price, setPrice] = useState(
    entry?.priceMinor === null || !entry
      ? ""
      : (entry.priceMinor / 100).toFixed(2),
  );
  const [entryCurrency, setCurrency] = useState(entry?.currency || currency);
  const [approved, setApproved] = useState(entry?.approved || false);
  const [expiry, setExpiry] = useState(
    entry?.expiresAt
      ? new Date(entry.expiresAt).toISOString().slice(0, 10)
      : "",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <DialogShell
      title={entry ? "Edit business knowledge" : "Add business knowledge"}
      onClose={onClose}
    >
      <p className="dialog-description">
        Only approve facts you have verified. Competitor notes and playbooks
        guide a seller; they are not price or policy evidence.
      </p>
      <form
        className="setup-form revenue-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const minor = parseMoney(price);
          if (Number.isNaN(minor)) {
            setError("Use a positive amount with at most two decimals.");
            return;
          }
          setPending(true);
          try {
            await onSave({
              kind,
              title,
              content,
              priceMinor: ["product", "service", "offer"].includes(kind)
                ? minor
                : null,
              currency: entryCurrency,
              approved,
              expiresAt: expiry
                ? new Date(expiry + "T23:59:59Z").getTime()
                : null,
              ...(entry ? { version: entry.version } : {}),
            });
            onClose();
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : "Could not save.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor="brain-kind">
          Knowledge type
          <select
            id="brain-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as BrainKind)}
          >
            {Object.entries(brainLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="brain-title">
          Title
          <input
            id="brain-title"
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            data-autofocus
          />
        </label>
        <label htmlFor="brain-content">
          Approved details
          <textarea
            id="brain-content"
            rows={4}
            maxLength={3000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
          />
        </label>
        {["product", "service", "offer"].includes(kind) && (
          <div className="revenue-form-pair">
            <label htmlFor="brain-price">
              Price (optional)
              <input
                id="brain-price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="e.g. 80.00"
              />
            </label>
            <label htmlFor="brain-currency">
              Currency
              <select
                id="brain-currency"
                value={entryCurrency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {["USD", "EUR", "GBP", "CAD", "AUD"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <label htmlFor="brain-expiry">
          Valid through (optional)
          <input
            type="date"
            id="brain-expiry"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
          />
        </label>
        <label className="revenue-checkbox">
          <input
            type="checkbox"
            checked={approved}
            onChange={(event) => setApproved(event.target.checked)}
          />
          I verified this entry and approve it for business use.
        </label>
        {error && (
          <p className="workspace-form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="closer-button closer-button-primary"
          disabled={pending}
        >
          Save knowledge
          <Check size={15} />
        </button>
      </form>
    </DialogShell>
  );
}

export default function BusinessBrain() {
  const { live } = useApp();
  const [data, setData] = useState<BrainData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<BrainEntry | null | undefined>();
  const [deleting, setDeleting] = useState<BrainEntry | null>(null);
  const [pending, setPending] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [relation, setRelation] = useState<BrainLink["relation"]>("supports");
  const request = live?.request;
  const load = useCallback(async () => {
    if (!request) return;
    try {
      setData(await request("/brain"));
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Knowledge could not be loaded.",
      );
    }
  }, [request]);
  useEffect(() => {
    void load();
  }, [load, live?.snapshot]);
  if (!live) return null;
  const owner = live.snapshot.user.role === "owner";
  async function run(action: () => Promise<void>) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
      await live!.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  const entries = (data?.entries || []).filter(
    (entry) => filter === "all" || entry.kind === filter,
  );
  return (
    <section
      className="revenue-page brain-page"
      aria-labelledby="brain-heading"
    >
      <header className="revenue-page-header">
        <div>
          <span className="app-section-label">Business Brain</span>
          <h1 id="brain-heading">Your knowledge. Working together.</h1>
          <p>
            Verified products, answers, and sales know-how. One source of truth.
          </p>
        </div>
        <button
          className="app-small-button"
          disabled={!owner || pending}
          onClick={() => setEditing(null)}
        >
          <Plus size={15} />
          Add knowledge
        </button>
      </header>
      {error && (
        <p className="workspace-form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="revenue-success" role="status">
          {notice}
        </p>
      )}
      {data && (
        <>
          <details className="revenue-disclosure brain-context">
            <summary>
              Industry agent & sales defaults{" "}
              <span>{industryLabels[data.profile.industry]}</span>
            </summary>
            <div className="revenue-form-pair">
              <label htmlFor="brain-industry">
                Industry mode
                <select
                  id="brain-industry"
                  disabled={!owner || pending}
                  value={data.profile.industry}
                  onChange={(event) => {
                    void run(async () => {
                      await request!("/brain/profile", {
                        method: "PATCH",
                        body: { ...data.profile, industry: event.target.value },
                      });
                      setNotice("Industry guidance updated.");
                    });
                  }}
                >
                  {Object.entries(industryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="brain-default-currency">
                New opportunity currency
                <select
                  id="brain-default-currency"
                  disabled={!owner || pending}
                  value={data.profile.currency}
                  onChange={(event) => {
                    void run(async () => {
                      await request!("/brain/profile", {
                        method: "PATCH",
                        body: { ...data.profile, currency: event.target.value },
                      });
                      setNotice(
                        "Default currency updated. Existing deals are unchanged.",
                      );
                    });
                  }}
                >
                  {["USD", "EUR", "GBP", "CAD", "AUD"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="revenue-method-note">{data.guidance.boundary}</p>
            <div className="revenue-toggle">
              <div>
                <strong>Assist with deal stages</strong>
                <p>
                  Confirmed BANT can qualify a lead; a quote can move it to
                  Proposal. Wins, losses, and receipts always need your
                  confirmation.
                </p>
              </div>
              <Switch
                label="Automatic deal-stage assistance"
                checked={data.profile.autoStage}
                disabled={!owner || pending}
                onChange={() => {
                  void run(async () => {
                    await request!("/brain/profile", {
                      method: "PATCH",
                      body: {
                        ...data.profile,
                        autoStage: !data.profile.autoStage,
                      },
                    });
                  });
                }}
              />
            </div>
          </details>
          <div className="revenue-section-heading">
            <h2>
              Business knowledge <span>{data.entries.length}</span>
            </h2>
            <label className="sr-only" htmlFor="brain-filter">
              Filter knowledge
            </label>
            <select
              id="brain-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All knowledge</option>
              {Object.entries(brainLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {entries.length ? (
            <div className="brain-list">
              {entries.map((entry) => (
                <div className="brain-row" key={entry.id}>
                  <button
                    onClick={() => setEditing(entry)}
                    disabled={!owner}
                    aria-label={`Edit ${entry.title}`}
                  >
                    <span className="brain-entry-type">
                      {brainLabels[entry.kind]}
                    </span>
                    <strong>{entry.title}</strong>
                    <span className="brain-entry-description">
                      {entry.content}
                    </span>
                    <span className="brain-entry-state">
                      {entry.expiresAt && entry.expiresAt < Date.now()
                        ? "Expired"
                        : entry.approved
                          ? "Approved"
                          : "Draft"}{" "}
                      · version {entry.version}
                      {entry.priceMinor !== null
                        ? ` · ${money(entry.priceMinor, entry.currency)}`
                        : ""}
                    </span>
                  </button>
                  {owner && (
                    <button
                      className="app-icon-button"
                      onClick={() => setDeleting(entry)}
                      aria-label={`Delete ${entry.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="revenue-empty">
              <h3>A better answer starts with a verified fact.</h3>
              <p>
                Add a product, a service, or your most helpful FAQ. Existing
                business settings still work; this adds structured, reusable
                knowledge.
              </p>
            </div>
          )}
          <details className="revenue-disclosure">
            <summary>
              Knowledge relationships <span>{data.links.length}</span>
            </summary>
            <p>
              Connect an FAQ to a product, a playbook to an objection, or
              related offers. Relationships stay within your workspace.
            </p>
            {data.links.length ? (
              <ul className="brain-links">
                {data.links.map((link) => (
                  <li key={link.id}>
                    <span>
                      {
                        data.entries.find((entry) => entry.id === link.fromId)
                          ?.title
                      }{" "}
                      <small>{link.relation.replace(/_/g, " ")}</small>{" "}
                      {
                        data.entries.find((entry) => entry.id === link.toId)
                          ?.title
                      }
                    </span>
                    {owner && (
                      <button
                        className="app-icon-button"
                        aria-label="Delete knowledge relationship"
                        disabled={pending}
                        onClick={() => {
                          void run(async () => {
                            await request!(`/brain/links/${link.id}`, {
                              method: "DELETE",
                              body: {},
                            });
                          });
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="revenue-method-note">
                No relationships yet. Add two entries to connect them.
              </p>
            )}
            {owner && data.entries.length >= 2 && (
              <form
                className="brain-link-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    await request!("/brain/links", {
                      method: "POST",
                      body: { fromId: from, toId: to, relation },
                    });
                    setFrom("");
                    setTo("");
                    setNotice("Knowledge relationship added.");
                  });
                }}
              >
                <label htmlFor="brain-link-from">
                  From
                  <select
                    id="brain-link-from"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    required
                  >
                    <option value="">Choose entry</option>
                    {data.entries.map((entry) => (
                      <option value={entry.id} key={entry.id}>
                        {entry.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="brain-link-relation">
                  Relationship
                  <select
                    id="brain-link-relation"
                    value={relation}
                    onChange={(event) =>
                      setRelation(event.target.value as BrainLink["relation"])
                    }
                  >
                    <option value="supports">Supports</option>
                    <option value="answers">Answers</option>
                    <option value="competes_with">Competes with</option>
                    <option value="bundles">Bundles</option>
                  </select>
                </label>
                <label htmlFor="brain-link-to">
                  To
                  <select
                    id="brain-link-to"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    required
                  >
                    <option value="">Choose entry</option>
                    {data.entries
                      .filter((entry) => entry.id !== from)
                      .map((entry) => (
                        <option value={entry.id} key={entry.id}>
                          {entry.title}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="app-small-button"
                  disabled={pending || !from || !to}
                >
                  Connect
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </details>
          <p className="revenue-method-note">
            Learning never silently approves knowledge. Edits or expiry make old
            automatic replies require review. Only owners can change the
            Business Brain.
          </p>
        </>
      )}
      {editing !== undefined && (
        <EntryEditor
          key={editing?.id || "new"}
          entry={editing}
          currency={data?.profile.currency || "USD"}
          onClose={() => setEditing(undefined)}
          onSave={async (input) => {
            await request!(
              editing ? `/brain/entries/${editing.id}` : "/brain/entries",
              { method: editing ? "PATCH" : "POST", body: input },
            );
            await load();
            await live.refresh();
            setNotice("Business knowledge saved.");
          }}
        />
      )}
      {deleting && (
        <DialogShell
          title="Delete this knowledge?"
          onClose={() => setDeleting(null)}
        >
          <p className="dialog-description">
            {deleting.title} will be removed from future replies. Existing quote
            snapshots stay intact; related knowledge links will be removed.
          </p>
          <button
            className="closer-button closer-button-primary"
            disabled={pending}
            onClick={() => {
              void run(async () => {
                await request!(`/brain/entries/${deleting.id}`, {
                  method: "DELETE",
                  body: {},
                });
                setDeleting(null);
                setNotice("Knowledge deleted.");
              });
            }}
          >
            Delete knowledge
            <Trash2 size={15} />
          </button>
        </DialogShell>
      )}
    </section>
  );
}
