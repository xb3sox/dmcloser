import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/context/ThemeContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { AppProvider, useApp } from "@/context/AppContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import InboxView from "@/components/InboxView";
import ChatView from "@/components/ChatView";
import SettingsView from "@/components/SettingsView";
import LandingPage from "@/components/landing/LandingPage";
import LiveWorkspace from "@/components/workspace/LiveWorkspace";
import { WorkspaceNotices } from "@/components/workspace/AccountSettings";
import RevenueView from "@/components/revenue/RevenueView";
import BusinessBrain from "@/components/revenue/BusinessBrain";
import QualityLab from "@/components/revenue/QualityLab";
import "./styles/app.css";

function AppContent({ onHome }: { onHome: () => void }) {
  const { state, selectedConversation, storageAvailable, live, dispatch } =
    useApp();

  useEffect(() => {
    if (
      state.currentView === "revenue" &&
      live?.snapshot.flags?.revenueEnabled === false
    )
      dispatch({ type: "SET_VIEW", view: "inbox" });
  }, [state.currentView, live?.snapshot.flags?.revenueEnabled, dispatch]);

  useEffect(() => {
    document.title = `${state.currentView === "revenue" ? "Revenue" : state.currentView === "brain" ? "Business Brain" : state.currentView === "quality" ? "AI Quality Lab" : state.currentView === "settings" ? "Settings" : state.currentView === "chat" && selectedConversation ? selectedConversation.contactName : "Inbox"} - DMCloser`;
  }, [state.currentView, selectedConversation?.contactName]);

  useEffect(() => {
    document.body.classList.add("workspace-page");
    document.getElementById("app-main")?.focus({ preventScroll: true });
    return () => document.body.classList.remove("workspace-page");
  }, []);

  return (
    <div className="inbox-app">
      <a href="#app-main" className="skip-link">
        Skip to workspace
      </a>
      <Sidebar onHome={onHome} />
      <MobileNav onHome={onHome} />
      <main
        id="app-main"
        tabIndex={-1}
        className={`app-main ${state.currentView === "settings" ? "is-settings" : ""}`}
      >
        <WorkspaceNotices />
        {!storageAvailable && (
          <p className="storage-warning" role="status">
            Browser storage is unavailable. Changes will last only for this
            session.
          </p>
        )}
        {state.currentView === "revenue" &&
        live?.snapshot.flags?.revenueEnabled !== false ? (
          <RevenueView />
        ) : state.currentView === "brain" ? (
          <BusinessBrain />
        ) : state.currentView === "quality" ? (
          <QualityLab />
        ) : state.currentView === "settings" ? (
          <SettingsView />
        ) : (
          <div
            className={`inbox-layout ${state.currentView === "chat" ? "is-chat-open" : ""}`}
          >
            <InboxView />
            <ChatView key={selectedConversation?.id ?? "empty"} />
          </div>
        )}
      </main>
    </div>
  );
}

function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);
  const { dispatch } = useApp();

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    if (nextPath === "/app") dispatch({ type: "SET_VIEW", view: "inbox" });
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return path === "/workspace" || path.startsWith("/workspace/") ? (
    <LiveWorkspace onHome={() => navigate("/")}>
      <AppContent onHome={() => navigate("/")} />
    </LiveWorkspace>
  ) : path === "/app" || path.startsWith("/app/") ? (
    <AppContent onHome={() => navigate("/")} />
  ) : (
    <LandingPage onOpenApp={() => navigate("/app")} />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <MotionConfig reducedMotion="user">
          <AppProvider>
            <AppRouter />
          </AppProvider>
        </MotionConfig>
      </LocaleProvider>
    </ThemeProvider>
  );
}
