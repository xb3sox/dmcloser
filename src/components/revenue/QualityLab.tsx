import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  CircleDashed,
  FlaskConical,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useLocale, useStrings } from "@/context/LocaleContext";
import { qualityStrings } from "@/i18n/surfaces/quality";
import { DialogShell } from "../ui/Dialog";
import "./revenue.css";

type PromptStatus = "draft" | "published" | "blocked" | "archived";
type RunStatus = "running" | "passed" | "failed";

interface PromptVersion {
  id: string;
  version: number;
  instructions: string;
  status: PromptStatus;
  notes: string;
  createdAt: string;
  publishedAt: string | null;
}
interface EvalResult {
  caseId: string;
  name: string;
  passed: boolean;
  detail: string;
}
interface EvalRun {
  id: string;
  versionId: string;
  status: RunStatus;
  passed: number;
  failed: number;
  results: EvalResult[];
  createdAt: string;
  finishedAt: string | null;
}
interface EvalCase {
  id: string;
  name: string;
  kind: string;
  input: { messages: { sender: string; text: string }[] };
  expected: { intent?: string; safe?: boolean; contains?: string[] };
  blocking: boolean;
  enabled: boolean;
}
interface QualityData {
  versions: PromptVersion[];
  cases: EvalCase[];
  runs: EvalRun[];
}

const statusKeys = {
  draft: "quality.status.draft",
  published: "quality.status.published",
  blocked: "quality.status.blocked",
  archived: "quality.status.archived",
} as const satisfies Record<PromptStatus, string>;

const runKeys = {
  running: "quality.run.running",
  passed: "quality.run.passed",
  failed: "quality.run.failed",
} as const satisfies Record<RunStatus, string>;

const kindKeys = {
  safety: "quality.kind.safety",
  intent: "quality.kind.intent",
  grounding: "quality.kind.grounding",
  language: "quality.kind.language",
} as const;

const kinds = Object.keys(kindKeys) as (keyof typeof kindKeys)[];

function StatusMark({ status }: { status: PromptStatus }) {
  const t = useStrings(qualityStrings);
  const icon =
    status === "published" ? (
      <CheckCircle2 size={14} />
    ) : status === "blocked" ? (
      <AlertTriangle size={14} />
    ) : status === "archived" ? (
      <Archive size={14} />
    ) : (
      <CircleDashed size={14} />
    );
  return (
    <span className="brain-entry-state">
      {icon} {t(statusKeys[status])}
    </span>
  );
}

