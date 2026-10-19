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
  const active = conversations.find(
    (conversation) => conversation.id === selectedId,
  )!;
  const sentReplies = replies[selectedId] ?? [];
  const hasReplied = sentReplies.length > 0;
  const draft = drafts[selectedId] ?? "";
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
      `Reply sent to ${active.name.split(" ")[0]} in the demo. No real message was sent.`,
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
        `High-confidence reply auto-sent to ${active.name.split(" ")[0]} in the demo.`,
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
    <div className="product-demo" aria-label="Interactive DMCloser inbox demo">
      <div className="demo-window-bar">
        <div className="demo-window-brand">
          <Brand compact />
          <span className="demo-window-divider">/</span>
          <span>Maison Studio</span>
        </div>
        <div className="demo-window-actions">
          <span className="demo-live-label">
            <span />
            Interactive demo
          </span>
          <button onClick={onOpenApp} aria-label="Open the full inbox">
            <ArrowUpRight size={17} />
          </button>
        </div>
      </div>

      <div className="demo-workspace">
        <aside className="demo-sidebar" aria-label="Demo channels">
          <span className="demo-sidebar-label">WORKSPACE</span>
          <button
            className={channel === "all" ? "is-selected" : ""}
            aria-pressed={channel === "all"}
            onClick={() => changeChannel("all")}
          >
            <Inbox size={16} />
            All conversations<span>3</span>
          </button>
          <span className="demo-sidebar-label channel-label">CHANNELS</span>
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
              Maison Studio<small>Demo workspace</small>
            </div>
          </div>
        </aside>

        <div className="demo-conversations">
          <div className="demo-list-heading">
            <span>
              Inbox <small>{filtered.length}</small>
            </span>
            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                setSearch("");
              }}
              aria-label="Search demo conversations"
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
              placeholder="Search conversations"
              aria-label="Search demo conversations"
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
                      {conversation.intent}
                    </span>
                    <span>
                      {replies[conversation.id]?.length
                        ? "Replied"
                        : conversation.status}
                    </span>
                  </span>
                </span>
              </button>
            ))}
            {!filtered.length && (
              <p className="demo-no-results">
                No conversations match. Try another name.
              </p>
            )}
          </div>
          <div className="demo-list-footer">
            <Check size={12} />
            Three sample conversations. Ready to explore.
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
              <span>Auto-send</span>
              <Switch
                checked={autoSend}
                label="Auto-send demo replies"
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
              <span className="demo-date">Today, 10:42 AM</span>
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
                    Suggested reply
                  </span>
                  <small>
                    <span />
                    {active.confidence}% confidence
                  </small>
                </div>
                {editing ? (
                  <textarea
                    ref={editRef}
                    value={editedReply}
                    onChange={(event) => setEditedReply(event.target.value)}
                    maxLength={4000}
                    aria-label="Edit suggested reply"
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
                    Send reply
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
                      "Cancel"
                    ) : (
                      <>
                        <Pencil size={12} />
                        Edit
                      </>
                    )}
                  </button>
                  {autoSend && !editing && !draft.trim() && (
                    <span className="auto-send-hint">Sending shortly...</span>
                  )}
                </div>
              </div>
            )}
            {hasReplied && (
              <div className="demo-replied">
                <Check size={13} />
                One less reply. One step closer to a sale.
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
              placeholder="Or write your own reply..."
              aria-label="Write a demo reply"
            />
            <button
              type="submit"
              aria-label="Send your demo reply"
              disabled={editing || !draft.trim()}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
      <div className="demo-bottom-bar">
        <span>Sample conversations. Real possibilities.</span>
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
            setNotice("Demo reset.");
          }}
        >
          <RotateCcw size={11} />
          Reset demo
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {notice}
      </span>
    </div>
  );
}
