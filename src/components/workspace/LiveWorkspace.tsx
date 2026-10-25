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
import { useStrings } from "@/context/LocaleContext";
import { workspaceStrings } from "@/i18n/surfaces/workspace";
import { api, apiBase, ApiError } from "@/lib/api";
import type { AppState, Conversation, WorkspaceSnapshot } from "@/types";
import { Brand } from "../landing/Brand";
import "./workspace.css";

function mergeConversations(
  existing: Conversation[],
  incoming: Conversation[],
): Conversation[] {
  // Refresh rows that already exist instead of dropping the newer payload: a
  // sync event must replace stale previews, unread counts and last-message data.
  const updates = new Map(incoming.map((conversation) => [conversation.id, conversation]));
  const merged = existing.map((conversation) => updates.get(conversation.id) ?? conversation);
  const existingIds = new Set(existing.map((conversation) => conversation.id));
  const extra = incoming.filter((conversation) => !existingIds.has(conversation.id));
  return [...merged, ...extra];
}

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
  const t = useStrings(workspaceStrings);
  useEffect(() => {
    document.title = `${
      view === "login"
        ? t("workspace.auth.documentTitle.signIn")
        : view === "register"
          ? t("workspace.auth.documentTitle.register")
          : t("workspace.auth.documentTitle.recover")
    }`;
  }, [view, t]);
  function switchView(next: typeof view) {
    setView(next);
    setError("");
    setNotice("");
    setPassword("");
  }
  const title = {
    register: t("workspace.auth.title.register"),
    login: t("workspace.auth.title.login"),
    recover: t("workspace.auth.title.recover"),
    reset: t("workspace.auth.title.reset"),
    verify: t("workspace.auth.title.verify"),
  }[view];
  return (
    <main className="workspace-auth">
      <header>
        <button
          className="app-text-button"
          onClick={onHome}
          aria-label={t("workspace.auth.homeLabel")}
        >
          <Brand />
        </button>
        <a href="/app">
          {t("workspace.auth.exploreDemo")}
          <ArrowRight size={14} />
        </a>
      </header>
      <div className="workspace-auth-content">
        <span className="app-section-label">
          {t("workspace.auth.eyebrow")}
        </span>
        <h1>{title}</h1>
        <p>
          {view === "register"
            ? t("workspace.auth.subtitle.register")
            : view === "login"
              ? t("workspace.auth.subtitle.login")
              : view === "verify"
                ? t("workspace.auth.subtitle.verify")
                : t("workspace.auth.subtitle.password")}
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
                setNotice(t("workspace.auth.notice.passwordChanged"));
              }
              if (view === "verify") {
                await api("/auth/verify", {
                  method: "POST",
                  body: { token: params.get("verify") },
                });
                window.history.replaceState({}, "", "/workspace?login");
                switchView("login");
                setNotice(t("workspace.auth.notice.emailVerified"));
              }
              if (view === "register" || view === "login") onAuthenticated();
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : t("workspace.common.tryAgain"),
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
                {t("workspace.auth.field.name")}
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
                {t("workspace.auth.field.business")}
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
              {t("workspace.auth.field.email")}
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
              {t("workspace.auth.field.password")}
              <input
                type="password"
                id="account-password"
                aria-label={t("workspace.auth.field.password")}
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
                <span id="account-password-help">
                  {t("workspace.auth.field.passwordHelp")}
                </span>
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
              ? t("workspace.auth.pending")
              : {
                  register: t("workspace.auth.submit.register"),
                  login: t("workspace.auth.submit.login"),
                  recover: t("workspace.auth.submit.recover"),
                  reset: t("workspace.auth.submit.reset"),
                  verify: t("workspace.auth.submit.verify"),
                }[view]}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="workspace-auth-links">
          {view === "register" ? (
            <button onClick={() => switchView("login")}>
              {t("workspace.auth.switch.login")}
              <LogIn size={14} />
            </button>
          ) : (
            <button onClick={() => switchView("register")}>
              {t("workspace.auth.switch.register")}
              <ArrowRight size={14} />
            </button>
          )}
          {view === "login" && (
            <button onClick={() => switchView("recover")}>
              {t("workspace.auth.forgotPassword")}
            </button>
          )}
        </div>
        <p className="workspace-auth-note">{t("workspace.auth.note")}</p>
        <button
          className="app-text-button"
          onClick={onHome}
        >
          <ArrowLeft size={14} />
          {t("workspace.auth.backToSite")}
        </button>
      </div>
      <footer>{t("workspace.auth.footer")}</footer>
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
  const t = useStrings(workspaceStrings);
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
  const [nextCursor, setNextCursor] = useState<string | null>(
    initial.nextCursor ?? null,
  );
  const [activeFilters, setActiveFilters] = useState<{
    channel?: string;
    intent?: string;
    unreadOnly?: boolean;
    leadStatus?: string;
    assignee?: string;
    timeRange?: string;
    search?: string;
  }>({});
  const activeFiltersRef = useRef(activeFilters);
  activeFiltersRef.current = activeFilters;
  const extraPages = useRef(0);
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

  const filterParams = useCallback((filters = activeFiltersRef.current) => {
    const params = new URLSearchParams();
    if (filters.channel && filters.channel !== "all") params.set("channel", filters.channel);
    if (filters.intent && filters.intent !== "all") params.set("intent", filters.intent);
    if (filters.unreadOnly) params.set("unread", "true");
    if (filters.leadStatus && filters.leadStatus !== "all") params.set("leadStatus", filters.leadStatus);
    if (filters.assignee && filters.assignee !== "all") params.set("assignee", filters.assignee);
    if (filters.timeRange && filters.timeRange !== "all") params.set("timeRange", filters.timeRange);
    if (filters.search && filters.search.trim()) params.set("search", filters.search.trim());
    return params;
  }, []);

  const refresh = useCallback(async (overrideFilters?: typeof activeFilters) => {
    try {
      const selectedId = selectedRef.current.selectedConversationId;
      const params = filterParams(overrideFilters ?? activeFiltersRef.current);
      if (selectedId) params.set("include", selectedId);
      const queryString = params.toString();
      const path = `/bootstrap${queryString ? `?${queryString}` : ""}`;
      const next = await request<WorkspaceSnapshot>(path);
      let conversations = next.conversations;
      let cursor = next.nextCursor ?? null;
      for (let page = 0; page < extraPages.current && cursor; page++) {
        const pageParams = filterParams(overrideFilters ?? activeFiltersRef.current);
        pageParams.set("cursor", cursor);
        const result = await request<{
          conversations: Conversation[];
          nextCursor: string | null;
        }>(`/conversations?${pageParams.toString()}`);
        conversations = mergeConversations(conversations, result.conversations);
        cursor = result.nextCursor;
      }
      setSnapshot({ ...next, conversations });
      setNextCursor(cursor);
      setState((previous) => ({
        ...previous,
        conversations,
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
            : t("workspace.error.refreshInbox"),
        );
    }
  }, [request, onSessionLost, t]);
  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    try {
      const params = filterParams();
      params.set("cursor", nextCursor);
      const result = await request<{
        conversations: Conversation[];
        nextCursor: string | null;
      }>(`/conversations?${params.toString()}`);
      extraPages.current += 1;
      setNextCursor(result.nextCursor);
      setState((previous) => ({
        ...previous,
        conversations: mergeConversations(
          previous.conversations,
          result.conversations,
        ),
      }));
      setSnapshot((previous) => ({
        ...previous,
        conversations: mergeConversations(
          previous.conversations,
          result.conversations,
        ),
      }));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : t("workspace.error.loadMore"),
      );
    }
  }, [nextCursor, request, t]);

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
            : t("workspace.error.draftNotSaved"),
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
          : t("workspace.error.pauseAutomation"),
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
          : t("workspace.error.actionFailed"),
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
  const setFilters = useCallback(
    (newFilters: typeof activeFilters) => {
      const current = activeFiltersRef.current;
      const isChanged =
        current.channel !== newFilters.channel ||
        current.intent !== newFilters.intent ||
        current.unreadOnly !== newFilters.unreadOnly ||
        current.leadStatus !== newFilters.leadStatus ||
        current.assignee !== newFilters.assignee ||
        current.timeRange !== newFilters.timeRange ||
        current.search !== newFilters.search;

      if (isChanged) {
        extraPages.current = 0;
        setActiveFilters(newFilters);
        activeFiltersRef.current = newFilters;
        void refresh(newFilters);
      }
    },
    [refresh],
  );

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
      loadMore,
      hasMore: !!nextCursor,
      setFilters,
      logout: async () => {
        await request("/auth/logout", { method: "POST", body: {} });
        onSessionLost();
      },
    } as AppContextValue["live"],
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
  const t = useStrings(workspaceStrings);
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
        error instanceof Error
          ? error.message
          : t("workspace.service.unavailable"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading)
    return (
      <main className="workspace-service-state">
        <Brand />
        <span className="workspace-loading-line" />
        <p>{t("workspace.service.loading")}</p>
      </main>
    );
  if (failure)
    return (
      <main className="workspace-service-state">
        <Brand />
        <h1>{t("workspace.service.unavailableTitle")}</h1>
        <p role="alert">{failure}</p>
        <button
          className="app-text-button"
          onClick={() => {
            void load();
          }}
        >
          {t("workspace.service.tryAgain")}
          <RefreshCw size={15} />
        </button>
        <a href="/app" className="app-text-button">
          {t("workspace.service.exploreDemo")}
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
