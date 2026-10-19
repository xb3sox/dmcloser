import type { Conversation } from "@/types";
import { useApp } from "@/context/AppContext";
import { InstagramIcon, WhatsAppIcon } from "./landing/Brand";
import { intentLabels, statusLabels, timeAgo } from "@/utils/conversation";

export default function ConversationItem({
  conversation,
}: {
  conversation: Conversation;
}) {
  const { state, dispatch } = useApp();
  const draft = state.drafts[conversation.id];
  return (
    <button
      className={`conversation-row ${state.selectedConversationId === conversation.id ? "is-selected" : ""} ${conversation.unread ? "is-unread" : ""}`}
      onClick={() =>
        dispatch({ type: "SELECT_CONVERSATION", id: conversation.id })
      }
      aria-pressed={state.selectedConversationId === conversation.id}
      aria-label={`Open conversation with ${conversation.contactName}${conversation.unread ? ", unread" : ""}`}
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
          {draft && <span className="draft-indicator">Draft: </span>}
          {draft || conversation.lastMessage}
        </span>
        <span className="conversation-row-meta">
          <span className={`intent-label intent-${conversation.intent}`}>
            {intentLabels[conversation.intent]}
          </span>
          <span>{statusLabels[conversation.conversionStatus]}</span>
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
}
