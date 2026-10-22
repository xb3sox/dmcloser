import type { ReactNode } from "react";
import {
  ArrowLeft,
  Inbox,
  Languages,
  Moon,
  Settings,
  Sun,
  TrendingUp,
  BookOpen,
  FlaskConical,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, useStrings } from "@/context/LocaleContext";
import { navStrings } from "@/i18n/surfaces/nav";
import { Brand, InstagramIcon, WhatsAppIcon } from "./landing/Brand";
import type { InboxChannel } from "@/types";

export default function Sidebar({ onHome }: { onHome: () => void }) {
  const { state, dispatch, mode, live } = useApp();
  const { theme, toggle } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useStrings(navStrings);
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
        aria-label={t("nav.home")}
      >
        <Brand />
      </a>
      <div className="app-workspace-name">
        <span className="workspace-monogram">
          {state.settings.businessName.charAt(0).toUpperCase()}
        </span>
        <div>
          <strong>{state.settings.businessName}</strong>
          <span>
            {t(mode === "live" ? "nav.workspaceLive" : "nav.workspaceDemo")}
          </span>
        </div>
      </div>
      <nav className="app-navigation" aria-label={t("nav.workspaceNav")}>
        <button
          aria-current={
            ["inbox", "chat"].includes(state.currentView) ? "page" : undefined
          }
          onClick={() => dispatch({ type: "SET_VIEW", view: "inbox" })}
        >
          <Inbox size={17} />
          <span>{t("nav.inbox")}</span>
          {unread > 0 && (
            <span className="nav-count" aria-label={t("nav.unreadCount", { count: unread })}>
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
              <span>{t("nav.revenue")}</span>
            </button>
            <button
              aria-current={state.currentView === "brain" ? "page" : undefined}
              onClick={() => dispatch({ type: "SET_VIEW", view: "brain" })}
            >
              <BookOpen size={17} />
              <span>{t("nav.brain")}</span>
            </button>
            {live?.snapshot.user.role === "owner" && (
              <button
                aria-current={
                  state.currentView === "quality" ? "page" : undefined
                }
                onClick={() => dispatch({ type: "SET_VIEW", view: "quality" })}
              >
                <FlaskConical size={17} />
                <span>{t("nav.quality")}</span>
              </button>
            )}
          </>
        )}
        <button
          aria-current={state.currentView === "settings" ? "page" : undefined}
          onClick={() => dispatch({ type: "SET_VIEW", view: "settings" })}
        >
          <Settings size={17} />
          <span>{t("nav.settings")}</span>
        </button>
      </nav>
      <div className="app-channel-navigation">
        <span className="app-nav-label">{t("nav.channels")}</span>
        <nav aria-label={t("nav.channelNav")}>
          {(
            [
              {
                value: "all",
                label: t("nav.allConversations"),
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
            {t(
              state.settings.autoReplyEnabled
                ? "nav.autoReplyEnabled"
                : "nav.finalSay",
            )}
            <small>
              {t(
                mode === "live"
                  ? live?.connectionState === "connected"
                    ? "nav.connected"
                    : "nav.reconnecting"
                  : "nav.sampleMessages",
              )}
            </small>
          </div>
        </div>
        <button onClick={toggle}>
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          {t(theme === "light" ? "nav.darkMode" : "nav.lightMode")}
        </button>
        <button
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          title={t(
            locale === "en" ? "nav.switchToArabic" : "nav.switchToEnglish",
          )}
          data-locale-switch={locale === "en" ? "ar" : "en"}
        >
          <Languages size={16} />
          {locale === "en" ? "العربية" : "English"}
        </button>
        <button onClick={onHome}>
          <ArrowLeft size={16} />
          {t("nav.backToWebsite")}
        </button>
        {mode === "demo" && (
          <a
            href="/workspace"
            className="app-text-button"
            style={{ paddingInline: 10 }}
          >
            {t("nav.createWorkspace")}
            <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }} />
          </a>
        )}
      </div>
    </aside>
  );
}
