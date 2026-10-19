import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight, Check, LogIn, RefreshCw } from "lucide-react";
import {
  AppContext,
  type Action,
  type AppContextValue,
} from "@/context/AppContext";
import { api, apiBase, ApiError } from "@/lib/api";
import type { AppState, WorkspaceSnapshot } from "@/types";
import { Brand } from "../landing/Brand";
import "./workspace.css";

function AuthScreen({
  onAuthenticated,
  onHome,
}: {
  onAuthenticated: () => void;
  onHome: () => void;
}) {
  const params = new URLSearchParams(window.location.search);
  const [view, setView] = useState<
    "register" | "login" | "recover" | "reset" | "verify"
  >(
    params.has("reset")
      ? "reset"
      : params.has("verify")
        ? "verify"
        : params.has("login")
          ? "login"
          : "register",
  );
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    document.title = `${view === "login" ? "Sign in" : view === "register" ? "Create your workspace" : "Account recovery"} - DMCloser`;
  }, [view]);
  function switchView(next: typeof view) {
    setView(next);
    setError("");
    setNotice("");
    setPassword("");
  }
  const title = {
    register: "Your next chapter starts here.",
    login: "Welcome back.",
    recover: "A fresh start for your password.",
    reset: "Set a new password.",
    verify: "One last step.",
  }[view];
  return (
    <main className="workspace-auth">
      <header>
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onHome();
          }}
          aria-label="DMCloser home"
        >
          <Brand />
        </a>
        <a href="/app">
          Explore the demo
          <ArrowRight size={14} />
        </a>
      </header>
      <div className="workspace-auth-content">
        <span className="app-section-label">Your business. Your voice.</span>
        <h1>{title}</h1>
        <p>
          {view === "register"
            ? "A private inbox for your business, with 14 days to make it yours. No card required."
            : view === "login"
              ? "Your conversations are right where you left them."
              : view === "verify"
                ? "Confirm your email to connect your messaging accounts."
                : "Use a unique password with at least 12 characters."}
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            setNotice("");
            try {
              if (view === "register")
                await api("/auth/register", {
                  method: "POST",
                  body: { name, businessName: business, email, password },
                });
              if (view === "login")
                await api("/auth/login", {
                  method: "POST",
                  body: { email, password },
                });
              if (view === "recover") {
                const value = await api<{ message: string }>("/auth/recover", {
                  method: "POST",
                  body: { email },
                });
                setNotice(value.message);
              }
              if (view === "reset") {
                await api("/auth/reset", {
                  method: "POST",
                  body: { token: params.get("reset"), password },
                });
                window.history.replaceState({}, "", "/workspace?login");
                switchView("login");
                setNotice("Password changed. Sign in with your new password.");
              }
              if (view === "verify") {
                await api("/auth/verify", {
                  method: "POST",
                  body: { token: params.get("verify") },
                });
                window.history.replaceState({}, "", "/workspace?login");
                switchView("login");
                setNotice("Email verified. Sign in to continue.");
              }
              if (view === "register" || view === "login") onAuthenticated();
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Please try again.",
              );
            } finally {
              setPending(false);
              setPassword("");
            }
          }}
        >
          {view === "register" && (
            <>
              <label htmlFor="account-name">
                Your name
                <input
                  id="account-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  required
                />
              </label>
              <label htmlFor="account-business">
                Business name
                <input
                  id="account-business"
                  autoComplete="organization"
                  value={business}
                  onChange={(event) => setBusiness(event.target.value)}
                  maxLength={100}
                  required
                />
              </label>
            </>
          )}
          {["register", "login", "recover"].includes(view) && (
            <label htmlFor="account-email">
              Work email
              <input
                type="email"
                id="account-email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
              />
            </label>
          )}
          {["register", "login", "reset"].includes(view) && (
            <label htmlFor="account-password">
              Password
              <input
                type="password"
                id="account-password"
                aria-label="Password"
                aria-describedby={
                  view !== "login" ? "account-password-help" : undefined
                }
                autoComplete={
                  view === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={view === "login" ? 1 : 12}
                maxLength={128}
                required
              />
              {view !== "login" && (
                <span id="account-password-help">At least 12 characters.</span>
              )}
            </label>
          )}
          {error && (
            <p className="workspace-form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="workspace-form-notice" role="status">
              <Check size={15} />
              {notice}
            </p>
          )}
          <button
            className="closer-button closer-button-primary"
            disabled={pending}
            type="submit"
          >
            {pending
              ? "One moment..."
              : {
                  register: "Create workspace",
                  login: "Sign in",
                  recover: "Send recovery link",
                  reset: "Save new password",
                  verify: "Verify email",
                }[view]}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="workspace-auth-links">
          {view === "register" ? (
            <button onClick={() => switchView("login")}>
              Already have an account? Sign in
              <LogIn size={14} />
            </button>
          ) : (
            <button onClick={() => switchView("register")}>
              Create a new workspace
              <ArrowRight size={14} />
            </button>
          )}
          {view === "login" && (
            <button onClick={() => switchView("recover")}>
              Forgot your password?
            </button>
          )}
        </div>
        <p className="workspace-auth-note">
          Account data is stored on the server. Connecting Meta accounts
          requires approved business permissions. Live AI needs the service
          owner's API configuration.
        </p>
        <button className="app-text-button" onClick={onHome}>
          <ArrowLeft size={14} />
          Back to the website
        </button>
      </div>
      <footer>DMCloser. A little closer, every day.</footer>
    </main>
  );
}

