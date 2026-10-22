import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useLocale, useStrings } from "@/context/LocaleContext";
import { DialogShell } from "@/components/ui/Dialog";
import Money from "@/components/ui/Money";
import { revenueStrings, revenueStageLabelKeys } from "@/i18n/surfaces/revenue";
import { revenuePageStrings } from "@/i18n/surfaces/revenuePage";
import type {
  RecoveryEntry,
  RecoveryList,
  RevenueOverview,
} from "@/types/revenue";
import "./revenue.css";

export default function RevenueView() {
  const { live, dispatch } = useApp();
  const { formatDate } = useLocale();
  const t = useStrings(revenuePageStrings);
  const tRevenue = useStrings(revenueStrings);
  const [currency, setCurrency] = useState("USD");
  const [data, setData] = useState<RevenueOverview | null>(null);
  const [recovery, setRecovery] = useState<RecoveryList | null>(null);
  const [error, setError] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("open");
  const [dismissing, setDismissing] = useState<RecoveryEntry | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissError, setDismissError] = useState("");
  const [pending, setPending] = useState(false);
  const requestNumber = useRef(0);
  const request = live?.request;
  const load = useCallback(async () => {
    if (!request) return;
    const number = ++requestNumber.current;
    setLoading(true);
    setError("");
    try {
      const next = await request<RevenueOverview>(
        `/revenue?currency=${currency}`,
      );
      if (number === requestNumber.current) setData(next);
    } catch (failure) {
      if (number === requestNumber.current)
        setError(
          failure instanceof Error
            ? failure.message
            : t("revenue.page.error.load"),
        );
    } finally {
      if (number === requestNumber.current) setLoading(false);
    }
  }, [request, currency, t]);
  const loadRecovery = useCallback(async () => {
    if (!request) return;
    try {
      setRecovery(await request<RecoveryList>("/revenue/recovery"));
      setRecoveryError("");
    } catch (failure) {
      setRecoveryError(
        failure instanceof Error
          ? failure.message
          : t("revenue.page.error.recoveryLoad"),
      );
    }
  }, [request, t]);
  useEffect(() => {
    void load();
    void loadRecovery();
  }, [load, loadRecovery, live?.snapshot]);
  async function dismiss() {
    if (!live || !dismissing) return;
    setPending(true);
    setDismissError("");
    try {
      await live.request(
        `/revenue/recovery/${encodeURIComponent(dismissing.dealId)}/dismiss`,
        { method: "POST", body: { reason: dismissReason.trim() } },
      );
      setDismissing(null);
      setDismissReason("");
      await loadRecovery();
    } catch (failure) {
      setDismissError(
        failure instanceof Error
          ? failure.message
          : t("revenue.page.error.dismiss"),
      );
    } finally {
      setPending(false);
    }
  }
  async function restore(dealId: string) {
    if (!live) return;
    setPending(true);
    setRecoveryError("");
    try {
      await live.request(
        `/revenue/recovery/${encodeURIComponent(dealId)}/restore`,
        { method: "POST" },
      );
      await loadRecovery();
    } catch (failure) {
      setRecoveryError(
        failure instanceof Error
          ? failure.message
          : t("revenue.page.error.restore"),
      );
    } finally {
      setPending(false);
    }
  }
  if (!live) return null;
  const opportunities = (data?.opportunities || []).filter(
    (item) =>
      filter === "all" ||
      (filter === "hot" && item.insight.hot) ||
      (filter === "open" && !["won", "lost"].includes(item.deal.stage)),
  );
  const receipts = data?.verifiedReceipts || [];
  const attributedMinor =
    data?.attribution.reduce((sum, item) => sum + item.revenueMinor, 0) || 0;
  return (
    <section className="revenue-page" aria-labelledby="revenue-heading">
      <header className="revenue-page-header">
        <div>
          <span className="app-section-label">{t("revenue.page.label")}</span>
          <h1 id="revenue-heading">{t("revenue.page.title")}</h1>
          <p>{t("revenue.page.subtitle")}</p>
        </div>
        <div className="revenue-header-controls">
          <label htmlFor="revenue-currency" className="sr-only">
            {t("revenue.page.currencyLabel")}
          </label>
          <select
            id="revenue-currency"
            value={currency}
            onChange={(event) => {
              requestNumber.current++;
              setData(null);
              setCurrency(event.target.value);
            }}
          >
            {["USD", "EUR", "GBP", "CAD", "AUD"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button
            className="app-icon-button"
            aria-label={t("revenue.page.refresh")}
            disabled={loading}
            onClick={() => {
              void load();
              void loadRecovery();
            }}
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>
      {error && (
        <p className="workspace-form-error" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p className="revenue-loading" role="status">
          {loading ? t("revenue.page.loading") : t("revenue.page.noData")}
        </p>
      ) : (
        <>
          <dl className="revenue-totals">
            <div>
              <dt>{t("revenue.page.verifiedTitle")}</dt>
              <dd>
                <Money minor={data.revenueMinor} currency={currency} />
              </dd>
              <dd className="revenue-total-note">
                {t("revenue.page.verifiedNote")}
              </dd>
              <dd className="revenue-total-note">
                {receipts.length === 1
                  ? t("revenue.page.receiptOne", { count: receipts.length })
                  : t("revenue.page.receiptMany", { count: receipts.length })}{" "}
                · <Money minor={data.reversedMinor} currency={currency} />{" "}
                {t("revenue.page.reversed")}
              </dd>
            </div>
            <div>
              <dt>{t("revenue.page.potentialTitle")}</dt>
              <dd>
                <Money minor={data.pipelineMinor} currency={currency} />
              </dd>
              <dd className="revenue-total-note">
                {t("revenue.page.potentialNote")}
              </dd>
              <dd className="revenue-total-note">
                {t("revenue.page.forecastLabel")}{" "}
                <Money minor={data.forecastMinor} currency={currency} /> ·{" "}
                {t("revenue.page.estimateNote")}
              </dd>
            </div>
            <div>
              <dt>{t("revenue.page.attributedTitle")}</dt>
              <dd>
                <Money minor={attributedMinor} currency={currency} />
              </dd>
              <dd className="revenue-total-note">
                {t("revenue.page.attributedNote")}
              </dd>
              <dd className="revenue-total-note">
                {t("revenue.page.attributedDisclaimer")}
              </dd>
            </div>
          </dl>
          <div className="revenue-context">
            <p>
              <strong>{data.hotLeads}</strong> {t("revenue.page.hotLeads")}{" "}
              <span className="revenue-separator">/</span>{" "}
              <strong>{data.qualifiedLeads}</strong>{" "}
              {t("revenue.page.qualified")}{" "}
              <span className="revenue-separator">/</span>{" "}
              <strong>
                {data.conversionRate === null
                  ? t("revenue.page.noConversionRate")
                  : t("revenue.page.conversionRate", {
                      rate: Math.round(data.conversionRate * 100),
                    })}
              </strong>
            </p>
            <p>
              {t("revenue.page.wonLost", {
                won: data.wonDeals,
                lost: data.lostDeals,
              })}{" "}
              <Money minor={data.wonMinor} currency={currency} />{" "}
              {t("revenue.page.wonValue")}
            </p>
          </div>
          <section
            className="revenue-section"
            aria-labelledby="verified-heading"
          >
            <div className="revenue-section-heading">
              <h2 id="verified-heading">{t("revenue.page.receiptsHeading")}</h2>
            </div>
            {receipts.length ? (
              receipts.map((receipt) => (
                <div className="deal-workflow-item" key={receipt.id}>
                  <strong>
                    {receipt.kind === "refund"
                      ? t("revenue.page.kindRefund")
                      : t("revenue.page.kindReceipt")}{" "}
                    ·{" "}
                    <Money minor={receipt.amountMinor} currency={currency} /> ·{" "}
                    {receipt.name}
                  </strong>
                  <p>
                    {t("revenue.page.referenceLabel")}{" "}
                    <span className="ltr-isolate">{receipt.reference}</span> ·{" "}
                    {formatDate(receipt.occurredAt)} ·{" "}
                    {receipt.kind === "refund"
                      ? t("revenue.page.reversedAgainst")
                      : t("revenue.page.ownerConfirmed")}
                  </p>
                </div>
              ))
            ) : (
              <div className="revenue-empty">
                <h3>{t("revenue.page.receiptsEmptyTitle")}</h3>
                <p>{t("revenue.page.receiptsEmptyText")}</p>
              </div>
            )}
            <p className="revenue-method-note">
              {t("revenue.page.receiptsMethod")}
            </p>
          </section>
          <section
            className="revenue-section"
            aria-labelledby="recovery-heading"
          >
            <div className="revenue-section-heading">
              <h2 id="recovery-heading">{t("revenue.page.recoveryHeading")}</h2>
              <span>{t("revenue.page.recoveryTag")}</span>
            </div>
            {recoveryError && (
              <p className="workspace-form-error" role="alert">
                {recoveryError}
              </p>
            )}
            <p className="revenue-method-note">
              {recovery?.notice ?? t("revenue.page.recoveryNotice")}
            </p>
            {recovery?.entries.length ? (
              recovery.entries.map((entry) => (
                <div className="deal-workflow-item" key={entry.dealId}>
                  <strong>
                    {entry.name} ·{" "}
                    {tRevenue(revenueStageLabelKeys[entry.stage])} ·{" "}
                    {t("revenue.page.staleDays", { count: entry.daysStale })}
                  </strong>
                  <p>
                    {t("revenue.page.entryLine", {
                      platform: entry.platform,
                      reason: entry.reason,
                    })}{" "}
                    {t("revenue.page.estimatedValue")}{" "}
                    <Money
                      minor={entry.valueMinor}
                      currency={entry.currency}
                    />
                    . {t("revenue.page.nextAction")} {entry.nextAction}
                  </p>
                  <div>
                    <button
                      className="app-text-button"
                      onClick={() =>
                        dispatch({
                          type: "SELECT_CONVERSATION",
                          id: entry.conversationId,
                        })
                      }
                    >
                      {t("revenue.page.openConversation")}
                      <ArrowUpRight size={13} />
                    </button>
                    <button
                      className="app-text-button"
                      disabled={pending}
                      onClick={() => {
                        setDismissing(entry);
                        setDismissReason("");
                        setDismissError("");
                      }}
                    >
                      {t("revenue.page.dismiss")}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="revenue-empty">
                <h3>{t("revenue.page.recoveryEmptyTitle")}</h3>
                <p>{t("revenue.page.recoveryEmptyText")}</p>
              </div>
            )}
            {recovery?.dismissed.length ? (
              <details className="revenue-disclosure">
                <summary>
                  {t("revenue.page.dismissedCount", {
                    count: recovery.dismissed.length,
                  })}
                </summary>
                {recovery.dismissed.map((entry) => (
                  <div className="deal-workflow-item" key={entry.dealId}>
                    <strong>
                      {entry.name} ·{" "}
                      {tRevenue(revenueStageLabelKeys[entry.stage])}
                    </strong>
                    <p>{t("revenue.page.dismissedText")}</p>
                    <div>
                      <button
                        className="app-text-button"
                        disabled={pending}
                        onClick={() => {
                          void restore(entry.dealId);
                        }}
                      >
                        {t("revenue.page.restore")}
                      </button>
                    </div>
                  </div>
                ))}
              </details>
            ) : null}
          </section>
          <section
            className="revenue-section"
            aria-labelledby="pipeline-heading"
          >
            <div className="revenue-section-heading">
              <h2 id="pipeline-heading">
                {t("revenue.page.opportunitiesHeading")}
              </h2>
              <label htmlFor="pipeline-filter" className="sr-only">
                {t("revenue.page.filterLabel")}
              </label>
              <select
                id="pipeline-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="open">{t("revenue.page.filterOpen")}</option>
                <option value="hot">{t("revenue.page.filterHot")}</option>
                <option value="all">{t("revenue.page.filterAll")}</option>
              </select>
            </div>
            {opportunities.length ? (
              <div className="opportunity-list">
                {opportunities.map(({ deal, insight, name, platform }) => (
                  <button
                    key={deal.id}
                    className="opportunity-row"
                    onClick={() =>
                      dispatch({
                        type: "SELECT_CONVERSATION",
                        id: deal.conversationId,
                      })
                    }
                  >
                    <div>
                      <span className="opportunity-name">
                        {name}
                        {insight.hot && (
                          <span className="revenue-hot-label">
                            {t("revenue.page.hotLead")}
                          </span>
                        )}
                      </span>
                      <span>
                        {tRevenue(revenueStageLabelKeys[deal.stage])} · {platform} ·{" "}
                        {deal.expectedClose
                          ? t("revenue.page.targetClose", {
                              date: deal.expectedClose,
                            })
                          : t("revenue.page.closeUnknown")}
                      </span>
                    </div>
                    <div className="opportunity-amount">
                      <strong>
                        <Money
                          minor={insight.indicativeValueMinor}
                          currency={deal.currency}
                        />
                      </strong>
                      <span>
                        {t("revenue.page.winChance", {
                          rate: Math.round(insight.probability * 100),
                        })}
                      </span>
                    </div>
                    <ArrowUpRight size={17} />
                    <p>{insight.nextAction}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="revenue-empty">
                <h3>
                  {filter === "hot"
                    ? t("revenue.page.emptyHotTitle")
                    : t("revenue.page.emptyPipelineTitle")}
                </h3>
                <p>
                  {filter === "hot"
                    ? t("revenue.page.emptyHotText")
                    : t("revenue.page.emptyPipelineText")}
                </p>
                <button
                  className="app-text-button"
                  onClick={() => dispatch({ type: "SET_VIEW", view: "inbox" })}
                >
                  {t("revenue.page.openInbox")}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            <p className="revenue-method-note">
              {t("revenue.page.forecastThrough", {
                date: formatDate(data.forecastTo),
                unknown: data.unknownValueDeals,
                undated: data.undatedDeals,
              })}
            </p>
          </section>
          <details className="revenue-disclosure">
            <summary>{t("revenue.page.winLossSummary")}</summary>
            <div className="revenue-analysis-columns">
              <section>
                <h3>{t("revenue.page.closedDealHeading")}</h3>
                {data.reasons.length ? (
                  <ul>
                    {data.reasons.map((reason) => (
                      <li key={`${reason.outcome}-${reason.reason}`}>
                        <span>
                          {reason.reason.replace(/_/g, " ")} · {reason.outcome}
                        </span>
                        <strong>{reason.count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t("revenue.page.noReasons")}</p>
                )}
              </section>
              <section>
                <h3>{t("revenue.page.attributedHeading")}</h3>
                {data.attribution.length ? (
                  <ul>
                    {data.attribution.map((item) => (
                      <li key={`${item.source}-${item.campaign}`}>
                        <span>
                          {item.source}
                          {item.campaign ? ` / ${item.campaign}` : ""}
                          <small>
                            {t("revenue.page.firstTouchWins", {
                              count: item.wonDeals,
                            })}
                          </small>
                        </span>
                        <strong>
                          <Money minor={item.revenueMinor} currency={currency} />
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t("revenue.page.noAttribution")}</p>
                )}
                <p className="revenue-method-note">
                  {t("revenue.page.attributionMethod")}
                </p>
              </section>
            </div>
          </details>
          <details className="revenue-disclosure">
            <summary>{t("revenue.page.learningSummary")}</summary>
            <p>
              {t("revenue.page.learningCounts", {
                outcomes: data.learning.samples,
                helpful: data.learning.successfulReplies,
              })}
            </p>
            {data.learning.lessons.length ? (
              <ul className="revenue-lessons">
                {data.learning.lessons.map((lesson) => (
                  <li key={lesson}>{lesson}</li>
                ))}
              </ul>
            ) : (
              <p>{t("revenue.page.noLessons")}</p>
            )}
            <p className="revenue-method-note">
              {t("revenue.page.learningMethod")}
            </p>
          </details>
        </>
      )}
      {dismissing && (
        <DialogShell
          title={t("revenue.page.dismissDialogTitle")}
          onClose={() => setDismissing(null)}
        >
          <form
            className="setup-form revenue-form"
            onSubmit={(event) => {
              event.preventDefault();
              void dismiss();
            }}
          >
            <p className="dialog-description">
              {t("revenue.page.dismissDialogText", { name: dismissing.name })}
            </p>
            <label htmlFor="recovery-dismiss-reason">
              {t("revenue.page.dismissReasonLabel")}
              <textarea
                id="recovery-dismiss-reason"
                value={dismissReason}
                minLength={3}
                maxLength={300}
                rows={3}
                required
                onChange={(event) => setDismissReason(event.target.value)}
                placeholder={t("revenue.page.dismissReasonPlaceholder")}
              />
            </label>
            {dismissError && (
              <p className="workspace-form-error" role="alert">
                {dismissError}
              </p>
            )}
            <button
              className="closer-button closer-button-primary"
              disabled={pending || dismissReason.trim().length < 3}
            >
              {pending
                ? t("revenue.page.dismissing")
                : t("revenue.page.dismissAction")}
            </button>
          </form>
        </DialogShell>
      )}
    </section>
  );
}
