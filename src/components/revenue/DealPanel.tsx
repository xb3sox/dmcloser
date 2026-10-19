import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DialogShell } from "../ui/Dialog";
import {
  money,
  parseMoney,
  stageLabels,
  type BrainEntry,
  type DealDetail,
  type DealStage,
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
const actionTitles: Record<Action, string> = {
  edit: "Confirm this opportunity",
  won: "Record a won deal",
  lost: "Record a lost deal",
  payment: "Record money received",
  refund: "Record a confirmed refund",
  quote: "Prepare an approved-price quote",
  book: "Record an appointment",
  follow: "Schedule a follow-up reminder",
  escalate: "Bring in a person",
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
  onClose,
  onSuccess,
}: {
  action: Action;
  data: DealDetail;
  entries: BrainEntry[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const { live } = useApp();
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
    data.insight.nextDraft ||
      "Just checking whether there is anything you would like clarified before your next step.",
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
          throw new Error(
            "Use non-negative amounts with no more than two decimals.",
          );
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
          throw new Error(
            "Enter the positive amount actually received or refunded.",
          );
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
          : "This action could not be completed.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <DialogShell title={actionTitles[action]} onClose={onClose}>
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
                Deal stage
                <select
                  id="deal-stage"
                  value={stage}
                  onChange={(event) =>
                    setStage(event.target.value as DealStage)
                  }
                >
                  {Object.entries(stageLabels)
                    .filter(([value]) => !["won", "lost"].includes(value))
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              <label htmlFor="deal-currency">
                Currency
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
                Confirmed deal value
                <input
                  id="deal-value"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Unknown"
                />
              </label>
              <label htmlFor="deal-close-date">
                Expected close
                <input
                  id="deal-close-date"
                  type="date"
                  value={closeDate}
                  onChange={(event) => setCloseDate(event.target.value)}
                />
              </label>
            </div>
            <label htmlFor="deal-product">
              Related product or service
              <select
                id="deal-product"
                value={product}
                onChange={(event) => setProduct(event.target.value)}
              >
                <option value="">Not linked</option>
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
              <legend>BANT · confirm what you actually know</legend>
              <div className="revenue-form-pair">
                <label htmlFor="deal-budget">
                  Budget ({currency})
                  <input
                    id="deal-budget"
                    inputMode="decimal"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder="Unknown"
                  />
                </label>
                <label htmlFor="deal-authority">
                  Decision authority
                  <select
                    id="deal-authority"
                    value={authority}
                    onChange={(event) =>
                      setAuthority(event.target.value as typeof authority)
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="decision_maker">Decision-maker</option>
                    <option value="influencer">Influencer</option>
                  </select>
                </label>
              </div>
              <label htmlFor="deal-need">
                Confirmed need
                <textarea
                  id="deal-need"
                  rows={2}
                  maxLength={500}
                  value={need}
                  onChange={(event) => setNeed(event.target.value)}
                />
              </label>
              <label htmlFor="deal-timeline">
                Confirmed purchase timeline
                <input
                  id="deal-timeline"
                  type="date"
                  value={timeline}
                  onChange={(event) => setTimeline(event.target.value)}
                />
              </label>
            </fieldset>
            <label htmlFor="deal-campaign">
              Campaign (team-entered, optional)
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
              This records a final commercial outcome. A won deal is not
              collected revenue. Outcome history cannot be silently overwritten.
            </p>
            <label htmlFor="outcome-reason">
              Primary {action === "won" ? "win" : "loss"} reason
              <select
                id="outcome-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                <option value="fit">Product / service fit</option>
                <option value="price">Price</option>
                <option value="timing">Timing</option>
                <option value="trust">Trust</option>
                <option value="competition">Competition</option>
                <option value="service">Service</option>
                <option value="no_response">No response</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label htmlFor="outcome-note">
              What did you learn? (optional)
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
              Owner-confirmed record in {deal.currency}. This does not charge or
              refund a card. Keep a real receipt or transaction reference.
            </p>
            <label htmlFor="receipt-amount">
              {action === "payment" ? "Amount received" : "Amount refunded"} (
              {deal.currency})
              <input
                id="receipt-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
            <label htmlFor="receipt-reference">
              Receipt / transaction reference
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
              I verified this {action === "payment" ? "receipt" : "refund"}{" "}
              outside DMCloser.
            </label>
          </>
        )}
        {action === "quote" && (
          <>
            <p className="dialog-description">
              Use a current approved catalog price. The quote is a draft, not a
              sent message or an accepted order. Valid for seven days.
            </p>
            <label htmlFor="quote-product">
              Approved product / service
              <select
                id="quote-product"
                value={product}
                onChange={(event) => setProduct(event.target.value)}
                required
              >
                <option value="">Choose an approved price</option>
                {eligible.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title} · {money(entry.priceMinor, entry.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="quote-quantity">
              Quantity
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
                Add and approve a product price in Business Brain first. Its
                currency must match this opportunity.
              </p>
            )}
          </>
        )}
        {action === "book" && (
          <>
            <p className="dialog-description">
              Record an internal appointment and export it to your calendar.
              Customer agreement and external calendar availability must be
              confirmed separately.
            </p>
            <label htmlFor="appointment-title">
              Appointment title
              <input
                id="appointment-title"
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>
            <label htmlFor="appointment-resource">
              Resource / team member
              <input
                id="appointment-resource"
                maxLength={80}
                value={resource}
                onChange={(event) => setResource(event.target.value)}
                required
              />
            </label>
            <label htmlFor="appointment-date">
              Start in your timezone (
              {Intl.DateTimeFormat().resolvedOptions().timeZone})
              <input
                id="appointment-date"
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label htmlFor="appointment-duration">
              Duration
              <select
                id="appointment-duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </label>
          </>
        )}
        {action === "follow" && (
          <>
            <p className="dialog-description">
              Create a reminder, not an automatic message. New activity, a
              closed deal, or escalation will cancel it. The provider reply
              window still applies.
            </p>
            <label htmlFor="followup-date">
              Remind me in my timezone
              <input
                id="followup-date"
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label htmlFor="followup-text">
              Draft to review
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
                ? "Resolving the escalation will not re-enable auto-send. Review the conversation before enabling it separately."
                : "Pause contact automation and scheduled follow-ups while a person takes over."}
            </p>
            <label htmlFor="escalation-reason">
              Reason
              <input
                id="escalation-reason"
                value={note}
                maxLength={300}
                minLength={3}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Needs a specialist"
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
            ? "Saving..."
            : action === "edit"
              ? "Save opportunity"
              : action === "won" || action === "lost"
                ? `Confirm ${action} outcome`
                : action === "quote"
                  ? "Prepare quote"
                  : action === "book"
                    ? "Record internal appointment"
                    : action === "follow"
                      ? "Schedule reminder"
                      : action === "escalate"
                        ? deal.escalated
                          ? "Resolve escalation"
                          : "Escalate to human"
                        : "Record confirmed amount"}
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
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DealDetail | null>(null);
  const [entries, setEntries] = useState<BrainEntry[]>([]);
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
        request<{ entries: BrainEntry[] }>("/brain"),
      ]);
      setData(detail);
      setEntries(brain.entries);
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not read this opportunity.",
      );
    }
  }, [request, conversation?.id]);
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
        failure instanceof Error ? failure.message : "Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  function useDraft(text: string) {
    if (state.drafts[conversation!.id]?.trim()) {
      setError("Your existing draft was kept. Finish or clear it first.");
      return;
    }
    dispatch({ type: "SET_DRAFT", conversationId: conversation!.id, text });
    setNotice("Action added to your draft. Review it before sending.");
  }
  return (
    <details
      className="deal-intelligence"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>Deal intelligence</span>
        <span>
          {data
            ? `${stageLabels[data.deal.stage]} · ${money(data.insight.indicativeValueMinor, data.deal.currency)}${data.insight.hot ? " · Hot lead" : ""}`
            : "Value, qualification & next action"}
        </span>
        <ChevronDown size={15} />
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
            Read opportunity
            <RefreshCw size={13} />
          </button>
        ) : (
          <>
            <div className="deal-insight-summary">
              <div>
                <strong>
                  {data.insight.score}
                  <small>/100 lead score</small>
                </strong>
                <p>
                  {Math.round(data.insight.probability * 100)}% estimated win
                  chance · {data.insight.valueBasis}
                </p>
              </div>
              <div className="deal-quick-actions">
                {!closed && (
                  <button
                    className="app-text-button"
                    onClick={() => setAction("edit")}
                  >
                    Edit opportunity
                    <ArrowRight size={13} />
                  </button>
                )}
                <label htmlFor="deal-more-actions" className="sr-only">
                  Deal actions
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
                  <option value="">More actions</option>
                  {!closed && (
                    <>
                      <option value="quote">Prepare quote</option>
                      <option value="book">Book appointment</option>
                      <option value="follow">Schedule follow-up</option>
                      <option value="won">Mark won</option>
                      <option value="lost">Mark lost</option>
                      <option value="escalate">
                        {data.deal.escalated
                          ? "Resolve escalation"
                          : "Escalate to human"}
                      </option>
                    </>
                  )}
                  {closed && data.deal.stage === "won" && owner && (
                    <>
                      <option value="payment">Record payment</option>
                      <option value="refund">Record refund</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="deal-next-action">
              <span>Next best action</span>
              <p>{data.insight.nextAction}</p>
              {data.insight.nextDraft && (
                <button
                  className="app-text-button"
                  onClick={() => useDraft(data.insight.nextDraft!)}
                  disabled={pending}
                >
                  Use suggested action
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
              <summary>Why this score? BANT & evidence</summary>
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
                <p>
                  No explicit buying signals detected. Qualification stays
                  unknown until confirmed.
                </p>
              )}
              <p>
                {data.insight.probabilityBasis}. {data.insight.sampleSize} stage
                outcomes. Version {data.insight.version}. Detected text signals
                currently use English patterns.
              </p>
            </details>
            {(data.quotes.length > 0 ||
              data.appointments.length > 0 ||
              data.tasks.length > 0 ||
              data.outcome) && (
              <details className="deal-evidence">
                <summary>Quotes, appointments & deal history</summary>
                {data.outcome && (
                  <p>
                    <strong>
                      {data.outcome.outcome === "won" ? "Won" : "Lost"} ·{" "}
                      {data.outcome.reason.replace(/_/g, " ")}
                    </strong>
                    {data.outcome.note ? ` · ${data.outcome.note}` : ""}
                  </p>
                )}
                {data.payments.map((payment) => (
                  <p key={payment.id}>
                    {payment.kind === "refund" ? "Refund" : "Confirmed receipt"}
                    : {money(payment.amountMinor, data.deal.currency)} ·{" "}
                    {payment.reference}
                  </p>
                ))}
                {data.quotes.map((quote) => (
                  <div className="deal-workflow-item" key={quote.id}>
                    <strong>
                      Quote · {money(quote.totalMinor, quote.currency)}
                    </strong>
                    <p>
                      {quote.status} · valid through{" "}
                      {new Date(quote.expiresAt).toLocaleDateString()}
                    </p>
                    <div>
                      <button
                        className="app-text-button"
                        disabled={quote.expiresAt < Date.now() || pending}
                        onClick={() => useDraft(quote.text)}
                      >
                        Use quote in draft
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
                                setNotice(
                                  "Quote acceptance recorded. This does not record a payment or won deal.",
                                );
                              });
                            }}
                          >
                            Mark accepted
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
                      {new Date(appointment.startAt).toLocaleString()} ·{" "}
                      {appointment.resource} · internal booking
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
                        Calendar file
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
                          Cancel booking
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {data.tasks.map((task) => (
                  <div className="deal-workflow-item" key={task.id}>
                    <strong>Follow-up · {task.status}</strong>
                    <p>
                      {new Date(task.dueAt).toLocaleString()} ·{" "}
                      {task.reason || "Human review required"}
                    </p>
                    {task.status === "ready" && (
                      <button
                        className="app-text-button"
                        disabled={pending}
                        onClick={() => {
                          if (state.drafts[conversation.id]?.trim()) {
                            setError(
                              "Your existing draft was kept. Finish or clear it first.",
                            );
                            return;
                          }
                          void run(async () => {
                            await request!(`/sales-tasks/${task.id}/use`, {
                              method: "POST",
                              body: {},
                            });
                            setNotice(
                              "Follow-up added to your draft for review.",
                            );
                          });
                        }}
                      >
                        Use follow-up draft
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
                        Cancel reminder
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
          onClose={() => setAction(null)}
          onSuccess={async () => {
            await live.refresh();
            await load();
            setNotice("Opportunity updated.");
          }}
        />
      )}
    </details>
  );
}