function ServerWorkspaceProvider({
  initial,
  children,
  onSessionLost,
}: {
  initial: WorkspaceSnapshot;
  children: ReactNode;
  onSessionLost: () => void;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [state, setState] = useState<AppState>({
    conversations: initial.conversations,
    settings: initial.settings,
    drafts: initial.drafts,
    currentView: "inbox",
    selectedConversationId: null,
    channel: "all",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connected" | "reconnecting"
  >("connected");
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const dirtyDrafts = useRef<Record<string, string>>({});
  const draftTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const draftChains = useRef<Record<string, Promise<unknown>>>({});
  const requestKeys = useRef<Record<string, string>>({});
  const selectedRef = useRef(state);
  selectedRef.current = state;

  const request = useCallback(
    <T,>(
      path: string,
      options: { method?: string; body?: unknown; key?: string } = {},
    ) => api<T>(path, { ...options, csrf: snapshotRef.current.csrf }),
    [],
  );
  const refresh = useCallback(async () => {
    try {
      const selectedId = selectedRef.current.selectedConversationId;
      const next = await request<WorkspaceSnapshot>(
        selectedId
          ? `/bootstrap?include=${encodeURIComponent(selectedId)}`
          : "/bootstrap",
      );
      setSnapshot(next);
      setState((previous) => ({
        ...previous,
        conversations: next.conversations,
        settings: next.settings,
        drafts: { ...next.drafts, ...dirtyDrafts.current },
      }));
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401)
        onSessionLost();
      else
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not refresh your inbox.",
        );
    }
  }, [request, onSessionLost]);

  useEffect(() => {
    const stream = new EventSource(`${apiBase}/api/events`, {
      withCredentials: true,
    });
    let debounce: ReturnType<typeof setTimeout>;
    stream.addEventListener("sync", () => {
      setConnectionState("connected");
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        void refresh();
      }, 80);
    });
    stream.onerror = () => setConnectionState("reconnecting");
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      stream.close();
      clearTimeout(debounce);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  useEffect(
    () => () => {
      for (const timer of Object.values(draftTimers.current))
        clearTimeout(timer);
    },
    [],
  );

  function persistDraft(id: string, text: string) {
    const previous = draftChains.current[id] || Promise.resolve();
    const chain = previous
      .catch(() => {})
      .then(() =>
        request("/conversations/" + encodeURIComponent(id) + "/draft", {
          method: "PUT",
          body: { text },
        }),
      )
      .then(() => {
        if (dirtyDrafts.current[id] === text) delete dirtyDrafts.current[id];
      })
      .catch((failure) => {
        setError(
          failure instanceof Error
            ? failure.message
            : "Your draft has not been saved.",
        );
      });
    draftChains.current[id] = chain;
    return chain;
  }
  function hold(id: string) {
    void request(`/conversations/${encodeURIComponent(id)}/hold`, {
      method: "POST",
      body: {},
    }).catch((failure) =>
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not pause automation.",
      ),
    );
  }

  async function update(action: Action): Promise<boolean> {
    if (action.type === "SET_VIEW") {
      setState((previous) => ({ ...previous, currentView: action.view }));
      return true;
    }
    if (action.type === "SET_CHANNEL") {
      setState((previous) => ({
        ...previous,
        channel: action.channel,
        currentView: "inbox",
        selectedConversationId: null,
      }));
      return true;
    }
    if (action.type === "SET_DRAFT") {
      const id = action.conversationId,
        text = action.text;
      setState((previous) => ({
        ...previous,
        drafts: { ...previous.drafts, [id]: text },
      }));
      if (!dirtyDrafts.current[id] && text.trim()) hold(id);
      dirtyDrafts.current[id] = text;
      clearTimeout(draftTimers.current[id]);
      draftTimers.current[id] = setTimeout(() => {
        void persistDraft(id, text);
      }, 250);
      return true;
    }
    if (action.type === "SELECT_CONVERSATION")
      setState((previous) => ({
        ...previous,
        selectedConversationId: action.id,
        currentView: "chat",
        conversations: previous.conversations.map((conversation) =>
          conversation.id === action.id
            ? { ...conversation, unread: false }
            : conversation,
        ),
      }));
    setPending(true);
    setError(null);
    try {
      const id =
        "conversationId" in action
          ? action.conversationId
          : action.type === "SELECT_CONVERSATION"
            ? action.id
            : "";
      if (action.type === "SELECT_CONVERSATION" || action.type === "MARK_READ")
        await request(`/conversations/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: { unread: false },
        });
      else if (action.type === "UPDATE_LEAD")
        await request(`/conversations/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: { notes: action.notes, status: action.status },
        });
      else if (action.type === "TOGGLE_AUTO_SEND") {
        const conversation = selectedRef.current.conversations.find(
          (item) => item.id === id,
        );
        await request(`/conversations/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: { autoSend: !conversation?.autoSendEnabled },
        });
      } else if (
        action.type === "UPDATE_SETTINGS" ||
        action.type === "SET_TONE" ||
        action.type === "TOGGLE_AUTO_REPLY"
      )
        await request("/settings", {
          method: "PATCH",
          body:
            action.type === "UPDATE_SETTINGS"
              ? action.settings
              : action.type === "SET_TONE"
                ? { tone: action.tone }
                : {
                    autoReplyEnabled:
                      !selectedRef.current.settings.autoReplyEnabled,
                  },
        });
      else if (
        action.type === "SEND_MESSAGE" ||
        action.type === "USE_AI_SUGGESTION" ||
        action.type === "EDIT_AND_SEND"
      ) {
        clearTimeout(draftTimers.current[id]);
        await draftChains.current[id];
        const suggestion = snapshotRef.current.suggestions.find(
          (item) => item.conversationId === id,
        );
        const identifier = `${id}:${action.text}`;
        requestKeys.current[identifier] ||= crypto.randomUUID();
        await request(`/conversations/${encodeURIComponent(id)}/messages`, {
          method: "POST",
          key: requestKeys.current[identifier],
          body: {
            text: action.text,
            ...(action.type === "USE_AI_SUGGESTION" && suggestion
              ? { sourceId: suggestion.sourceId }
              : {}),
          },
        });
        delete requestKeys.current[identifier];
        delete dirtyDrafts.current[id];
        setState((previous) => ({
          ...previous,
          drafts: { ...previous.drafts, [id]: "" },
        }));
      }
      await refresh();
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The action could not be completed.",
      );
      return false;
    } finally {
      setPending(false);
    }
  }
  const selectedConversation = useMemo(
    () =>
      state.conversations.find(
        (conversation) => conversation.id === state.selectedConversationId,
      ) ?? null,
    [state.conversations, state.selectedConversationId],
  );
  const suggestion =
    snapshot.suggestions.find(
      (item) =>
        item.conversationId === selectedConversation?.id &&
        item.sourceId === selectedConversation.messages.slice(-1)[0]?.id,
    ) || null;
  const context: AppContextValue = {
    state,
    dispatch: (action) => {
      void update(action);
    },
    update,
    selectedConversation,
    aiSuggestion: suggestion,
    storageAvailable: true,
    mode: "live",
    live: {
      snapshot,
      pending,
      error,
      connectionState,
      request,
      refresh,
      hold,
      clearError: () => setError(null),
      logout: async () => {
        await request("/auth/logout", { method: "POST", body: {} });
        onSessionLost();
      },
    },
  };
  return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
}

export default function LiveWorkspace({
  children,
  onHome,
}: {
  children: ReactNode;
  onHome: () => void;
}) {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const sessionLost = useCallback(() => {
    setSnapshot(null);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setFailure("");
    try {
      const session = await api<{ user: unknown }>("/session");
      if (session.user) setSnapshot(await api<WorkspaceSnapshot>("/bootstrap"));
      else setSnapshot(null);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "The server is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading)
    return (
      <main className="workspace-service-state">
        <Brand />
        <span className="workspace-loading-line" />
        <p>Opening your workspace...</p>
      </main>
    );
  if (failure)
    return (
      <main className="workspace-service-state">
        <Brand />
        <h1>Your workspace is a moment away.</h1>
        <p role="alert">{failure}</p>
        <button
          className="closer-button closer-button-primary"
          onClick={() => {
            void load();
          }}
        >
          Try again
          <RefreshCw size={15} />
        </button>
        <a href="/app" className="app-text-button">
          Explore the offline demo
          <ArrowRight size={14} />
        </a>
      </main>
    );
  if (!snapshot || new URLSearchParams(window.location.search).has("reset"))
    return (
      <AuthScreen
        onAuthenticated={() => {
          void load();
        }}
        onHome={onHome}
      />
    );
  return (
    <ServerWorkspaceProvider initial={snapshot} onSessionLost={sessionLost}>
      {children}
    </ServerWorkspaceProvider>
  );
}
