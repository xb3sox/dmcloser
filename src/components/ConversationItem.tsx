import { memo } from "react";
import type { Conversation } from "@/types";
import { useApp } from "@/context/AppContext";
import { useStrings } from "@/context/LocaleContext";
import { workspaceStrings } from "@/i18n/surfaces/workspace";
import { InstagramIcon, WhatsAppIcon } from "./landing/Brand";
import { timeAgo } from "@/utils/conversation";

const intentKeys = {
  buy: "workspace.intent.buy",
  question: "workspace.intent.question",
  spam: "workspace.intent.spam",
} as const;

const statusKeys = {
  new: "workspace.status.new",
  engaged: "workspace.status.engaged",
  qualified: "workspace.status.qualified",
  converted: "workspace.status.converted",
  lost: "workspace.status.lost",
} as const;

// ⚡ Bolt Optimization: Wrap ConversationItem in React.memo to prevent unnecessary
// re-renders of un-changed conversation list rows when sibling conversations, search inputs,
// or parent InboxView layout state updates.
const ConversationItem = memo(function ConversationItem({
  conversation,
}: {
  conversation: Conversation;
}) {
  const { state, dispatch } = useApp();
  const t = useStrings(workspaceStrings);
  const draft = state.drafts[conversation.id];
  return (
    <button
      type="button"
      className={`conversation-row ${state.selectedConversationId === conversation.id ? "is-selected" : ""} ${conversation.unread ? "is-unread" : ""}`}
      onClick={() =>
        dispatch({ type: "SELECT_CONVERSATION", id: conversation.id })
      }
      aria-pressed={state.selectedConversationId === conversation.id}
      aria-label={`${t("workspace.conversation.openWith", {
        name: conversation.contactName,
      })}${conversation.unread ? t("workspace.conversation.unread") : ""}`}
    >
      <span
        className={`contact-avatar avatar-${conversation.id.charCodeAt(conversation.id.length - 1) % 3}`}
        aria-hidden="true"
      >
        {conversation.contactAvatar}
      </span>
      <span className="conversation-row-content">
        <span className="conversation-row-name">
          <strong>{conversation.contactName}</strong>
          <time dateTime={new Date(conversation.lastMessageTime).toISOString()}>
            {timeAgo(conversation.lastMessageTime)}
          </time>
        </span>
        <span className="conversation-row-preview">
          {draft && (
            <span className="draft-indicator">
              {t("workspace.conversation.draftPrefix")}
            </span>
          )}
          {draft || conversation.lastMessage}
        </span>
        <span className="conversation-row-meta">
          <span className={`intent-label intent-${conversation.intent}`}>
            {t(intentKeys[conversation.intent])}
          </span>
          <span>{t(statusKeys[conversation.conversionStatus])}</span>
          <span
            className="conversation-channel"
            aria-label={
              conversation.platform === "instagram" ? "Instagram" : "WhatsApp"
            }
          >
            {conversation.platform === "instagram" ? (
              <InstagramIcon />
            ) : (
              <WhatsAppIcon />
            )}
          </span>
          {conversation.unread && (
            <span className="unread-dot" aria-hidden="true" />
          )}
        </span>
      </span>
    </button>
  );
});

export default ConversationItem;
