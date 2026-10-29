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
import { useLocale, useStrings } from "@/context/LocaleContext";
import {
  chatDeliveryStatusKeys,
  chatStatusLabelKeys,
  chatStrings,
} from "@/i18n/surfaces/chat";
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
  const t = useStrings(chatStrings);
  const { formatTime } = useLocale();
  const [resolving, setResolving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
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
        failure instanceof Error ? failure.message : t("chat.error.tryAgain"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`chat-message ${incoming ? "incoming" : "outgoing"}`}>
      <span className="sr-only">
        {incoming ? contactName : t("chat.message.you")}:
      </span>
      <p>{message.text}</p>
      <div className="chat-message-time">
        <time dateTime={new Date(message.timestamp).toISOString()}>
          {formatTime(message.timestamp)}
        </time>
        {!incoming && (
          <>
            <span>
              {live
                ? t(
                    chatDeliveryStatusKeys[message.deliveryStatus || "received"],
                  )
                : ""}
            </span>
            <CheckCheck
              size={13}
              role="img"
              aria-label={
                live ? t("chat.delivery.providerStatus") : t("chat.delivery.savedInDemo")
              }
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
            <summary>{t("chat.feedback.summary")}</summary>
            <div>
              <button
                type="button"
                disabled={busy || feedbackSubmitted}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await live.request(`/messages/${message.id}/feedback`, {
                      method: "POST",
                      body: { label: "helpful" },
                    });
                    setFeedbackSubmitted(true);
                    setFeedback(t("chat.feedback.markedHelpful"));
                  } catch (failure) {
                    setFeedback(
                      failure instanceof Error
                        ? failure.message
                        : t("chat.error.feedbackSave"),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("chat.feedback.helpful")}
              </button>
              <button
                type="button"
                disabled={busy || feedbackSubmitted}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await live.request(`/messages/${message.id}/feedback`, {
                      method: "POST",
                      body: { label: "unhelpful" },
                    });
                    setFeedbackSubmitted(true);
                    setFeedback(t("chat.feedback.saved"));
                  } catch (failure) {
                    setFeedback(
                      failure instanceof Error
                        ? failure.message
                        : t("chat.error.feedbackSave"),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("chat.feedback.notHelpful")}
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
            <p>{message.deliveryError || t("chat.delivery.needsReview")}</p>
            <div className="message-delivery-actions">
              {message.deliveryStatus === "failed" && (
                <button
                  className="app-text-button"
                  disabled={busy}
                  onClick={() => {
                    void deliveryAction(`/messages/${message.id}/retry`, {});
                  }}
                >
                  {t("chat.delivery.retry")}
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
                    {t("chat.delivery.resolve")}
                  </button>
                )}
            </div>
            {error && <p role="alert">{error}</p>}
          </div>
        )}
      {resolving && (
        <DialogShell
          title={t("chat.resolve.title")}
          onClose={() => setResolving(false)}
        >
          <div className="legal-copy">
            <p>{t("chat.resolve.explain")}</p>
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
                {t("chat.resolve.question")}
                <select
                  id={`resolve-${message.id}`}
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  required
                >
                  <option value="">{t("chat.resolve.chooseAfterChecking")}</option>
                  <option value="sent">
                    {t("chat.resolve.messageInInbox")}
                  </option>
                  <option value="not-sent">
                    {t("chat.resolve.notSent")}
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
                {t("chat.resolve.checked")}
              </label>
              <button
                className="closer-button closer-button-primary"
                disabled={!confirmed || !resolution || busy}
              >
                {t("chat.resolve.confirm")}
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
  const t = useStrings(chatStrings);
  const { formatMonthDay } = useLocale();
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
      setNotice(t("chat.notice.autoSentDemo"));
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [canAutoSend, conversation?.id, aiSuggestion?.text, dispatch, t]);

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
        ? t("chat.notice.queuedLive")
        : t("chat.notice.savedDemo"),
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
      <section
        className="chat-panel chat-idle"
        aria-label={t("chat.idle.ariaLabel")}
      >
        <CloserMark />
        <h2>{t("chat.idle.heading")}</h2>
        <p>{t("chat.idle.subheading")}</p>
        <span>
          <MessageSquare size={14} />
          {t("chat.idle.tagline")}
        </span>
      </section>
    );

  return (
    <section className="chat-panel" aria-labelledby="chat-contact-name">
      <header className="chat-panel-header">
        <button
          className="app-icon-button chat-back-button"
          onClick={() => dispatch({ type: "SET_VIEW", view: "inbox" })}
          aria-label={t("chat.back.label")}
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
                ? t("chat.channel.business")
                : t("chat.channel.sample")}
            </span>
          </span>
        </div>
        <div className="chat-assignee-select">
          <label htmlFor="chat-assignee-header" className="sr-only">
            {t("chat.assignee.label")}
          </label>
          <select
            id="chat-assignee-header"
            value={conversation.assigneeUserId || ""}
            onChange={async (event) => {
              const val = event.target.value || null;
              if (live) {
                try {
                  await live.request(`/conversations/${conversation.id}`, {
                    method: "PATCH",
                    body: { assigneeUserId: val },
                  });
                  await live.refresh();
                  setNotice(t("chat.assignee.updated"));
                } catch (failure) {
                  setNotice(
                    failure instanceof Error
                      ? failure.message
                      : t("chat.error.tryAgain"),
                  );
                }
              }
            }}
            disabled={!live || !!live.pending}
          >
            <option value="">{t("chat.assignee.unassigned")}</option>
            {(live?.snapshot?.members || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.email}
              </option>
            ))}
          </select>
        </div>
        <div className="chat-auto-send">
          <span>{t("chat.autoSend.label")}</span>
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
                  ? t("chat.autoSend.disabled")
                  : state.settings.autoReplyEnabled
                    ? t("chat.autoSend.enabled")
                    : t("chat.autoSend.contactEnabled"),
              );
            }}
            label={t("chat.autoSend.switchLabel", {
              name: conversation.contactName,
            })}
            disabled={conversation.intent === "spam" || !!live?.pending}
          />
        </div>
      </header>
      <details className="lead-memory">
        <summary>
          <span>{t("chat.memory.heading")}</span>
          <span className="lead-memory-preview">
            {conversation.leadNotes || t("chat.memory.emptyHint")}
          </span>
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <div className="lead-memory-content">
          <div className="lead-status-field">
            <label htmlFor="lead-status">
              {t("chat.memory.conversionStatus")}
            </label>
            <select
              id="lead-status"
              value={conversation.conversionStatus}
              onChange={async (event) => {
                const success = await update({
                  type: "UPDATE_LEAD",
                  conversationId: conversation.id,
                  status: event.target.value as ConversionStatus,
                });
                if (success) setMemoryNotice(t("chat.memory.statusSaved"));
              }}
            >
              {Object.entries(statusLabels).map(([value]) => (
                <option value={value} key={value}>
                  {t(chatStatusLabelKeys[value])}
                </option>
              ))}
            </select>
          </div>
          <label htmlFor="lead-notes">{t("chat.memory.notesLabel")}</label>
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
                setMemoryNotice(t("chat.memory.saved"));
              }}
            >
              {t("chat.memory.save")}
              <Check size={13} />
            </button>
            <span role="status">{memoryNotice}</span>
          </div>
        </div>
        {conversation.leadMemory && (
          <p className="app-field-help">
            {t("chat.memory.conversationMemory", {
              memory: conversation.leadMemory,
            })}
          </p>
        )}
      </details>
      <DealPanel />
      <div
        className="chat-messages"
        ref={messagesRef}
        tabIndex={0}
        role="log"
        aria-label={t("chat.messages.ariaLabel", {
          name: conversation.contactName,
        })}
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="chat-messages-inner">
          <span className="chat-date">
            {formatMonthDay(
              conversation.messages[0]?.timestamp ?? Date.now(),
            )}
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
                {t("chat.ai.tryAgain")}
              </button>
            )}
          </div>
        )}
        {mode === "live" && (conversation.windowUntil || 0) < Date.now() && (
          <p className="chat-quiet-note">{t("chat.window.closed")}</p>
        )}
        {conversation.intent === "spam" && (
          <p className="chat-quiet-note">{t("chat.spam.notice")}</p>
        )}
        {aiSuggestion && (
          <div className="chat-suggestion">
            <div className="chat-suggestion-heading">
              <span>
                <Sparkles size={14} />
                {t("chat.suggestion.heading")}
              </span>
              <span
                className={
                  aiSuggestion.confidence >=
                  state.settings.autoSendConfidenceThreshold
                    ? "confidence-high"
                    : "confidence-review"
                }
              >
                {t("chat.suggestion.confidence", {
                  confidence: aiSuggestion.confidence,
                })}
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
                aria-label={t("chat.suggestion.editLabel")}
                aria-describedby="chat-composer-hint"
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
                {t("chat.suggestion.send")}
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
                  t("chat.suggestion.cancel")
                ) : (
                  <>
                    <Pencil size={13} />
                    {t("chat.suggestion.edit")}
                  </>
                )}
              </button>
              <span className="auto-send-message">
                {mode === "live" && "safe" in aiSuggestion && !aiSuggestion.safe
                  ? t("chat.suggestion.reviewBeforeSending")
                  : canAutoSend
                    ? t("chat.suggestion.autoSending")
                    : aiSuggestion.confidence <
                        state.settings.autoSendConfidenceThreshold
                      ? t("chat.suggestion.reviewBeforeSending")
                      : t("chat.suggestion.ready")}
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
            {t("chat.composer.label", { name: conversation.contactName })}
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
            placeholder={t("chat.composer.placeholder")}
            aria-describedby="chat-composer-hint"
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
            aria-label={t("chat.composer.sendLabel")}
          >
            <Send size={17} />
          </button>
        </form>
        <div className="chat-composer-footer">
          <span>
            {notice ||
              (mode === "live"
                ? t("chat.composer.liveFooter")
                : t("chat.composer.demoFooter"))}
          </span>
          <span id="chat-composer-hint">{t("chat.composer.enterToSend")}</span>
        </div>
      </div>
      <span className="sr-only" role="status">
        {notice}
      </span>
    </section>
  );
}
