import type { ReactNode } from "react";
import {
  ArrowLeft,
  Inbox,
  Moon,
  Settings,
  Sun,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { Brand, InstagramIcon, WhatsAppIcon } from "./landing/Brand";
import type { InboxChannel } from "@/types";

export default function Sidebar({ onHome }: { onHome: () => void }) {
  const { state, dispatch, mode, live } = useApp();
  const { theme, toggle } = useTheme();
  const unread = state.conversations.filter(
    (conversation) => conversation.unread,
  ).length;
  return (
    <aside className="app-sidebar">
      <a
        href="/"
        className="app-brand-link"
        onClick={(event) => {
          event.preventDefault();
          onHome();
        }}
        aria-label="DMCloser home"
      >
        <Brand />
      </a>
      <div className="app-workspace-name">
        <span className="workspace-monogram">
          {state.settings.businessName.charAt(0).toUpperCase()}
        </span>
        <div>
          <strong>{state.settings.businessName}</strong>
          <span>{mode === "live" ? "Your workspace" : "Demo workspace"}</span>
        </div>
      </div>
      <nav className="app-navigation" aria-label="Workspace navigation">
        <button
          aria-current={
            ["inbox", "chat"].includes(state.currentView) ? "page" : undefined
          }
          onClick={() => dispatch({ type: "SET_VIEW", view: "inbox" })}
        >
          <Inbox size={17} />
          <span>Inbox</span>
          {unread > 0 && (
            <span className="nav-count" aria-label={`${unread} unread`}>
              {unread}
            </span>
          )}
        </button>
        {mode === "live" && (
          <>
            <button
              aria-current={
                state.currentView === "revenue" ? "page" : undefined
              }
              onClick={() => dispatch({ type: "SET_VIEW", view: "revenue" })}
            >
              <TrendingUp size={17} />
              <span>Revenue</span>
            </button>
            <button
              aria-current={state.currentView === "brain" ? "page" : undefined}
              onClick={() => dispatch({ type: "SET_VIEW", view: "brain" })}
            >
              <BookOpen size={17} />
              <span>Business Brain</span>
            </button>
          </>
        )}
        <button
          aria-current={state.currentView === "settings" ? "page" : undefined}
          onClick={() => dispatch({ type: "SET_VIEW", view: "settings" })}
        >
          <Settings size={17} />
          <span>Settings</span>
        </button>
      </nav>
      <div className="app-channel-navigation">
        <span className="app-nav-label">Channels</span>
        <nav aria-label="Conversation channels">
          {(
            [
              {
                value: "all",
                label: "All conversations",
                icon: <Inbox size={16} />,
              },
              {
                value: "instagram",
                label: "Instagram",
                icon: <InstagramIcon />,
              },
              { value: "whatsapp", label: "WhatsApp", icon: <WhatsAppIcon /> },
            ] as { value: InboxChannel; label: string; icon: ReactNode }[]
          ).map((channel) => (
            <button
              key={channel.value}
              aria-pressed={state.channel === channel.value}
              onClick={() =>
                dispatch({ type: "SET_CHANNEL", channel: channel.value })
              }
            >
              {channel.icon}
              <span>{channel.label}</span>
              <span className="channel-count">
                {
                  state.conversations.filter(
                    (conversation) =>
                      channel.value === "all" ||
                      conversation.platform === channel.value,
                  ).length
                }
              </span>
            </button>
          ))}
        </nav>
      </div>
      <div className="app-sidebar-footer">
        <div className="app-assistant-state">
          <span className="assistant-dot" />
          <div>
            {state.settings.autoReplyEnabled
              ? "Auto-reply enabled"
              : "You have the final say"}
            <small>
              {mode === "live"
                ? live?.connectionState === "connected"
                  ? "Connected to your server."
                  : "Reconnecting to live updates."
                : "Sample messages. No live sends."}
            </small>
          </div>
        </div>
        <button onClick={toggle}>
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
        <button onClick={onHome}>
          <ArrowLeft size={16} />
          Back to website
        </button>
        {mode === "demo" && (
          <a
            href="/workspace"
            className="app-text-button"
            style={{ paddingInline: 10 }}
          >
            Create your workspace
            <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }} />
          </a>
        )}
      </div>
    </aside>
  );
}
