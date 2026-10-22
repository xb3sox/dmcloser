import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useStrings } from "@/context/LocaleContext";
import {
  revenueBrainKindLabelKeys,
  revenueIndustryLabelKeys,
  revenueStrings,
} from "@/i18n/surfaces/revenue";
import { DialogShell } from "../ui/Dialog";
import Switch from "../ui/Switch";
import Money from "../ui/Money";
import {
  brainLabels,
  industryLabels,
  parseMoney,
  type BrainEntry,
  type BrainKind,
  type BrainLink,
  type BusinessProfile,
  type SectorField,
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
  const t = useStrings(revenueStrings);
  return (
    <DialogShell
      title={entry ? t("revenue.brain.editTitle") : t("revenue.brain.addTitle")}
      onClose={onClose}
    >
      <p className="dialog-description">{t("revenue.brain.editorDescription")}</p>
      <form
        className="setup-form revenue-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const minor = parseMoney(price);
          if (Number.isNaN(minor)) {
            setError(t("revenue.brain.invalidAmount"));
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
              failure instanceof Error
                ? failure.message
                : t("revenue.brain.saveFailed"),
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor="brain-kind">
          {t("revenue.brain.entryType")}
          <select
            id="brain-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as BrainKind)}
          >
            {Object.entries(brainLabels).map(([value]) => (
              <option key={value} value={value}>
                {t(revenueBrainKindLabelKeys[value])}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="brain-title">
          {t("revenue.brain.entryTitle")}
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
          {t("revenue.brain.entryDetails")}
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
              {t("revenue.brain.entryPrice")}
              <input
                id="brain-price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder={t("revenue.brain.entryPricePlaceholder")}
              />
            </label>
            <label htmlFor="brain-currency">
              {t("revenue.brain.entryCurrency")}
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
          {t("revenue.brain.entryExpiry")}
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
          {t("revenue.brain.entryApprove")}
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
          {t("revenue.brain.saveEntry")}
          <Check size={15} />
        </button>
      </form>
    </DialogShell>
  );
}

export default function BusinessBrain() {
  const { live } = useApp();
  const t = useStrings(revenueStrings);
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
  const [draftFields, setDraftFields] = useState<SectorField[] | null>(null);
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
          : t("revenue.brain.loadFailed"),
      );
    }
  }, [request, t]);
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
        failure instanceof Error ? failure.message : t("revenue.brain.tryAgain"),
      );
    } finally {
      setPending(false);
    }
  }
  const entries = (data?.entries || []).filter(
    (entry) => filter === "all" || entry.kind === filter,
  );
  const sectorFields = draftFields ?? data?.profile.sectorFields ?? [];
  function updateField(index: number, patch: Partial<SectorField>) {
    setDraftFields((current) => {
      const base = current ?? data?.profile.sectorFields ?? [];
      return base.map((field, position) =>
        position === index ? { ...field, ...patch } : field,
      );
    });
  }
  return (
    <section
      className="revenue-page brain-page"
      aria-labelledby="brain-heading"
    >
      <header className="revenue-page-header">
        <div>
          <span className="app-section-label">{t("revenue.brain.label")}</span>
          <h1 id="brain-heading">{t("revenue.brain.heading")}</h1>
          <p>{t("revenue.brain.subheading")}</p>
        </div>
        <button
          className="app-small-button"
          disabled={!owner || pending}
          onClick={() => setEditing(null)}
        >
          <Plus size={15} />
          {t("revenue.brain.add")}
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
              {t("revenue.brain.contextSummary")}{" "}
              <span>{t(revenueIndustryLabelKeys[data.profile.industry])}</span>
            </summary>
            <div className="revenue-form-pair">
              <label htmlFor="brain-industry">
                {t("revenue.brain.industryMode")}
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
                      setNotice(t("revenue.brain.industryUpdated"));
                    });
                  }}
                >
                  {Object.entries(industryLabels).map(([value]) => (
                    <option key={value} value={value}>
                      {t(revenueIndustryLabelKeys[value])}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="brain-default-currency">
                {t("revenue.brain.defaultCurrency")}
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
                      setNotice(t("revenue.brain.currencyUpdated"));
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
                <strong>{t("revenue.brain.autoStageTitle")}</strong>
                <p>{t("revenue.brain.autoStageText")}</p>
              </div>
              <Switch
                label={t("revenue.brain.autoStageSwitch")}
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
            {data.profile.industry === "custom" && (
              <div className="revenue-section">
                <div className="revenue-section-heading">
                  <h2>
                    {t("revenue.brain.customFields")}{" "}
                    <span>{sectorFields.length}</span>
                  </h2>
                  <button
                    className="app-small-button"
                    disabled={!owner || pending || sectorFields.length >= 20}
                    onClick={() =>
                      setDraftFields([
                        ...sectorFields,
                        {
                          key: `field_${sectorFields.length + 1}`,
                          label: "",
                          type: "text",
                          required: false,
                        },
                      ])
                    }
                  >
                    <Plus size={15} />
                    {t("revenue.brain.addField")}
                  </button>
                </div>
                <p className="revenue-method-note">
                  {t("revenue.brain.customFieldsNote")}
                </p>
                {sectorFields.map((field, index) => (
                  <div className="brain-row" key={field.key}>
                    <div
                      className="setup-form revenue-form"
                      style={{ flex: "1 1 0", minWidth: 0, marginTop: 0 }}
                    >
                      <div className="revenue-form-pair">
                        <label>
                          {t("revenue.brain.fieldLabel")}
                          <input
                            value={field.label}
                            maxLength={80}
                            onChange={(event) =>
                              updateField(index, {
                                label: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t("revenue.brain.fieldType")}
                          <select
                            value={field.type}
                            onChange={(event) =>
                              updateField(index, {
                                type: event.target
                                  .value as SectorField["type"],
                              })
                            }
                          >
                            <option value="text">
                              {t("revenue.brain.fieldTypeText")}
                            </option>
                            <option value="number">
                              {t("revenue.brain.fieldTypeNumber")}
                            </option>
                            <option value="date">
                              {t("revenue.brain.fieldTypeDate")}
                            </option>
                          </select>
                        </label>
                      </div>
                    </div>
                    <label className="revenue-checkbox">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) =>
                          updateField(index, {
                            required: event.target.checked,
                          })
                        }
                      />
                      {t("revenue.brain.required")}
                    </label>
                    <button
                      className="app-text-button"
                      onClick={() =>
                        setDraftFields(
                          sectorFields.filter(
                            (_, position) => position !== index,
                          ),
                        )
                      }
                      aria-label={t("revenue.brain.removeField", {
                        name: field.label || t("revenue.brain.genericField"),
                      })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  className="closer-button closer-button-primary"
                  disabled={!owner || pending}
                  onClick={() => {
                    if (sectorFields.some((field) => !field.label.trim())) {
                      setError(t("revenue.brain.fieldNeedsLabel"));
                      return;
                    }
                    void run(async () => {
                      await request!("/brain/profile", {
                        method: "PATCH",
                        body: {
                          ...data!.profile,
                          sectorFields: sectorFields.map((field) => ({
                            ...field,
                            label: field.label.trim(),
                          })),
                        },
                      });
                      setDraftFields(null);
                      setNotice(t("revenue.brain.customFieldsSaved"));
                    });
                  }}
                >
                  {t("revenue.brain.saveCustomFields")}
                </button>
              </div>
            )}
          </details>
          <div className="revenue-section-heading">
            <h2>
              {t("revenue.brain.entriesHeading")}{" "}
              <span>{data.entries.length}</span>
            </h2>
            <label className="sr-only" htmlFor="brain-filter">
              {t("revenue.brain.filterLabel")}
            </label>
            <select
              id="brain-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">{t("revenue.brain.filterAll")}</option>
              {Object.entries(brainLabels).map(([value]) => (
                <option value={value} key={value}>
                  {t(revenueBrainKindLabelKeys[value])}
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
                    aria-label={t("revenue.brain.editEntry", {
                      title: entry.title,
                    })}
                  >
                    <span className="brain-entry-type">
                      {t(revenueBrainKindLabelKeys[entry.kind])}
                    </span>
                    <strong>{entry.title}</strong>
                    <span className="brain-entry-description">
                      {entry.content}
                    </span>
                    <span className="brain-entry-state">
                      {entry.expiresAt && entry.expiresAt < Date.now()
                        ? t("revenue.brain.stateExpired")
                        : entry.approved
                          ? t("revenue.brain.stateApproved")
                          : t("revenue.brain.stateDraft")}{" "}
                      {t("revenue.brain.version", {
                        version: entry.version,
                      })}
                      {entry.priceMinor !== null && (
                        <>
                          {" · "}
                          <Money
                            minor={entry.priceMinor}
                            currency={entry.currency}
                          />
                        </>
                      )}
                    </span>
                  </button>
                  {owner && (
                    <button
                      className="app-icon-button"
                      onClick={() => setDeleting(entry)}
                      aria-label={t("revenue.brain.deleteEntry", {
                        title: entry.title,
                      })}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="revenue-empty">
              <h3>{t("revenue.brain.emptyHeading")}</h3>
              <p>{t("revenue.brain.emptyText")}</p>
            </div>
          )}
          <details className="revenue-disclosure">
            <summary>
              {t("revenue.brain.relationships")}{" "}
              <span>{data.links.length}</span>
            </summary>
            <p>{t("revenue.brain.relationshipsText")}</p>
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
                        aria-label={t("revenue.brain.deleteRelationship")}
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
                {t("revenue.brain.noRelationships")}
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
                    setNotice(t("revenue.brain.relationshipAdded"));
                  });
                }}
              >
                <label htmlFor="brain-link-from">
                  {t("revenue.brain.linkFrom")}
                  <select
                    id="brain-link-from"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    required
                  >
                    <option value="">{t("revenue.brain.chooseEntry")}</option>
                    {data.entries.map((entry) => (
                      <option value={entry.id} key={entry.id}>
                        {entry.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="brain-link-relation">
                  {t("revenue.brain.linkRelation")}
                  <select
                    id="brain-link-relation"
                    value={relation}
                    onChange={(event) =>
                      setRelation(event.target.value as BrainLink["relation"])
                    }
                  >
                    <option value="supports">
                      {t("revenue.brain.relationSupports")}
                    </option>
                    <option value="answers">
                      {t("revenue.brain.relationAnswers")}
                    </option>
                    <option value="competes_with">
                      {t("revenue.brain.relationCompetes")}
                    </option>
                    <option value="bundles">
                      {t("revenue.brain.relationBundles")}
                    </option>
                  </select>
                </label>
                <label htmlFor="brain-link-to">
                  {t("revenue.brain.linkTo")}
                  <select
                    id="brain-link-to"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    required
                  >
                    <option value="">{t("revenue.brain.chooseEntry")}</option>
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
                  {t("revenue.brain.connect")}
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </details>
          <p className="revenue-method-note">
            {t("revenue.brain.approvalNote")}
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
            setNotice(t("revenue.brain.saved"));
          }}
        />
      )}
      {deleting && (
        <DialogShell
          title={t("revenue.brain.deleteTitle")}
          onClose={() => setDeleting(null)}
        >
          <p className="dialog-description">
            {t("revenue.brain.deleteDescription", {
              title: deleting.title,
            })}
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
                setNotice(t("revenue.brain.deleted"));
              });
            }}
          >
            {t("revenue.brain.deleteAction")}
            <Trash2 size={15} />
          </button>
        </DialogShell>
      )}
    </section>
  );
}
