import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Search, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useStrings } from "@/context/LocaleContext";
import { inboxStrings } from "@/i18n/surfaces/inbox";
import ConversationItem from "./ConversationItem";
import type { ConversionStatus, InboxChannel, Intent } from "@/types";
import DevelopmentSimulator from "./workspace/DevelopmentSimulator";

const filters = [
  { label: "inbox.intentAll", value: "all" },
  { label: "inbox.intentBuy", value: "buy" },
  { label: "inbox.intentQuestion", value: "question" },
  { label: "inbox.intentSpam", value: "spam" },
] as const satisfies { label: string; value: Intent | "all" }[];

type TimeRange = "all" | "24h" | "7d" | "30d";

const leadStatuses = [
  { label: "inbox.leadStatusAll", value: "all" },
  { label: "inbox.leadStatusNew", value: "new" },
  { label: "inbox.leadStatusEngaged", value: "engaged" },
  { label: "inbox.leadStatusQualified", value: "qualified" },
  { label: "inbox.leadStatusConverted", value: "converted" },
  { label: "inbox.leadStatusLost", value: "lost" },
] as const satisfies { label: string; value: ConversionStatus | "all" }[];

const timeRanges = [
  { label: "inbox.timeRangeAll", value: "all", since: 0 },
  { label: "inbox.timeRange24h", value: "24h", since: 24 * 3600000 },
  { label: "inbox.timeRange7d", value: "7d", since: 7 * 86400000 },
  { label: "inbox.timeRange30d", value: "30d", since: 30 * 86400000 },
] as const satisfies { label: string; value: TimeRange; since: number }[];

