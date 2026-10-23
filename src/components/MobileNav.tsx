import { Inbox, Languages, Moon, Settings, Sun, TrendingUp, BookOpen, FlaskConical } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, useStrings } from "@/context/LocaleContext";
import { navStrings } from "@/i18n/surfaces/nav";
import { Brand } from "./landing/Brand";

export default function MobileNav({ onHome }: { onHome: () => void }) {
  const { state, dispatch, mode, live } = useApp();
  const { theme, toggle } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useStrings(navStrings);
  const unread = state.conversations.filter(
    (conversation) => conversation.unread,
  ).length;
  return (
    <>
      <header className="app-mobile-header">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onHome();
          }}
          aria-label={t("nav.backToWebsiteLabel")}
        >
          <Brand />
        </a>
        <button
          className="app-icon-button"
          onClick={toggle}
          aria-label={t(
            theme === "dark"
              ? "nav.switchToLightMode"
              : "nav.switchToDarkMode",
          )}
        >
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button
          className="app-icon-button"
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          aria-label={t(
            locale === "en" ? "nav.switchToArabic" : "nav.switchToEnglish",
          )}
          data-locale-switch={locale === "en" ? "ar" : "en"}
        >
          <Languages size={19} />
        </button>
      </header>
      <nav
        className={`app-mobile-tabs ${mode === "live" ? "revenue-mobile-tabs" : ""}`}
        aria-label={t("nav.mobileNav")}
      >
        <button
          aria-current={
            ["inbox", "chat"].includes(state.currentView) ? "page" : undefined
          }
          onClick={() => dispatch({ type: "SET_VIEW", view: "inbox" })}
        >
          <Inbox size={19} />
          <span>{t("nav.inbox")}</span>
          {unread > 0 && (
            <span
              className="nav-count"
              aria-label={t("nav.unreadCount", { count: unread })}
            >
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
              <TrendingUp size={19} />
              <span>{t("nav.revenue")}</span>
            </button>
            <button
              aria-current={state.currentView === "brain" ? "page" : undefined}
              onClick={() => dispatch({ type: "SET_VIEW", view: "brain" })}
            >
              <BookOpen size={19} />
              <span>{t("nav.brainShort")}</span>
            </button>
            {live?.snapshot.user.role === "owner" && (
              <button
                aria-current={
                  state.currentView === "quality" ? "page" : undefined
                }
                onClick={() => dispatch({ type: "SET_VIEW", view: "quality" })}
              >
                <FlaskConical size={19} />
                <span>{t("nav.quality")}</span>
              </button>
            )}
          </>
        )}
        <button
          aria-current={state.currentView === "settings" ? "page" : undefined}
          onClick={() => dispatch({ type: "SET_VIEW", view: "settings" })}
        >
          <Settings size={19} />
          <span>{t("nav.settings")}</span>
        </button>
      </nav>
    </>
  );
}
