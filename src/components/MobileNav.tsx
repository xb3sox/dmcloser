import { Inbox, Moon, Settings, Sun, TrendingUp, BookOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { Brand } from "./landing/Brand";

export default function MobileNav({ onHome }: { onHome: () => void }) {
  const { state, dispatch, mode } = useApp();
  const { theme, toggle } = useTheme();
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
          aria-label="Back to DMCloser website"
        >
          <Brand />
        </a>
        <button
          className="app-icon-button"
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </header>
      <nav
        className={`app-mobile-tabs ${mode === "live" ? "revenue-mobile-tabs" : ""}`}
        aria-label="Mobile workspace navigation"
      >
        <button
          aria-current={
            ["inbox", "chat"].includes(state.currentView) ? "page" : undefined
          }
          onClick={() => dispatch({ type: "SET_VIEW", view: "inbox" })}
        >
          <Inbox size={19} />
          <span>Inbox</span>
          {unread > 0 && <span className="nav-count">{unread}</span>}
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
              <span>Revenue</span>
            </button>
            <button
              aria-current={state.currentView === "brain" ? "page" : undefined}
              onClick={() => dispatch({ type: "SET_VIEW", view: "brain" })}
            >
              <BookOpen size={19} />
              <span>Brain</span>
            </button>
          </>
        )}
        <button
          aria-current={state.currentView === "settings" ? "page" : undefined}
          onClick={() => dispatch({ type: "SET_VIEW", view: "settings" })}
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>
      </nav>
    </>
  );
}
