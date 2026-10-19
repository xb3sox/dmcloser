import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { money, stageLabels, type RevenueOverview } from "@/types/revenue";
import "./revenue.css";

export default function RevenueView() {
  const { live, dispatch } = useApp();
  const [currency, setCurrency] = useState("USD");
  const [data, setData] = useState<RevenueOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("open");
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
            : "Revenue could not be loaded.",
        );
    } finally {
      if (number === requestNumber.current) setLoading(false);
    }
  }, [request, currency]);
  useEffect(() => {
    void load();
  }, [load, live?.snapshot]);
  if (!live) return null;
  const opportunities = (data?.opportunities || []).filter(
    (item) =>
      filter === "all" ||
      (filter === "hot" && item.insight.hot) ||
      (filter === "open" && !["won", "lost"].includes(item.deal.stage)),
  );
  return (
    <section className="revenue-page" aria-labelledby="revenue-heading">
      <header className="revenue-page-header">
        <div>
          <span className="app-section-label">Revenue intelligence</span>
          <h1 id="revenue-heading">A clearer path to your next sale.</h1>
          <p>Real outcomes. Explicit assumptions. One next move.</p>
        </div>
        <div className="revenue-header-controls">
          <label htmlFor="revenue-currency" className="sr-only">
            Revenue currency
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
            aria-label="Refresh revenue"
            disabled={loading}
            onClick={() => {
              void load();
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
          {loading ? "Reading your pipeline..." : "No revenue data yet."}
        </p>
      ) : (
        <>
          <dl className="revenue-totals">
            <div>
              <dt>Revenue received</dt>
              <dd>{money(data.revenueMinor, currency)}</dd>
              <dd className="revenue-total-note">
                This UTC month · owner-confirmed, net of refunds
              </dd>
            </div>
            <div>
              <dt>30-day revenue forecast</dt>
              <dd>{money(data.forecastMinor, currency)}</dd>
              <dd className="revenue-total-note">
                Weighted open deals · estimated, not guaranteed
              </dd>
            </div>
            <div>
              <dt>Open pipeline value</dt>
              <dd>{money(data.pipelineMinor, currency)}</dd>
              <dd className="revenue-total-note">
                Confirmed values + explicitly indicative catalog prices
              </dd>
            </div>
          </dl>
          <div className="revenue-context">
            <p>
              <strong>{data.hotLeads}</strong> hot leads <span>/</span>
              <strong>{data.qualifiedLeads}</strong> qualified <span>/</span>
              <strong>
                {data.conversionRate === null
                  ? "No closed-deal rate"
                  : `${Math.round(data.conversionRate * 100)}% closed-deal conversion`}
              </strong>
            </p>
            <p>
              {data.wonDeals} won · {data.lostDeals} lost this month ·{" "}
              {money(data.wonMinor, currency)} won value, not cash.
            </p>
          </div>
          <section
            className="revenue-section"
            aria-labelledby="pipeline-heading"
          >
            <div className="revenue-section-heading">
              <h2 id="pipeline-heading">Your next opportunities</h2>
              <label htmlFor="pipeline-filter" className="sr-only">
                Filter opportunities
              </label>
              <select
                id="pipeline-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="open">Open pipeline</option>
                <option value="hot">Hot leads</option>
                <option value="all">All opportunities</option>
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
                          <span className="revenue-hot-label">Hot lead</span>
                        )}
                      </span>
                      <span>
                        {stageLabels[deal.stage]} · {platform} ·{" "}
                        {deal.expectedClose
                          ? `Target ${deal.expectedClose}`
                          : "Close date unknown"}
                      </span>
                    </div>
                    <div className="opportunity-amount">
                      <strong>
                        {money(insight.indicativeValueMinor, deal.currency)}
                      </strong>
                      <span>
                        {Math.round(insight.probability * 100)}% estimated win
                        chance
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
                    ? "No confirmed hot leads yet."
                    : "Your pipeline starts with a conversation."}
                </h3>
                <p>
                  {filter === "hot"
                    ? "Scores need explicit buying signals and recent interest. No urgency is invented."
                    : "Inbound leads create opportunities automatically. Confirm value and qualification from the deal panel in your inbox."}
                </p>
                <button
                  className="app-text-button"
                  onClick={() => dispatch({ type: "SET_VIEW", view: "inbox" })}
                >
                  Open inbox
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            <p className="revenue-method-note">
              Forecast through {new Date(data.forecastTo).toLocaleDateString()}.{" "}
              {data.unknownValueDeals} open deals have unknown value;{" "}
              {data.undatedDeals} have no close date. Unknowns are excluded from
              dated forecasts. No cross-currency conversion.
            </p>
          </section>
          <details className="revenue-disclosure">
            <summary>Win/loss reasons & revenue attribution</summary>
            <div className="revenue-analysis-columns">
              <section>
                <h3>What closed the deal?</h3>
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
                  <p>
                    Record a won or lost outcome with a reason to start
                    learning.
                  </p>
                )}
              </section>
              <section>
                <h3>Where revenue started</h3>
                {data.attribution.length ? (
                  <ul>
                    {data.attribution.map((item) => (
                      <li key={`${item.source}-${item.campaign}`}>
                        <span>
                          {item.source}
                          {item.campaign ? ` / ${item.campaign}` : ""}
                          <small>First touch · {item.wonDeals} wins</small>
                        </span>
                        <strong>{money(item.revenueMinor, currency)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No confirmed receipts for this currency and period.</p>
                )}
                <p className="revenue-method-note">
                  Channel attribution is descriptive. Campaigns are
                  team-entered. No claim that AI or an ad caused a sale.
                </p>
              </section>
            </div>
          </details>
          <details className="revenue-disclosure">
            <summary>What your business is learning</summary>
            <p>
              {data.learning.samples} recorded outcomes for this industry mode ·{" "}
              {data.learning.successfulReplies} replies marked helpful by your
              team.
            </p>
            {data.learning.lessons.length ? (
              <ul className="revenue-lessons">
                {data.learning.lessons.map((lesson) => (
                  <li key={lesson}>{lesson}</li>
                ))}
              </ul>
            ) : (
              <p>
                Not enough repeated evidence for a lesson yet. Missing data is
                not a reason to invent one.
              </p>
            )}
            <p className="revenue-method-note">
              Win chance uses labelled stage/qualification heuristics until a
              stage has at least 10 historical outcomes. Cohort rates are
              observational and uncalibrated; learned patterns never approve
              business facts or enable auto-send.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
