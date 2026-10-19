import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  MessageSquare,
  Pencil,
  Send,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CloserMark, InstagramIcon, WhatsAppIcon } from "./landing/Brand";
import Switch from "./ui/Switch";
import { statusLabels } from "@/utils/conversation";
import type { ConversionStatus, Message } from "@/types";
import { DialogShell } from "./ui/Dialog";
import DealPanel from "./revenue/DealPanel";

function MessageBubble({
  message,
  contactName,
}: {
  message: Message;
  contactName: string;
}) {
  const incoming = message.sender === "contact";
  const { live } = useApp();
  const [resolving, setResolving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function deliveryAction(path: string, body: unknown) {
    if (!live) return;
    setBusy(true);
    setError("");
    try {
      await live.request(path, { method: "POST", body });
      await live.refresh();
      setResolving(false);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`chat-message ${incoming ? "incoming" : "outgoing"}`}>
      <span className="sr-only">{incoming ? contactName : "You"}:</span>
      <p>{message.text}</p>
      <div className="chat-message-time">
        <time dateTime={new Date(message.timestamp).toISOString()}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        {!incoming && (
          <>
            <span>
              {live
                ? {
                    queued: "Queued",
                    sending: "Sending",
                    sent: "Accepted",
                    delivered: "Delivered",
                    read: "Read",
                    failed: "Failed",
                    uncertain: "Check delivery",
                    cancelled: "Paused",
                    received: "Received",
                  }[message.deliveryStatus || "received"]
                : ""}
            </span>
            <CheckCheck
              size={13}
              aria-label={live ? "Provider delivery status" : "Saved in demo"}
            />
          </>
        )}
      </div>
      {live &&
        !incoming &&
        ["sent", "delivered", "read"].includes(
          message.deliveryStatus || "",
        ) && (
          <details className="reply-feedback">
            <summary>Reply feedback</summary>
            <div>
              <button
                onClick={async () => {
                  try {
                    await live.request(`/messages/${message.id}/feedback`, {
                      method: "POST",
                      body: { label: "helpful" },
                    });
                    setFeedback(
                      "Marked helpful. This is feedback, not proof of conversion.",
                    );
                  } catch (failure) {
                    setFeedback(
                      failure instanceof Error
                        ? failure.message
                        : "Could not save feedback.",
                    );
                  }
                }}
              >
                Helpful
              </button>
              <button
                onClick={async () => {
                  try {
                    await live.request(`/messages/${message.id}/feedback`, {
                      method: "POST",
                      body: { label: "unhelpful" },
                    });
                    setFeedback("Feedback saved for review.");
                  } catch (failure) {
                    setFeedback(
                      failure instanceof Error
                        ? failure.message
                        : "Could not save feedback.",
                    );
                  }
                }}
              >
                Not helpful
              </button>
            </div>
            <span role="status">{feedback}</span>
          </details>
        )}
      {live &&
        !incoming &&
        ["failed", "uncertain", "cancelled"].includes(
          message.deliveryStatus || "",
        ) && (
          <div className="message-delivery-problem">
            <p>{message.deliveryError || "Delivery needs review."}</p>
            <div className="message-delivery-actions">
              {message.deliveryStatus === "failed" && (
                <button
                  className="app-text-button"
                  disabled={busy}
                  onClick={() => {
                    void deliveryAction(`/messages/${message.id}/retry`, {});
                  }}
                >
                  Retry delivery
                </button>
              )}
              {message.deliveryStatus === "uncertain" &&
                live.snapshot.user.role === "owner" && (
                  <button
                    className="app-text-button"
                    onClick={() => {
                      setResolving(true);
                      setConfirmed(false);
                      setResolution("");
                    }}
                  >
                    Resolve delivery
                  </button>
                )}
            </div>
            {error && <p role="alert">{error}</p>}
          </div>
        )}
      {resolving && (
        <DialogShell
          title="Check the provider inbox first"
          onClose={() => setResolving(false)}
        >
          <div className="legal-copy">
            <p>
              The provider may have accepted this message before the connection
              failed. Resending without checking could send it twice.
            </p>
            <form
              className="setup-form"
              onSubmit={(event) => {
                event.preventDefault();
                void deliveryAction(`/messages/${message.id}/resolve`, {
                  outcome: resolution,
                  checkedProviderInbox: true,
                });
              }}
            >
              <label htmlFor={`resolve-${message.id}`}>
                What happened?
                <select
                  id={`resolve-${message.id}`}
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  required
                >
                  <option value="">Choose after checking</option>
                  <option value="sent">
                    The message is in the provider inbox
                  </option>
                  <option value="not-sent">
                    The provider confirms it was not sent
                  </option>
                </select>
              </label>
              <label className="workspace-delete-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  required
                />
                I checked the real provider inbox.
              </label>
              <button
                className="closer-button closer-button-primary"
                disabled={!confirmed || !resolution || busy}
              >
                Confirm delivery outcome
                <Check size={14} />
              </button>
            </form>
            {error && (
              <p role="alert" className="workspace-form-error">
                {error}
              </p>
            )}
          </div>
        </DialogShell>
      )}
    </div>
  );
}

export default function ChatView() {
  const {
    state,
    dispatch,
    selectedConversation: conversation,
    aiSuggestion,
    mode,
    live,
    update,
  } = useApp();
  const [editing, setEditing] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const [notice, setNotice] = useState("");
  const [memoryNotice, setMemoryNotice] = useState("");
  const [notes, setNotes] = useState(conversation?.leadNotes ?? "");
  const messagesRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const reducedMotion = useReducedMotion();
  const draft = conversation ? (state.drafts[conversation.id] ?? "") : "";
  const canAutoSend =
    mode === "demo" &&
    !!conversation &&
    !!aiSuggestion &&
    state.currentView === "chat" &&
    state.settings.autoReplyEnabled &&
    conversation.autoSendEnabled &&
    aiSuggestion.confidence >= state.settings.autoSendConfidenceThreshold &&
    !editing &&
    !draft.trim();

  useEffect(() => {
    const container = messagesRef.current;
    if (container)
      container.scrollTo({
        top: container.scrollHeight,
        behavior: reducedMotion ? "instant" : "smooth",
      });
  }, [conversation?.messages.length, reducedMotion]);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!live || !conversation || !editing) return;
    live.hold(conversation.id);
    const timer = window.setInterval(() => live.hold(conversation.id), 20000);
    return () => window.clearInterval(timer);
  }, [editing, conversation?.id]);

  useEffect(() => {
    if (
      conversation &&
      state.currentView === "chat" &&
      window.matchMedia("(max-width: 959px)").matches
    ) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [conversation?.id, state.currentView]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(120, Math.max(44, textarea.scrollHeight))}px`;
    }
  }, [draft]);

  useEffect(() => {
    if (!canAutoSend || !conversation || !aiSuggestion) return;
    const timer = window.setTimeout(() => {
      dispatch({
        type: "USE_AI_SUGGESTION",
        conversationId: conversation.id,
        text: aiSuggestion.text,
      });
      setNotice(
        "Suggested reply auto-sent in this demo. No real message was sent.",
      );
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [canAutoSend, conversation?.id, aiSuggestion?.text, dispatch]);

  async function send(text: string, suggested = false) {
    if (!conversation || !text.trim()) return;
    const success = await update({
      type: suggested ? "USE_AI_SUGGESTION" : "SEND_MESSAGE",
      conversationId: conversation.id,
      text,
    });
    if (!success) return;
    setEditing(false);
    setEditedReply("");
    setNotice(
      mode === "live"
        ? "Reply queued. Provider delivery status appears with the message."
        : "Reply saved in this demo. No real message was sent.",
    );
    composerRef.current?.focus();
  }

  function onEnter(
    event: KeyboardEvent<HTMLTextAreaElement>,
    action: () => void,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      action();
    }
  }

  if (!conversation)
    return (
      <section className="chat-panel chat-idle" aria-label="Conversation">
        <CloserMark />
        <h2>A little closer to your next sale.</h2>
        <p>Choose a conversation. Your next reply is already one step ahead.</p>
        <span>
          <MessageSquare size={14} />
          Your voice. Your control.
        </span>
      </section>
    );

  return (
    <section className="chat-panel" aria-labelledby="chat-contact-name">
      <header className="chat-panel-header">
        <button
          className="app-icon-button chat-back-button"
          onClick={() => dispatch({ type: "SET_VIEW", view: "inbox" })}
          aria-label="Back to conversations"
        >
          <ArrowLeft size={19} />
        </button>
        <span
          className={`contact-avatar avatar-${conversation.id.charCodeAt(conversation.id.length - 1) % 3}`}
          aria-hidden="true"
        >
          {conversation.contactAvatar}
        </span>
        <div className="chat-contact">
          <h2 id="chat-contact-name" ref={headingRef} tabIndex={-1}>
            {conversation.contactName}
          </h2>
          <span>
            {conversation.platform === "instagram" ? (
              <InstagramIcon />
            ) : (
              <WhatsAppIcon />
            )}
            <span>
              {conversation.platform === "instagram" ? "Instagram" : "WhatsApp"}
            </span>
            <span className="chat-channel-divider" />
            <span className="chat-sample-label">
              {mode === "live"
                ? "Business conversation"
                : "Sample conversation"}
            </span>
          </span>
        </div>
        <div className="chat-auto-send">
          <span>Auto-send</span>
          <Switch
            checked={conversation.autoSendEnabled}
            onChange={async () => {
              const success = await update({
                type: "TOGGLE_AUTO_SEND",
                conversationId: conversation.id,
              });
              if (!success) return;
              setNotice(
                conversation.autoSendEnabled
                  ? "Auto-send disabled for this contact."
                  : state.settings.autoReplyEnabled
                    ? "Auto-send enabled for this contact."
                    : "Contact auto-send enabled. Enable workspace auto-reply in Settings to activate it.",
              );
            }}
            label={`Auto-send replies to ${conversation.contactName}`}
            disabled={conversation.intent === "spam" || !!live?.pending}
          />
        </div>
      </header>
      <details className="lead-memory">
        <summary>
          <span>Lead memory</span>
          <span className="lead-memory-preview">
            {conversation.leadNotes || "Add context for your next reply"}
          </span>
          <ChevronDown size={15} />
        </summary>
        <div className="lead-memory-content">
          <div className="lead-status-field">
            <label htmlFor="lead-status">Conversion status</label>
            <select
              id="lead-status"
              value={conversation.conversionStatus}
              onChange={async (event) => {
                const success = await update({
                  type: "UPDATE_LEAD",
                  conversationId: conversation.id,
                  status: event.target.value as ConversionStatus,
                });
                if (success) setMemoryNotice("Conversion status saved.");
              }}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label htmlFor="lead-notes">Notes for this contact</label>
          <textarea
            id="lead-notes"
            rows={2}
            value={notes}
            maxLength={2000}
            onChange={(event) => {
              setNotes(event.target.value);
              setMemoryNotice("");
            }}
          />
          <div className="lead-memory-actions">
            <button
              className="app-small-button"
              disabled={notes === conversation.leadNotes}
              onClick={async () => {
                const success = await update({
                  type: "UPDATE_LEAD",
                  conversationId: conversation.id,
                  notes: notes.trim(),
                });
                if (!success) return;
                setNotes(notes.trim());
                setMemoryNotice("Lead memory saved.");
              }}
            >
              Save memory
              <Check size={13} />
            </button>
            <span role="status">{memoryNotice}</span>
          </div>
        </div>
        {conversation.leadMemory && (
          <p className="app-field-help">
            Conversation memory: {conversation.leadMemory}
          </p>
        )}
      </details>
      <DealPanel />
      <div
        className="chat-messages"
        ref={messagesRef}
        tabIndex={0}
        role="log"
        aria-label={`Messages with ${conversation.contactName}`}
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="chat-messages-inner">
          <span className="chat-date">
            {new Date(
              conversation.messages[0]?.timestamp ?? Date.now(),
            ).toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
          {conversation.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              contactName={conversation.contactName}
            />
          ))}
        </div>
      </div>
      <div className="chat-reply-area">
        {mode === "live" && conversation.aiError && (
          <div className="chat-quiet-note">
            <p>{conversation.aiError}</p>
            {live?.snapshot.capabilities.ai && (
              <button
                className="app-text-button"
                onClick={() => {
                  void live
                    .request(`/conversations/${conversation.id}/generate`, {
                      method: "POST",
                      body: {},
                    })
                    .then(live.refresh);
                }}
              >
                Try generation again
              </button>
            )}
          </div>
        )}
        {mode === "live" && (conversation.windowUntil || 0) < Date.now() && (
          <p className="chat-quiet-note">
            The reply window has closed. Wait for a new customer message.
          </p>
        )}
        {conversation.intent === "spam" && (
          <p className="chat-quiet-note">
            Marked as spam. Automatic replies are disabled.
          </p>
        )}
        {aiSuggestion && (
          <div className="chat-suggestion">
            <div className="chat-suggestion-heading">
              <span>
                <Sparkles size={14} />
                Suggested reply
              </span>
              <span
                className={
                  aiSuggestion.confidence >=
                  state.settings.autoSendConfidenceThreshold
                    ? "confidence-high"
                    : "confidence-review"
                }
              >
                {aiSuggestion.confidence}% confidence
              </span>
            </div>
            {editing ? (
              <textarea
                ref={editRef}
                value={editedReply}
                maxLength={4000}
                onChange={(event) => setEditedReply(event.target.value)}
                rows={3}
                onKeyDown={(event) => onEnter(event, () => send(editedReply))}
                aria-label="Edit suggested reply"
              />
            ) : (
              <p tabIndex={0}>{aiSuggestion.text}</p>
            )}
            <div className="chat-suggestion-actions">
              <button
                className="app-small-button"
                disabled={(editing && !editedReply.trim()) || !!live?.pending}
                onClick={() =>
                  send(editing ? editedReply : aiSuggestion.text, !editing)
                }
              >
                Send reply
                <Send size={13} />
              </button>
              <button
                className="app-text-button"
                onClick={() => {
                  setEditing(!editing);
                  setEditedReply(aiSuggestion.text);
                }}
              >
                {editing ? (
                  "Cancel"
                ) : (
                  <>
                    <Pencil size={13} />
                    Edit
                  </>
                )}
              </button>
              <span className="auto-send-message">
                {mode === "live" && "safe" in aiSuggestion && !aiSuggestion.safe
                  ? "Review before sending"
                  : canAutoSend
                    ? "Auto-sending shortly..."
                    : aiSuggestion.confidence <
                        state.settings.autoSendConfidenceThreshold
                      ? "Review before sending"
                      : "Ready when you are"}
              </span>
            </div>
          </div>
        )}
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="chat-reply" className="sr-only">
            Message {conversation.contactName}
          </label>
          <textarea
            id="chat-reply"
            ref={composerRef}
            value={draft}
            disabled={editing}
            onChange={(event) =>
              dispatch({
                type: "SET_DRAFT",
                conversationId: conversation.id,
                text: event.target.value,
              })
            }
            maxLength={4000}
            rows={1}
            placeholder="Write your reply..."
            onKeyDown={(event) => onEnter(event, () => send(draft))}
          />
          <button
            type="submit"
            className="app-send-button"
            disabled={
              editing ||
              !draft.trim() ||
              !!live?.pending ||
              (mode === "live" && (conversation.windowUntil || 0) < Date.now())
            }
            aria-label="Send message"
          >
            <Send size={17} />
          </button>
        </form>
        <div className="chat-composer-footer">
          <span>
            {notice ||
              (mode === "live"
                ? "Server-backed inbox. Check provider delivery status."
                : "Demo workspace. Replies stay in this browser.")}
          </span>
          <span>Enter to send</span>
        </div>
      </div>
      <span className="sr-only" role="status">
        {notice}
      </span>
    </section>
  );
}
