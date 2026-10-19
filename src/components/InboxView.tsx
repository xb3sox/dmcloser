import { useEffect, useRef, useState } from "react";
import { Inbox, Search, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import ConversationItem from "./ConversationItem";
import type { InboxChannel, Intent } from "@/types";
import DevelopmentSimulator from "./workspace/DevelopmentSimulator";

const filters: { label: string; value: Intent | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Buy", value: "buy" },
  { label: "Questions", value: "question" },
  { label: "Spam", value: "spam" },
];

export default function InboxView() {
  const { state, dispatch, mode, live } = useApp();
  const [intent, setIntent] = useState<Intent | "all">("all");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);

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
  const query = search.trim().toLowerCase();
  const filtered = state.conversations
    .filter(
      (conversation) =>
        (state.channel === "all" || conversation.platform === state.channel) &&
        (intent === "all" || conversation.intent === intent) &&
        (!unreadOnly || conversation.unread) &&
        (!query ||
          `${conversation.contactName} ${conversation.lastMessage} ${conversation.leadNotes} ${conversation.messages.map((message) => message.text).join(" ")}`
            .toLowerCase()
            .includes(query)),
    )
    .sort((first, second) => second.lastMessageTime - first.lastMessageTime);

  return (
    <section
      className="inbox-panel"
      ref={panelRef}
      aria-labelledby="inbox-heading"
    >
      <header className="inbox-panel-header">
        <div className="inbox-title-row">
          <h1 id="inbox-heading">
            Inbox<span aria-hidden="true">{filtered.length}</span>
          </h1>
          <button
            className={`unread-filter ${unreadOnly ? "is-selected" : ""}`}
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            Unread
          </button>
        </div>
        <div className="inbox-search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search conversations"
            placeholder="Search conversations..."
            type="search"
          />
          {search && (
            <button
              aria-label="Clear conversation search"
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
          <label htmlFor="inbox-channel">Channel</label>
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
            <option value="all">All channels</option>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <div
          className="inbox-intent-filters"
          role="group"
          aria-label="Filter by intent"
        >
          {filters.map((filter) => (
            <button
              key={filter.value}
              aria-pressed={intent === filter.value}
              onClick={() => setIntent(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>
      <div className="inbox-conversation-list" aria-label="Conversations">
        {filtered.length ? (
          filtered.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
            />
          ))
        ) : (
          <div className="app-empty-state">
            <Inbox size={27} strokeWidth={1.4} />
            <h2>No conversations found</h2>
            <p>
              {mode === "live" && state.conversations.length === 0
                ? "Connect Instagram or WhatsApp in Settings. Your next inbound message will appear here."
                : "Try a different search or clear your filters."}
            </p>
            {mode === "live" && state.conversations.length === 0 && (
              <>
                <button
                  className="app-small-button"
                  onClick={() =>
                    dispatch({ type: "SET_VIEW", view: "settings" })
                  }
                >
                  Connect an account
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
                dispatch({ type: "SET_CHANNEL", channel: "all" });
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <footer className="inbox-list-footer">
        {mode === "live"
          ? live?.snapshot.capabilities.ai
            ? "Your inbox is synced with the server."
            : "AI not configured. Manual replies are available."
          : "Demo inbox. No real messages are sent."}
      </footer>
    </section>
  );
}
