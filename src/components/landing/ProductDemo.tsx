import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  Inbox,
  Pencil,
  RotateCcw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { Brand, InstagramIcon, WhatsAppIcon } from "./Brand";
import { previewConversations } from "@/data/preview";
import { useStrings } from "@/context/LocaleContext";
import { landingStrings } from "@/i18n/surfaces/landing";
import Switch from "../ui/Switch";

type Channel = "all" | "instagram" | "whatsapp";

const conversations = previewConversations;

export default function ProductDemo({ onOpenApp }: { onOpenApp: () => void }) {
  const [selectedId, setSelectedId] = useState("sofia");
  const [channel, setChannel] = useState<Channel>("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [replies, setReplies] = useState<Record<string, string[]>>({});
  const [autoSend, setAutoSend] = useState(false);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editedReply, setEditedReply] = useState("");
  const [notice, setNotice] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const t = useStrings(landingStrings);
  const active = conversations.find(
    (conversation) => conversation.id === selectedId,
  )!;
  const sentReplies = replies[selectedId] ?? [];
  const hasReplied = sentReplies.length > 0;
  const draft = drafts[selectedId] ?? "";
  const statusLabels: Record<string, string> = {
    "Ready to buy": t("landing.demo.statusReadyToBuy"),
    "Qualified lead": t("landing.demo.statusQualifiedLead"),
    "Getting to know you": t("landing.demo.statusGettingToKnowYou"),
  };
  const intentLabels: Record<string, string> = {
    Buy: t("landing.demo.intentBuy"),
    Question: t("landing.demo.intentQuestion"),
  };
  const filtered = conversations.filter(
    (conversation) =>
      (channel === "all" || conversation.channel === channel) &&
      `${conversation.name} ${conversation.lastMessage}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  function sendReply(text: string) {
    if (!text.trim()) return;
    setReplies((previous) => ({
      ...previous,
      [selectedId]: [...(previous[selectedId] ?? []), text.trim()],
    }));
    setEditing(false);
    setDrafts((previous) => ({ ...previous, [selectedId]: "" }));
    setNotice(
      t("landing.demo.noticeSent", { name: active.name.split(" ")[0] }),
    );
  }

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!autoSend || hasReplied || editing || draft.trim()) return;
    const timer = window.setTimeout(() => {
      setReplies((previous) =>
        previous[selectedId]?.length
          ? previous
          : { ...previous, [selectedId]: [active.reply] },
      );
      setNotice(
        t("landing.demo.noticeAutoSent", { name: active.name.split(" ")[0] }),
      );
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [
    autoSend,
    hasReplied,
    editing,
    draft,
    selectedId,
    active.reply,
    active.name,
    t,
  ]);

  function selectConversation(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    setEditing(false);
    setEditedReply("");
    setNotice("");
  }

  function changeChannel(next: Channel) {
    setChannel(next);
    setSearch("");
    const first = conversations.find(
      (conversation) => next === "all" || conversation.channel === next,
    );
    if (first) selectConversation(first.id);
  }

  return (
    <div className="product-demo" aria-label={t("landing.demo.ariaLabel")}>
      <div className="demo-window-bar">
        <div className="demo-window-brand">
          <Brand compact />
          <span className="demo-window-divider">/</span>
          <span>Maison Studio</span>
        </div>
        <div className="demo-window-actions">
          <span className="demo-live-label">
            <span />
            {t("landing.demo.liveLabel")}
          </span>
          <button onClick={onOpenApp} aria-label={t("landing.demo.openFullInbox")}>
            <ArrowUpRight size={17} />
          </button>
        </div>
      </div>

      <div className="demo-workspace">
        <aside className="demo-sidebar" aria-label={t("landing.demo.channelsLabel")}>
          <span className="demo-sidebar-label">{t("landing.demo.workspaceLabel")}</span>
          <button
            className={channel === "all" ? "is-selected" : ""}
            aria-pressed={channel === "all"}
            onClick={() => changeChannel("all")}
          >
            <Inbox size={16} />
            {t("landing.demo.allConversations")}<span>3</span>
          </button>
          <span className="demo-sidebar-label channel-label">
            {t("landing.demo.channelsHeading")}
          </span>
          <button
            className={channel === "instagram" ? "is-selected" : ""}
            aria-pressed={channel === "instagram"}
            onClick={() => changeChannel("instagram")}
          >
            <InstagramIcon />
            Instagram<span>2</span>
          </button>
          <button
            className={channel === "whatsapp" ? "is-selected" : ""}
            aria-pressed={channel === "whatsapp"}
            onClick={() => changeChannel("whatsapp")}
          >
            <WhatsAppIcon />
            WhatsApp<span>1</span>
          </button>
          <div className="demo-sidebar-bottom">
            <span className="workspace-avatar">M</span>
            <div>
              Maison Studio<small>{t("landing.demo.workspaceName")}</small>
            </div>
          </div>
        </aside>

        <div className="demo-conversations">
          <div className="demo-list-heading">
            <span>
              {t("landing.demo.inbox")} <small>{filtered.length}</small>
            </span>
            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                setSearch("");
              }}
              aria-label={t("landing.demo.searchLabel")}
              aria-expanded={searchOpen}
            >
              <Search size={16} />
            </button>
          </div>
          {searchOpen && (
            <input
              ref={searchRef}
              className="demo-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("landing.demo.searchPlaceholder")}
              aria-label={t("landing.demo.searchLabel")}
            />
          )}
          <div className="demo-conversation-items">
            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                className={`demo-conversation ${selectedId === conversation.id ? "is-selected" : ""}`}
                onClick={() => selectConversation(conversation.id)}
                aria-pressed={selectedId === conversation.id}
              >
                <span className={`demo-avatar ${conversation.color}`}>
                  {conversation.initials}
                </span>
                <span className="demo-conversation-content">
                  <span className="demo-conversation-name">
                    {conversation.name}
                    <small>{conversation.time}</small>
                  </span>
                  <span className="demo-last-message">
                    {replies[conversation.id]?.slice(-1)[0] ??
                      conversation.lastMessage}
                  </span>
                  <span className="demo-conversation-meta">
                    <span
                      className={
                        conversation.intent === "Buy"
                          ? "intent-buy"
                          : "intent-question"
                      }
                    >
                      {conversation.intent === "Buy" && (
                        <ArrowUpRight size={10} />
                      )}
                      {intentLabels[conversation.intent] ?? conversation.intent}
                    </span>
                    <span>
                      {replies[conversation.id]?.length
                        ? t("landing.demo.replied")
                        : statusLabels[conversation.status] ?? conversation.status}
                    </span>
                  </span>
                </span>
              </button>
            ))}
            {!filtered.length && (
              <p className="demo-no-results">{t("landing.demo.noResults")}</p>
            )}
          </div>
          <div className="demo-list-footer">
            <Check size={12} />
            {t("landing.demo.listFooter")}
          </div>
        </div>

        <div className="demo-chat">
          <div className="demo-chat-heading">
            <span className={`demo-avatar ${active.color}`}>
              {active.initials}
            </span>
            <div>
              <strong>{active.name}</strong>
              <span>
                {active.channel === "instagram" ? (
                  <InstagramIcon />
                ) : (
                  <WhatsAppIcon />
                )}
                {active.channel === "instagram" ? "Instagram" : "WhatsApp"}
              </span>
            </div>
            <div className="demo-auto-send">
              <span>{t("landing.demo.autoSend")}</span>
              <Switch
                checked={autoSend}
                label={t("landing.demo.autoSendLabel")}
                onChange={() => setAutoSend(!autoSend)}
              />
            </div>
          </div>

          <motion.div
            key={selectedId}
            className="demo-chat-content"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="demo-messages">
              <span className="demo-date">{t("landing.demo.dateToday")}</span>
              {active.messages.map((message, index) => (
                <div
                  key={`${selectedId}-${index}`}
                  className={`demo-bubble ${message.sender}`}
                >
                  {message.text}
                  {message.sender === "agent" && (
                    <span className="demo-message-check">
                      <CheckCheck size={12} />
                    </span>
                  )}
                </div>
              ))}
              {sentReplies.map((reply, index) => (
                <motion.div
                  key={`${selectedId}-sent-${index}`}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="demo-bubble agent sent"
                >
                  {reply}
                  <span className="demo-message-check">
                    <CheckCheck size={12} />
                  </span>
                </motion.div>
              ))}
            </div>

            {!hasReplied && (
              <div className="demo-suggestion">
                <div className="demo-suggestion-heading">
                  <span>
                    <Sparkles size={13} />
                    {t("landing.demo.suggestedReply")}
                  </span>
                  <small>
                    <span />
                    {t("landing.demo.confidence", { confidence: active.confidence })}
                  </small>
                </div>
                {editing ? (
                  <textarea
                    ref={editRef}
                    value={editedReply}
                    onChange={(event) => setEditedReply(event.target.value)}
                    maxLength={4000}
                    aria-label={t("landing.demo.editSuggestedReply")}
                    rows={3}
                  />
                ) : (
                  <p>{active.reply}</p>
                )}
                <div className="demo-suggestion-actions">
                  <button
                    className="demo-send"
                    disabled={editing && !editedReply.trim()}
                    onClick={() =>
                      sendReply(editing ? editedReply : active.reply)
                    }
                  >
                    {t("landing.demo.sendReply")}
                    <Send size={12} />
                  </button>
                  <button
                    className="demo-edit"
                    onClick={() => {
                      setEditing(!editing);
                      setEditedReply(editing ? "" : active.reply);
                    }}
                  >
                    {editing ? (
                      t("landing.demo.cancel")
                    ) : (
                      <>
                        <Pencil size={12} />
                        {t("landing.demo.edit")}
                      </>
                    )}
                  </button>
                  {autoSend && !editing && !draft.trim() && (
                    <span className="auto-send-hint">
                      {t("landing.demo.sendingShortly")}
                    </span>
                  )}
                </div>
              </div>
            )}
            {hasReplied && (
              <div className="demo-replied">
                <Check size={13} />
                {t("landing.demo.repliedBanner")}
              </div>
            )}
          </motion.div>

          <form
            className="demo-composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendReply(draft);
            }}
          >
            <input
              value={editing ? "" : draft}
              disabled={editing}
              onChange={(event) =>
                setDrafts((previous) => ({
                  ...previous,
                  [selectedId]: event.target.value,
                }))
              }
              maxLength={4000}
              placeholder={t("landing.demo.composerPlaceholder")}
              aria-label={t("landing.demo.writeReplyLabel")}
            />
            <button
              type="submit"
              aria-label={t("landing.demo.sendReplyLabel")}
              disabled={editing || !draft.trim()}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
      <div className="demo-bottom-bar">
        <span>{t("landing.demo.bottomLabel")}</span>
        <button
          onClick={() => {
            setReplies({});
            setAutoSend(false);
            setEditing(false);
            setDrafts({});
            setEditedReply("");
            setSearch("");
            setSearchOpen(false);
            setChannel("all");
            setSelectedId("sofia");
            setNotice(t("landing.demo.resetNotice"));
          }}
        >
          <RotateCcw size={11} />
          {t("landing.demo.reset")}
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {notice}
      </span>
    </div>
  );
}