function VersionEditor({
  version,
  onClose,
  onSave,
}: {
  version: PromptVersion;
  onClose: () => void;
  onSave: (instructions: string) => Promise<void>;
}) {
  const [instructions, setInstructions] = useState(version.instructions);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const t = useStrings(qualityStrings);
  return (
    <DialogShell title={t("quality.version.editTitle")} onClose={onClose}>
      <p className="dialog-description">{t("quality.version.editDescription")}</p>
      <form
        className="setup-form revenue-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setPending(true);
          try {
            await onSave(instructions);
            onClose();
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : t("quality.error.save"),
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor="quality-instructions">
          {t("quality.version.instructions")}
          <textarea
            id="quality-instructions"
            rows={12}
            maxLength={20000}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            required
            data-autofocus
          />
        </label>
        {error && (
          <p className="workspace-form-error" role="alert">
            {error}
          </p>
        )}
        <button className="closer-button closer-button-primary" disabled={pending}>
          {t("quality.version.save")}
          <Check size={15} />
        </button>
      </form>
    </DialogShell>
  );
}

function CaseEditor({
  value,
  onClose,
  onSave,
}: {
  value: EvalCase | null;
  onClose: () => void;
  onSave: (body: unknown) => Promise<void>;
}) {
  const [name, setName] = useState(value?.name || "");
  const [kind, setKind] = useState(value?.kind || "safety");
  const [message, setMessage] = useState(value?.input.messages[0]?.text || "");
  const [intent, setIntent] = useState(value?.expected.intent || "any");
  const [safe, setSafe] = useState(
    value?.expected.safe === undefined
      ? "any"
      : value.expected.safe
        ? "safe"
        : "unsafe",
  );
  const [contains, setContains] = useState(
    (value?.expected.contains || []).join(", "),
  );
  const [blocking, setBlocking] = useState(value?.blocking ?? true);
  const [enabled, setEnabled] = useState(value?.enabled ?? true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const t = useStrings(qualityStrings);
  return (
    <DialogShell
      title={t(value ? "quality.case.editTitle" : "quality.case.addTitle")}
      onClose={onClose}
    >
      <p className="dialog-description">{t("quality.case.description")}</p>
      <form
        className="setup-form revenue-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const expected: Record<string, unknown> = {};
          if (intent !== "any") expected.intent = intent;
          if (safe !== "any") expected.safe = safe === "safe";
          const needles = contains
            .split(",")
            .map((needle) => needle.trim())
            .filter(Boolean);
          if (needles.length) expected.contains = needles;
          setPending(true);
          try {
            await onSave({
              name,
              kind,
              input: { messages: [{ sender: "contact", text: message }] },
              expected,
              blocking,
              enabled,
            });
            onClose();
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : t("quality.error.save"),
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor="quality-case-name">
          {t("quality.case.name")}
          <input
            id="quality-case-name"
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            data-autofocus
          />
        </label>
        <label htmlFor="quality-case-kind">
          {t("quality.case.kind")}
          <select
            id="quality-case-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            {kinds.map((option) => (
              <option key={option} value={option}>
                {t(kindKeys[option])}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="quality-case-message">
          {t("quality.case.message")}
          <textarea
            id="quality-case-message"
            rows={4}
            maxLength={4000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
          />
        </label>
        <div className="revenue-form-pair">
          <label htmlFor="quality-case-intent">
            {t("quality.case.expectedIntent")}
            <select
              id="quality-case-intent"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
            >
              <option value="any">{t("quality.case.any")}</option>
              <option value="buy">buy</option>
              <option value="question">question</option>
              <option value="spam">spam</option>
            </select>
          </label>
          <label htmlFor="quality-case-safe">
            {t("quality.case.expectedSafety")}
            <select
              id="quality-case-safe"
              value={safe}
              onChange={(event) => setSafe(event.target.value)}
            >
              <option value="any">{t("quality.case.any")}</option>
              <option value="safe">{t("quality.case.safe")}</option>
              <option value="unsafe">{t("quality.case.notSafe")}</option>
            </select>
          </label>
        </div>
        <label htmlFor="quality-case-contains">
          {t("quality.case.contains")}
          <input
            id="quality-case-contains"
            maxLength={200}
            value={contains}
            onChange={(event) => setContains(event.target.value)}
          />
        </label>
        <label className="revenue-checkbox">
          <input
            type="checkbox"
            checked={blocking}
            onChange={(event) => setBlocking(event.target.checked)}
          />
          {t("quality.case.blocking")}
        </label>
        <label className="revenue-checkbox">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {t("quality.case.enabled")}
        </label>
        {error && (
          <p className="workspace-form-error" role="alert">
            {error}
          </p>
        )}
        <button className="closer-button closer-button-primary" disabled={pending}>
          {t("quality.case.save")}
          <Check size={15} />
        </button>
      </form>
    </DialogShell>
  );
}

export default function QualityLab() {
  const { live } = useApp();
  const t = useStrings(qualityStrings);
  const { formatDate } = useLocale();
  const [data, setData] = useState<QualityData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<PromptVersion | undefined>();
  const [editingCase, setEditingCase] = useState<EvalCase | null | undefined>();
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = live?.request;
  const load = useCallback(async () => {
    if (!request) return;
    try {
      setData(await request<QualityData>("/quality"));
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : t("quality.error.load"),
      );
    }
  }, [request, t]);
  useEffect(() => {
    void load();
    return () => {
      if (poll.current) clearTimeout(poll.current);
    };
  }, [load, live?.snapshot]);
  if (!live) return null;
  const owner = live.snapshot.user.role === "owner";
  // `kind` is a free-form owner label; translate the four presets, keep the rest.
  const kindLabel = (kind: string) => {
    const key = kindKeys[kind as keyof typeof kindKeys];
    return key ? t(key) : kind;
  };
  async function run(action: () => Promise<void>, message: string) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : t("quality.error.retry"),
      );
    } finally {
      setPending(false);
    }
  }
  const versions = data?.versions || [];
  const cases = data?.cases || [];
  const runs = data?.runs || [];
  const published = versions.find((version) => version.status === "published");
  const blocked = versions.find((version) => version.status === "blocked");
  const lastRun = runs[0];
  const lastRunVersion = versions.find(
    (version) => version.id === lastRun?.versionId,
  );
  return (
    <section className="revenue-page" aria-labelledby="quality-heading">
      <header className="revenue-page-header">
        <div>
          <span className="app-section-label">{t("quality.page.label")}</span>
          <h1 id="quality-heading">{t("quality.page.title")}</h1>
          <p>{t("quality.page.description")}</p>
        </div>
        <button
          className="app-small-button"
          disabled={!owner || pending}
          onClick={() =>
            void run(async () => {
              await request!("/quality/versions", {
                method: "POST",
                body: {},
              });
            }, t("quality.notice.draftCreated"))
          }
        >
          <Plus size={15} />
          {t("quality.action.newDraft")}
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
      <section className="revenue-section" aria-label={t("quality.section.effective")}>
        <div className="revenue-section-heading">
          <h2>
            {t("quality.section.effective")}{" "}
            <span>
              {t(published ? "quality.source.versioned" : "quality.source.builtIn")}
            </span>
          </h2>
        </div>
        {published ? (
          <div className="brain-row">
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <span className="brain-entry-type">
                {t("quality.version.label", { version: published.version })}
              </span>
              <strong>{t("quality.effective.published")}</strong>
              <p className="brain-entry-description">
                {t("quality.effective.publishedOn", {
                  date: formatDate(published.publishedAt || published.createdAt),
                })}
              </p>
            </div>
            <StatusMark status={published.status} />
          </div>
        ) : (
          <div className="revenue-empty">
            <h3>{t("quality.effective.builtIn")}</h3>
            <p>{t("quality.effective.builtInDescription")}</p>
          </div>
        )}
        {blocked && (
          <p className="workspace-form-error" role="alert">
            {t("quality.effective.blockedWarning", { version: blocked.version })}
          </p>
        )}
        <p className="revenue-method-note">{t("quality.effective.note")}</p>
      </section>
      <section className="revenue-section" aria-label={t("quality.section.versions")}>
        <div className="revenue-section-heading">
          <h2>
            {t("quality.section.versions")} <span>{versions.length}</span>
          </h2>
        </div>
        {versions.length === 0 ? (
          <div className="revenue-empty">
            <h3>{t("quality.versions.emptyTitle")}</h3>
            <p>{t("quality.versions.emptyDescription")}</p>
          </div>
        ) : (
          <div className="brain-list">
            {versions.map((version) => (
              <div className="brain-row" key={version.id}>
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <span className="brain-entry-type">
                    {t("quality.version.label", { version: version.version })}
                  </span>
                  <strong>{version.notes || t("quality.version.fallbackNote")}</strong>
                  <p className="brain-entry-description">
                    {version.instructions.slice(0, 220)}
                  </p>
                </div>
                <StatusMark status={version.status} />
                <div
                  className="revenue-header-controls"
                  style={{ paddingTop: 0, flexWrap: "wrap" }}
                >
                  {version.status === "draft" && (
                    <button
                      className="app-text-button"
                      disabled={!owner || pending}
                      onClick={() => setEditing(version)}
                    >
                      <Pencil size={14} />
                      {t("quality.action.edit")}
                    </button>
                  )}
                  <button
                    className="app-text-button"
                    disabled={!owner || pending}
                    onClick={() =>
                      void run(async () => {
                        await request!(
                          `/quality/versions/${version.id}/run`,
                          { method: "POST", body: {} },
                        );
                        if (poll.current) clearTimeout(poll.current);
                        poll.current = setTimeout(() => void load(), 2500);
                      }, t("quality.notice.runQueued"))
                    }
                  >
                    <Play size={14} />
                    {t("quality.action.run")}
                  </button>
                  {version.status === "draft" && (
                    <button
                      className="app-small-button"
                      disabled={!owner || pending}
                      onClick={() =>
                        void run(async () => {
                          await request!(
                            `/quality/versions/${version.id}/publish`,
                            { method: "POST", body: {} },
                          );
                        }, t("quality.notice.published"))
                      }
                    >
                      <Send size={14} />
                      {t("quality.action.publish")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="revenue-section" aria-label={t("quality.section.cases")}>
        <div className="revenue-section-heading">
          <h2>
            {t("quality.section.cases")} <span>{cases.length}</span>
          </h2>
          <button
            className="app-small-button"
            disabled={!owner || pending}
            onClick={() => setEditingCase(null)}
          >
            <Plus size={15} />
            {t("quality.action.addCase")}
          </button>
        </div>
        {cases.length === 0 ? (
          <div className="revenue-empty">
            <h3>{t("quality.cases.emptyTitle")}</h3>
            <p>{t("quality.cases.emptyDescription")}</p>
          </div>
        ) : (
          <div className="brain-list">
            {cases.map((value) => (
              <div className="brain-row" key={value.id}>
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <span className="brain-entry-type">{kindLabel(value.kind)}</span>
                  <strong>{value.name}</strong>
                  <p className="brain-entry-description">
                    {value.input.messages[0]?.text || ""}
                  </p>
                </div>
                <span className="brain-entry-state">
                  {t(
                    value.blocking
                      ? "quality.case.blockingLabel"
                      : "quality.case.notBlockingLabel",
                  )}{" "}
                  ·{" "}
                  {t(
                    value.enabled
                      ? "quality.case.enabledLabel"
                      : "quality.case.disabledLabel",
                  )}
                </span>
                <div
                  className="revenue-header-controls"
                  style={{ paddingTop: 0, flexWrap: "wrap" }}
                >
                  <button
                    className="app-text-button"
                    disabled={!owner || pending}
                    onClick={() => setEditingCase(value)}
                  >
                    <Pencil size={14} />
                    {t("quality.action.edit")}
                  </button>
                  <button
                    className="app-text-button"
                    disabled={!owner || pending}
                    onClick={() =>
                      void run(async () => {
                        await request!(`/quality/cases/${value.id}`, {
                          method: "PATCH",
                          body: { enabled: !value.enabled },
                        });
                      }, t(value.enabled ? "quality.notice.caseDisabled" : "quality.notice.caseEnabled"))
                    }
                  >
                    {t(value.enabled ? "quality.action.disable" : "quality.action.enable")}
                  </button>
                  <button
                    className="app-text-button"
                    disabled={!owner || pending}
                    onClick={() =>
                      void run(async () => {
                        await request!(`/quality/cases/${value.id}`, {
                          method: "DELETE",
                          body: {},
                        });
                      }, t("quality.notice.caseDeleted"))
                    }
                  >
                    <Trash2 size={14} />
                    {t("quality.action.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="revenue-method-note">{t("quality.cases.note")}</p>
      </section>
      <section className="revenue-section" aria-label={t("quality.section.lastRun")}>
        <div className="revenue-section-heading">
          <h2>
            {t("quality.section.lastRun")}{" "}
            <span>
              {lastRun ? t(runKeys[lastRun.status]) : t("quality.run.none")}
            </span>
          </h2>
        </div>
        {!lastRun ? (
          <div className="revenue-empty">
            <h3>{t("quality.runs.emptyTitle")}</h3>
            <p>{t("quality.runs.emptyDescription")}</p>
          </div>
        ) : (
          <div className="brain-list">
            {lastRun.results.map((result) => (
              <div className="brain-row" key={result.caseId}>
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <span className="brain-entry-type">
                    {t(
                      result.passed
                        ? "quality.run.casePassed"
                        : "quality.run.caseFailed",
                    )}
                  </span>
                  <strong>{result.name}</strong>
                  <p className="brain-entry-description">{result.detail}</p>
                </div>
              </div>
            ))}
            <div className="brain-row">
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <span className="brain-entry-type">{t("quality.runs.summary")}</span>
                <strong>
                  {t("quality.runs.summaryCount", {
                    passed: lastRun.passed,
                    total: lastRun.passed + lastRun.failed,
                  })}
                </strong>
                <p className="brain-entry-description">
                  {lastRunVersion
                    ? t("quality.version.label", { version: lastRunVersion.version })
                    : t("quality.runs.versionRemoved")}
                  {t("quality.runs.summaryNote")}
                </p>
              </div>
            </div>
          </div>
        )}
        <p className="revenue-method-note">
          <FlaskConical size={13} /> {t("quality.runs.note")}
        </p>
      </section>
      {editing !== undefined && (
        <VersionEditor
          version={editing}
          onClose={() => setEditing(undefined)}
          onSave={async (instructions) => {
            await request!(`/quality/versions/${editing.id}`, {
              method: "PATCH",
              body: { instructions },
            });
            setNotice(t("quality.notice.instructionsSaved"));
            await load();
          }}
        />
      )}
      {editingCase !== undefined && (
        <CaseEditor
          value={editingCase}
          onClose={() => setEditingCase(undefined)}
          onSave={async (body) => {
            if (editingCase)
              await request!(`/quality/cases/${editingCase.id}`, {
                method: "PATCH",
                body,
              });
            else
              await request!("/quality/cases", { method: "POST", body });
            setNotice(t("quality.notice.caseSaved"));
            await load();
          }}
        />
      )}
    </section>
  );
}