export default function InboxView() {
  const { state, dispatch, mode, live } = useApp();
  const t = useStrings(inboxStrings);
  const [intent, setIntent] = useState<Intent | "all">("all");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [leadStatus, setLeadStatus] = useState<ConversionStatus | "all">(
    "all",
  );
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Sync active filters with live workspace service if in live mode.
  // The client-side filter below serves as the render guard for the page just fetched.
  useEffect(() => {
    if (mode === "live" && live) {
      live.setFilters?.({
        channel: state.channel,
        intent,
        unreadOnly,
        leadStatus,
        assignee: assigneeFilter,
        timeRange,
        search,
      });
    }
  }, [state.channel, intent, unreadOnly, leadStatus, assigneeFilter, timeRange, search, mode, live]);

  useEffect(() => {
    if (
      state.currentView !== "inbox" ||
      !state.selectedConversationId ||
      !window.matchMedia("(max-width: 959px)").matches
    )
      return;
    const selectedRow = panelRef.current?.querySelector<HTMLButtonElement>(
      '.conversation-row[aria-pressed="true"]',
    );
    selectedRow?.focus({ preventScroll: true });
  }, [state.currentView, state.selectedConversationId]);
  const members = live?.snapshot?.members || [];

  // ⚡ Bolt Optimization: Memoize conversation filtering/sorting and short-circuit search
  // checks. Avoids mapping and joining message texts into large strings on every keystroke,
  // preventing heavy array/string allocations (O(N*M)) per render.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const since =
      timeRanges.find((range) => range.value === timeRange)?.since ?? 0;
    const now = Date.now();

    return state.conversations
      .filter((conversation) => {
        if (state.channel !== "all" && conversation.platform !== state.channel) {
          return false;
        }
        if (intent !== "all" && conversation.intent !== intent) {
          return false;
        }
        if (unreadOnly && !conversation.unread) {
          return false;
        }
        if (leadStatus !== "all" && conversation.conversionStatus !== leadStatus) {
          return false;
        }
        if (assigneeFilter !== "all") {
          if (assigneeFilter === "unassigned") {
            if (conversation.assigneeUserId) return false;
          } else if (conversation.assigneeUserId !== assigneeFilter) {
            return false;
          }
        }
        if (since && now - conversation.lastMessageTime > since) {
          return false;
        }
        if (query) {
          const tokens = query.split(/\s+/).filter(Boolean);
          const contactLower = conversation.contactName.toLowerCase();
          const lastMsgLower = conversation.lastMessage.toLowerCase();
          const notesLower = conversation.leadNotes.toLowerCase();
          return tokens.every(
            (token) =>
              contactLower.includes(token) ||
              lastMsgLower.includes(token) ||
              notesLower.includes(token) ||
              conversation.messages.some((message) =>
                message.text.toLowerCase().includes(token),
              ),
          );
        }
        return true;
      })
      .sort((first, second) => second.lastMessageTime - first.lastMessageTime);
  }, [
    state.conversations,
    state.channel,
    intent,
    unreadOnly,
    leadStatus,
    assigneeFilter,
    timeRange,
    search,
  ]);

  return (
    <section
      className="inbox-panel"
      ref={panelRef}
      aria-labelledby="inbox-heading"
    >
      <header className="inbox-panel-header">
        <div className="inbox-title-row">
          <h1 id="inbox-heading">
            {t("inbox.title")}
            <span aria-hidden="true">{filtered.length}</span>
          </h1>
          <button
            className={`unread-filter ${unreadOnly ? "is-selected" : ""}`}
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            {t("inbox.unread")}
          </button>
        </div>
        <div className="inbox-search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t("inbox.searchLabel")}
            placeholder={t("inbox.searchPlaceholder")}
            type="search"
            onKeyDown={(event) => {
              if (event.key === "Escape" && search) {
                event.preventDefault();
                setSearch("");
              }
            }}
          />
          {search && (
            <button
              aria-label={t("inbox.clearSearch")}
              onClick={() => {
                setSearch("");
                searchRef.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="inbox-mobile-channel">
          <label htmlFor="inbox-channel">{t("inbox.channel")}</label>
          <select
            id="inbox-channel"
            value={state.channel}
            onChange={(event) =>
              dispatch({
                type: "SET_CHANNEL",
                channel: event.target.value as InboxChannel,
              })
            }
          >
            <option value="all">{t("inbox.allChannels")}</option>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <div
          className="inbox-intent-filters"
          role="group"
          aria-label={t("inbox.intentGroupLabel")}
        >
          {filters.map((filter) => (
            <button
              key={filter.value}
              aria-pressed={intent === filter.value}
              onClick={() => setIntent(filter.value)}
            >
              {t(filter.label)}
            </button>
          ))}
        </div>
        <div className="inbox-filters">
          <label htmlFor="inbox-lead-status">
            {t("inbox.leadStatus")}
            <select
              id="inbox-lead-status"
              value={leadStatus}
              onChange={(event) =>
                setLeadStatus(event.target.value as ConversionStatus | "all")
              }
            >
              {leadStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {t(status.label)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="inbox-assignee">
            {t("inbox.assignee")}
            <select
              id="inbox-assignee"
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
            >
              <option value="all">{t("inbox.assigneeAll")}</option>
              <option value="unassigned">{t("inbox.assigneeUnassigned")}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="inbox-time-range">
            {t("inbox.timeRange")}
            <select
              id="inbox-time-range"
              value={timeRange}
              onChange={(event) =>
                setTimeRange(event.target.value as TimeRange)
              }
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {t(range.label)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="app-field-help">{t("inbox.filtersHelp")}</p>
      </header>
      <div className="inbox-conversation-list" aria-label={t("inbox.listLabel")}>
        {filtered.length ? (
          <>
            {filtered.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
              />
            ))}
            {mode === "live" && live?.hasMore && (
              <button
                className="app-small-button"
                onClick={() => {
                  void live.loadMore();
                }}
              >
                {t("inbox.loadMore")}
              </button>
            )}
          </>
        ) : (
          <div className="app-empty-state">
            <Inbox size={27} strokeWidth={1.4} />
            <h2>{t("inbox.emptyTitle")}</h2>
            <p>
              {mode === "live" && state.conversations.length === 0
                ? t("inbox.emptyConnect")
                : t("inbox.emptyClear")}
            </p>
            {mode === "live" && state.conversations.length === 0 && (
              <>
                <button
                  className="app-small-button"
                  onClick={() =>
                    dispatch({ type: "SET_VIEW", view: "settings" })
                  }
                >
                  {t("inbox.connectAccount")}
                </button>
                <DevelopmentSimulator />
              </>
            )}
            <button
              className="app-text-button"
              onClick={() => {
                setSearch("");
                setIntent("all");
                setUnreadOnly(false);
                setLeadStatus("all");
                setAssigneeFilter("all");
                setTimeRange("all");
                dispatch({ type: "SET_CHANNEL", channel: "all" });
              }}
            >
              {t("inbox.clearFilters")}
            </button>
          </div>
        )}
      </div>
      <footer className="inbox-list-footer">
        {mode === "live"
          ? live?.snapshot.capabilities.ai
            ? t("inbox.footerSynced")
            : t("inbox.footerNoAi")
          : t("inbox.footerDemo")}
      </footer>
    </section>
  );
}
