import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useLocale, useStrings } from "@/context/LocaleContext";
import { revenueStageLabelKeys, revenueStrings } from "@/i18n/surfaces/revenue";
import { DialogShell } from "../ui/Dialog";
import Money, { useMoney } from "../ui/Money";
import {
  parseMoney,
  stageLabels,
  type BrainEntry,
  type BusinessProfile,
  type DealDetail,
  type DealStage,
  type SectorField,
} from "@/types/revenue";
import "./revenue.css";

type Action =
  | "edit"
  | "won"
  | "lost"
  | "payment"
  | "refund"
  | "quote"
  | "book"
  | "follow"
  | "escalate";
const actionTitleKeys: Record<Action, keyof typeof revenueStrings> = {
  edit: "revenue.deal.actionEdit",
  won: "revenue.deal.actionWon",
  lost: "revenue.deal.actionLost",
  payment: "revenue.deal.actionPayment",
  refund: "revenue.deal.actionRefund",
  quote: "revenue.deal.actionQuote",
  book: "revenue.deal.actionBook",
  follow: "revenue.deal.actionFollow",
  escalate: "revenue.deal.actionEscalate",
};
const dateInput = (value: number) => {
  const date = new Date(value);
  return new Date(value - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

function DealAction({
  action,
  data,
  entries,
  sectorFields,
  onClose,
  onSuccess,
}: {
  action: Action;
  data: DealDetail;
  entries: BrainEntry[];
  sectorFields: SectorField[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const { live } = useApp();
  const t = useStrings(revenueStrings);
  const formatMoney = useMoney();
  const [openedData] = useState(data);
  const deal = openedData.deal;
  const [amount, setAmount] = useState(
    action === "edit" && deal.valueMinor !== null
      ? (deal.valueMinor / 100).toFixed(2)
      : "",
  );
  const [currency, setCurrency] = useState(deal.currency);
  const [stage, setStage] = useState<DealStage>(deal.stage);
  const [closeDate, setCloseDate] = useState(deal.expectedClose || "");
  const [product, setProduct] = useState(deal.productId || "");
  const [budget, setBudget] = useState(
    deal.qualification.budgetMinor === null
      ? ""
      : (deal.qualification.budgetMinor / 100).toFixed(2),
  );
  const [authority, setAuthority] = useState(deal.qualification.authority);
  const [need, setNeed] = useState(deal.qualification.need);
  const [timeline, setTimeline] = useState(
    deal.qualification.timelineDate || "",
  );
  const [custom, setCustom] = useState<Record<string, string>>(
    deal.qualification.custom || {},
  );
  const [campaign, setCampaign] = useState(deal.campaign);
  const [reason, setReason] = useState("fit");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(dateInput(Date.now() + 2 * 3600000));
  const [title, setTitle] = useState("Consultation");
  const [resource, setResource] = useState("Business");
  const [duration, setDuration] = useState("30");
  const [text, setText] = useState(
    data.insight.nextDraft || t("revenue.deal.defaultDraft"),
  );
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  const eligible = entries.filter(
    (entry) =>
      entry.approved &&
      ["product", "service"].includes(entry.kind) &&
      entry.priceMinor !== null &&
      entry.currency === deal.currency &&
      (!entry.expiresAt || entry.expiresAt > Date.now()),
  );
  async function submit() {
    if (!live) return;
    setError("");
    setPending(true);
    try {
      const base = `/deals/${encodeURIComponent(deal.id)}`;
      const options = { method: "POST", key: requestKey };
      if (action === "edit") {
        const value = parseMoney(amount),
          budgetValue = parseMoney(budget);
        if (Number.isNaN(value) || Number.isNaN(budgetValue))
          throw new Error(t("revenue.deal.errorNonNegative"));
        await live.request(base, {
          method: "PATCH",
          body: {
            version: deal.version,
            stage,
            valueMinor: value,
            currency,
            expectedClose: closeDate || null,
            productId: product || null,
            qualification: {
              budgetMinor: budgetValue,
              authority,
              need,
              timelineDate: timeline || null,
              custom,
            },
            campaign,
          },
        });
      } else if (action === "won" || action === "lost")
        await live.request(`${base}/outcome`, {
          ...options,
          body: { version: deal.version, outcome: action, reason, note },
        });
      else if (action === "payment" || action === "refund") {
        const value = parseMoney(amount);
        if (value === null || !Number.isFinite(value) || value <= 0)
          throw new Error(t("revenue.deal.errorPositiveAmount"));
        await live.request(`${base}/revenue`, {
          ...options,
          body: {
            kind: action,
            amountMinor: value,
            reference,
            occurredAt: Date.now(),
            confirmed,
          },
        });
      } else if (action === "quote")
        await live.request(`${base}/quotes`, {
          ...options,
          body: {
            lines: [{ entryId: product, quantity: Number(quantity) }],
            validDays: 7,
          },
        });
      else if (action === "book") {
        const startAt = new Date(date).getTime();
        await live.request(`${base}/appointments`, {
          ...options,
          body: {
            title,
            resource,
            startAt,
            endAt: startAt + Number(duration) * 60000,
          },
        });
      } else if (action === "follow")
        await live.request(`${base}/follow-ups`, {
          ...options,
          body: { dueAt: new Date(date).getTime(), text },
        });
      else if (action === "escalate")
        await live.request(`${base}/escalation`, {
          ...options,
          body: {
            enabled: !deal.escalated,
            reason: note || "Human review requested",
          },
        });
      await onSuccess();
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : t("revenue.deal.errorNotCompleted"),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <DialogShell title={t(actionTitleKeys[action])} onClose={onClose}>
      <form
        className="setup-form revenue-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {action === "edit" && (
          <>
            <div className="revenue-form-pair">
              <label htmlFor="deal-stage">
                {t("revenue.deal.stage")}
                <select
                  id="deal-stage"
                  value={stage}
                  onChange={(event) =>
                    setStage(event.target.value as DealStage)
                  }
                >
                  {Object.entries(stageLabels)
                    .filter(([value]) => !["won", "lost"].includes(value))
                    .map(([value]) => (
                      <option key={value} value={value}>
                        {t(revenueStageLabelKeys[value])}
                      </option>
                    ))}
                </select>
              </label>
              <label htmlFor="deal-currency">
                {t("revenue.deal.currency")}
                <select
                  id="deal-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {["USD", "EUR", "GBP", "CAD", "AUD"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="revenue-form-pair">
              <label htmlFor="deal-value">
                {t("revenue.deal.value")}
                <input
                  id="deal-value"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={t("revenue.deal.unknown")}
                />
              </label>
              <label htmlFor="deal-close-date">
                {t("revenue.deal.expectedClose")}
                <input
                  id="deal-close-date"
                  type="date"
                  value={closeDate}
                  onChange={(event) => setCloseDate(event.target.value)}
                />
              </label>
            </div>
            <label htmlFor="deal-product">
              {t("revenue.deal.relatedProduct")}
              <select
                id="deal-product"
                value={product}
                onChange={(event) => setProduct(event.target.value)}
              >
                <option value="">{t("revenue.deal.notLinked")}</option>
                {entries
                  .filter((entry) =>
                    ["product", "service"].includes(entry.kind),
                  )
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset className="deal-bant-fields">
              <legend>{t("revenue.deal.bantLegend")}</legend>
              <div className="revenue-form-pair">
                <label htmlFor="deal-budget">
                  {t("revenue.deal.budget", { currency })}
                  <input
                    id="deal-budget"
                    inputMode="decimal"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder={t("revenue.deal.unknown")}
                  />
                </label>
                <label htmlFor="deal-authority">
                  {t("revenue.deal.authority")}
                  <select
                    id="deal-authority"
                    value={authority}
                    onChange={(event) =>
                      setAuthority(event.target.value as typeof authority)
                    }
                  >
                    <option value="unknown">
                      {t("revenue.deal.authorityUnknown")}
                    </option>
                    <option value="decision_maker">
                      {t("revenue.deal.authorityDecisionMaker")}
                    </option>
                    <option value="influencer">
                      {t("revenue.deal.authorityInfluencer")}
                    </option>
                  </select>
                </label>
              </div>
              <label htmlFor="deal-need">
                {t("revenue.deal.need")}
                <textarea
                  id="deal-need"
                  rows={2}
                  maxLength={500}
                  value={need}
                  onChange={(event) => setNeed(event.target.value)}
                />
              </label>
              <label htmlFor="deal-timeline">
                {t("revenue.deal.timeline")}
                <input
                  id="deal-timeline"
                  type="date"
                  value={timeline}
                  onChange={(event) => setTimeline(event.target.value)}
                />
              </label>
            </fieldset>
            {sectorFields.length > 0 && (
              <fieldset className="deal-bant-fields">
                <legend>{t("revenue.deal.customFieldsLegend")}</legend>
                {sectorFields.map((field) => (
                  <label key={field.key} htmlFor={`deal-custom-${field.key}`}>
                    {field.label}
                    <input
                      id={`deal-custom-${field.key}`}
                      type={field.type}
                      inputMode={
                        field.type === "number" ? "decimal" : undefined
                      }
                      required={field.required}
                      value={custom[field.key] || ""}
                      onChange={(event) =>
                        setCustom({
                          ...custom,
                          [field.key]: event.target.value,
                        })
                      }
                    />
                  </label>
                ))}
              </fieldset>
            )}
            <label htmlFor="deal-campaign">
              {t("revenue.deal.campaign")}
              <input
                id="deal-campaign"
                value={campaign}
                onChange={(event) => setCampaign(event.target.value)}
                maxLength={120}
              />
            </label>
          </>
        )}
        {(action === "won" || action === "lost") && (
          <>
            <p className="dialog-description">
              {t("revenue.deal.outcomeDescription")}
            </p>
            <label htmlFor="outcome-reason">
              {action === "won"
                ? t("revenue.deal.winReasonLabel")
                : t("revenue.deal.lossReasonLabel")}
              <select
                id="outcome-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                <option value="fit">{t("revenue.deal.reasonFit")}</option>
                <option value="price">{t("revenue.deal.reasonPrice")}</option>
                <option value="timing">{t("revenue.deal.reasonTiming")}</option>
                <option value="trust">{t("revenue.deal.reasonTrust")}</option>
                <option value="competition">
                  {t("revenue.deal.reasonCompetition")}
                </option>
                <option value="service">
                  {t("revenue.deal.reasonService")}
                </option>
                <option value="no_response">
                  {t("revenue.deal.reasonNoResponse")}
                </option>
                <option value="other">{t("revenue.deal.reasonOther")}</option>
              </select>
            </label>
            <label htmlFor="outcome-note">
              {t("revenue.deal.learned")}
              <textarea
                id="outcome-note"
                maxLength={1000}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </>
        )}
        {(action === "payment" || action === "refund") && (
          <>
            <p className="dialog-description">
              {t("revenue.deal.receiptDescription", {
                currency: deal.currency,
              })}
            </p>
            <label htmlFor="receipt-amount">
              {action === "payment"
                ? t("revenue.deal.amountReceived")
                : t("revenue.deal.amountRefunded")}{" "}
              ({deal.currency})
              <input
                id="receipt-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
            <label htmlFor="receipt-reference">
              {t("revenue.deal.receiptReference")}
              <input
                id="receipt-reference"
                minLength={3}
                maxLength={120}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                required
              />
            </label>
            <label className="revenue-checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                required
              />
              {action === "payment"
                ? t("revenue.deal.verifiedReceipt")
                : t("revenue.deal.verifiedRefund")}
            </label>
          </>
        )}
        {action === "quote" && (
          <>
            <p className="dialog-description">
              {t("revenue.deal.quoteDescription")}
            </p>
            <label htmlFor="quote-product">
              {t("revenue.deal.approvedProduct")}
              <select
                id="quote-product"
                value={product}
                onChange={(event) => setProduct(event.target.value)}
                required
              >
                <option value="">{t("revenue.deal.chooseApprovedPrice")}</option>
                {eligible.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title} ·{" "}
                    {formatMoney(entry.priceMinor, entry.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="quote-quantity">
              {t("revenue.deal.quantity")}
              <input
                id="quote-quantity"
                type="number"
                min={1}
                max={1000}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </label>
            {!eligible.length && (
              <p className="workspace-form-error">
                {t("revenue.deal.needApprovedPrice")}
              </p>
            )}
          </>
        )}
        {action === "book" && (
          <>
            <p className="dialog-description">
              {t("revenue.deal.appointmentDescription")}
            </p>
            <label htmlFor="appointment-title">
              {t("revenue.deal.appointmentTitle")}
              <input
                id="appointment-title"
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>
            <label htmlFor="appointment-resource">
              {t("revenue.deal.appointmentResource")}
              <input
                id="appointment-resource"
                maxLength={80}
                value={resource}
                onChange={(event) => setResource(event.target.value)}
                required
              />
            </label>
            <label htmlFor="appointment-date">
              {t("revenue.deal.startTimezone", {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
              <input
                id="appointment-date"
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label htmlFor="appointment-duration">
              {t("revenue.deal.duration")}
              <select
                id="appointment-duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                <option value="15">{t("revenue.deal.minutes15")}</option>
                <option value="30">{t("revenue.deal.minutes30")}</option>
                <option value="60">{t("revenue.deal.hour1")}</option>
              </select>
            </label>
          </>
        )}
        {action === "follow" && (
          <>
            <p className="dialog-description">
              {t("revenue.deal.followUpDescription")}
            </p>
            <label htmlFor="followup-date">
              {t("revenue.deal.remindMe")}
              <input
                id="followup-date"
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label htmlFor="followup-text">
              {t("revenue.deal.draftToReview")}
              <textarea
                id="followup-text"
                rows={3}
                maxLength={1000}
                value={text}
                onChange={(event) => setText(event.target.value)}
                required
              />
            </label>
          </>
        )}
        {action === "escalate" && (
          <>
            <p className="dialog-description">
              {deal.escalated
                ? t("revenue.deal.escalateResolved")
                : t("revenue.deal.escalateActive")}
            </p>
            <label htmlFor="escalation-reason">
              {t("revenue.deal.reason")}
              <input
                id="escalation-reason"
                value={note}
                maxLength={300}
                minLength={3}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("revenue.deal.reasonPlaceholder")}
                required
              />
            </label>
          </>
        )}
        {error && (
          <p className="workspace-form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="closer-button closer-button-primary"
          disabled={pending || (action === "quote" && !eligible.length)}
        >
          {pending
            ? t("revenue.deal.buttonSaving")
            : action === "edit"
              ? t("revenue.deal.buttonSaveOpportunity")
              : action === "won" || action === "lost"
                ? action === "won"
                  ? t("revenue.deal.buttonConfirmWon")
                  : t("revenue.deal.buttonConfirmLost")
                : action === "quote"
                  ? t("revenue.deal.buttonPrepareQuote")
                  : action === "book"
                    ? t("revenue.deal.buttonRecordAppointment")
                    : action === "follow"
                      ? t("revenue.deal.buttonScheduleReminder")
                      : action === "escalate"
                        ? deal.escalated
                          ? t("revenue.deal.buttonResolveEscalation")
                          : t("revenue.deal.buttonEscalateToHuman")
                        : t("revenue.deal.buttonRecordAmount")}
          <Check size={15} />
        </button>
      </form>
    </DialogShell>
  );
}

export default function DealPanel() {
  const {
    live,
    state,
    selectedConversation: conversation,
    dispatch,
  } = useApp();
  const t = useStrings(revenueStrings);
  const { formatDate, formatDateTime } = useLocale();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DealDetail | null>(null);
  const [entries, setEntries] = useState<BrainEntry[]>([]);
  const [sectorFields, setSectorFields] = useState<SectorField[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [pending, setPending] = useState(false);
  const request = live?.request;
  const load = useCallback(async () => {
    if (!request || !conversation) return;
    try {
      const [detail, brain] = await Promise.all([
        request<DealDetail>(
          `/conversations/${encodeURIComponent(conversation.id)}/deal`,
        ),
        request<{ entries: BrainEntry[]; profile: BusinessProfile }>("/brain"),
      ]);
      setData(detail);
      setEntries(brain.entries);
      setSectorFields(brain.profile.sectorFields || []);
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : t("revenue.deal.readFailed"),
      );
    }
  }, [request, conversation?.id, t]);
  useEffect(() => {
    if (open) void load();
  }, [open, load, live?.snapshot]);
  if (!live || !conversation || conversation.intent === "spam") return null;
  const closed = data && ["won", "lost"].includes(data.deal.stage);
  const owner = live.snapshot.user.role === "owner";
  async function run(fn: () => Promise<void>) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await live!.refresh();
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : t("revenue.deal.tryAgain"),
      );
    } finally {
      setPending(false);
    }
  }
  function useDraft(text: string) {
    if (state.drafts[conversation!.id]?.trim()) {
      setError(t("revenue.deal.draftKept"));
      return;
    }
    dispatch({ type: "SET_DRAFT", conversationId: conversation!.id, text });
    setNotice(t("revenue.deal.actionAdded"));
  }
  return (
    <details
      className="deal-intelligence"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>{t("revenue.deal.heading")}</span>
        <span>
          {data ? (
            <>
              {t(revenueStageLabelKeys[data.deal.stage])} ·{" "}
              <Money
                minor={data.insight.indicativeValueMinor}
                currency={data.deal.currency}
              />
              {data.insight.hot ? ` · ${t("revenue.deal.hotLead")}` : ""}
            </>
          ) : (
            t("revenue.deal.panelSummary")
          )}
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <div className="deal-intelligence-content" tabIndex={0}>
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
        {!data ? (
          <button
            className="app-text-button"
            onClick={() => {
              void load();
            }}
          >
            {t("revenue.deal.readOpportunity")}
            <RefreshCw size={13} />
          </button>
        ) : (
          <>
            <div className="deal-insight-summary">
              <div>
                <strong>
                  {data.insight.score}
                  <small>{t("revenue.deal.leadScore")}</small>
                </strong>
                <p>
                  {Math.round(data.insight.probability * 100)}
                  {t("revenue.deal.estimatedWinChance")} ·{" "}
                  {data.insight.valueBasis}
                </p>
              </div>
              <div className="deal-quick-actions">
                {!closed && (
                  <button
                    className="app-text-button"
                    onClick={() => setAction("edit")}
                  >
                    {t("revenue.deal.editOpportunity")}
                    <ArrowRight size={13} />
                  </button>
                )}
                <label htmlFor="deal-more-actions" className="sr-only">
                  {t("revenue.deal.dealActions")}
                </label>
                <select
                  id="deal-more-actions"
                  disabled={action !== null || pending}
                  value=""
                  onChange={(event) => {
                    if (event.target.value)
                      setAction(event.target.value as Action);
                  }}
                >
                  <option value="">{t("revenue.deal.moreActions")}</option>
                  {!closed && (
                    <>
                      <option value="quote">
                        {t("revenue.deal.prepareQuote")}
                      </option>
                      <option value="book">
                        {t("revenue.deal.bookAppointment")}
                      </option>
                      <option value="follow">
                        {t("revenue.deal.scheduleFollowUp")}
                      </option>
                      <option value="won">{t("revenue.deal.markWon")}</option>
                      <option value="lost">{t("revenue.deal.markLost")}</option>
                      <option value="escalate">
                        {data.deal.escalated
                          ? t("revenue.deal.resolveEscalation")
                          : t("revenue.deal.escalateToHuman")}
                      </option>
                    </>
                  )}
                  {closed && data.deal.stage === "won" && owner && (
                    <>
                      <option value="payment">
                        {t("revenue.deal.recordPayment")}
                      </option>
                      <option value="refund">
                        {t("revenue.deal.recordRefund")}
                      </option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="deal-next-action">
              <span>{t("revenue.deal.nextAction")}</span>
              <p>{data.insight.nextAction}</p>
              {data.insight.nextDraft && (
                <button
                  className="app-text-button"
                  onClick={() => useDraft(data.insight.nextDraft!)}
                  disabled={pending}
                >
                  {t("revenue.deal.useAction")}
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
            {data.insight.risks.length > 0 && (
              <ul className="deal-risk-list">
                {data.insight.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            )}
            <details className="deal-evidence">
              <summary>{t("revenue.deal.whyScore")}</summary>
              <dl className="deal-bant-summary">
                {Object.entries(data.insight.bant).map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p>{data.insight.timeline}</p>
              {data.insight.signals.length ? (
                <ul>
                  {data.insight.signals.map((signal, index) => (
                    <li key={`${signal.messageId}-${index}`}>
                      <strong>{signal.label}</strong>
                      <span>“{signal.excerpt}”</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("revenue.deal.noSignals")}</p>
              )}
              <p>
                {t("revenue.deal.basis", {
                  basis: data.insight.probabilityBasis,
                  count: data.insight.sampleSize,
                  version: data.insight.version,
                })}
              </p>
            </details>
            {(data.quotes.length > 0 ||
              data.appointments.length > 0 ||
              data.tasks.length > 0 ||
              data.outcome) && (
              <details className="deal-evidence">
                <summary>{t("revenue.deal.history")}</summary>
                {data.outcome && (
                  <p>
                    <strong>
                      {data.outcome.outcome === "won"
                        ? t("revenue.deal.outcomeWon")
                        : t("revenue.deal.outcomeLost")}{" "}
                      · {data.outcome.reason.replace(/_/g, " ")}
                    </strong>
                    {data.outcome.note ? ` · ${data.outcome.note}` : ""}
                  </p>
                )}
                {data.payments.map((payment) => (
                  <p key={payment.id}>
                    {payment.kind === "refund"
                      ? t("revenue.deal.refund")
                      : t("revenue.deal.confirmedReceipt")}
                    :{" "}
                    <Money
                      minor={payment.amountMinor}
                      currency={data.deal.currency}
                    />{" "}
                    · <span className="ltr-isolate">{payment.reference}</span>
                  </p>
                ))}
                {data.quotes.map((quote) => (
                  <div className="deal-workflow-item" key={quote.id}>
                    <strong>
                      {t("revenue.deal.quote")} ·{" "}
                      <Money minor={quote.totalMinor} currency={quote.currency} />
                    </strong>
                    <p>
                      {quote.status} ·{" "}
                      {t("revenue.deal.quoteValidThrough", {
                        date: formatDate(quote.expiresAt),
                      })}
                    </p>
                    <div>
                      <button
                        className="app-text-button"
                        disabled={quote.expiresAt < Date.now() || pending}
                        onClick={() => useDraft(quote.text)}
                      >
                        {t("revenue.deal.useQuote")}
                      </button>
                      {quote.status === "draft" &&
                        quote.expiresAt > Date.now() && (
                          <button
                            className="app-text-button"
                            disabled={pending}
                            onClick={() => {
                              void run(async () => {
                                await request!(`/quotes/${quote.id}`, {
                                  method: "PATCH",
                                  body: { status: "accepted" },
                                });
                                setNotice(t("revenue.deal.quoteAccepted"));
                              });
                            }}
                          >
                            {t("revenue.deal.markAccepted")}
                          </button>
                        )}
                    </div>
                  </div>
                ))}
                {data.appointments.map((appointment) => (
                  <div className="deal-workflow-item" key={appointment.id}>
                    <strong>
                      {appointment.title} · {appointment.status}
                    </strong>
                    <p>
                      {formatDateTime(appointment.startAt)} ·{" "}
                      {appointment.resource} · {t("revenue.deal.internalBooking")}
                    </p>
                    <div>
                      <button
                        className="app-text-button"
                        disabled={pending}
                        onClick={() => {
                          void run(async () => {
                            const file = await request!<{
                              filename: string;
                              content: string;
                            }>(`/appointments/${appointment.id}/calendar`);
                            const url = URL.createObjectURL(
                              new Blob([file.content], {
                                type: "text/calendar",
                              }),
                            );
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = file.filename;
                            link.click();
                            URL.revokeObjectURL(url);
                          });
                        }}
                      >
                        <Download size={13} />
                        {t("revenue.deal.calendarFile")}
                      </button>
                      {appointment.status === "confirmed" && (
                        <button
                          className="app-text-button"
                          disabled={pending}
                          onClick={() => {
                            void run(async () => {
                              await request!(
                                `/appointments/${appointment.id}`,
                                {
                                  method: "PATCH",
                                  body: { status: "cancelled" },
                                },
                              );
                            });
                          }}
                        >
                          {t("revenue.deal.cancelBooking")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {data.tasks.map((task) => (
                  <div className="deal-workflow-item" key={task.id}>
                    <strong>
                      {t("revenue.deal.followUp", { status: task.status })}
                    </strong>
                    <p>
                      {formatDateTime(task.dueAt)} ·{" "}
                      {task.reason || t("revenue.deal.humanReviewRequired")}
                    </p>
                    {task.status === "ready" && (
                      <button
                        className="app-text-button"
                        disabled={pending}
                        onClick={() => {
                          if (state.drafts[conversation.id]?.trim()) {
                            setError(t("revenue.deal.draftKept"));
                            return;
                          }
                          void run(async () => {
                            await request!(`/sales-tasks/${task.id}/use`, {
                              method: "POST",
                              body: {},
                            });
                            setNotice(t("revenue.deal.followUpAdded"));
                          });
                        }}
                      >
                        {t("revenue.deal.useFollowUpDraft")}
                        <ArrowRight size={13} />
                      </button>
                    )}
                    {["ready", "scheduled"].includes(task.status) && (
                      <button
                        className="app-text-button"
                        disabled={pending}
                        onClick={() => {
                          void run(async () => {
                            await request!(`/sales-tasks/${task.id}`, {
                              method: "PATCH",
                              body: { status: "cancelled" },
                            });
                          });
                        }}
                      >
                        {t("revenue.deal.cancelReminder")}
                      </button>
                    )}
                  </div>
                ))}
              </details>
            )}
          </>
        )}
      </div>
      {action && data && (
        <DealAction
          action={action}
          data={data}
          entries={entries}
          sectorFields={sectorFields}
          onClose={() => setAction(null)}
          onSuccess={async () => {
            await live.refresh();
            await load();
            setNotice(t("revenue.deal.opportunityUpdated"));
          }}
        />
      )}
    </details>
  );
}
