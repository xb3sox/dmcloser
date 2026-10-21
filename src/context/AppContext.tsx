import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  AppState,
  Conversation,
  Message,
  View,
  BusinessSettings,
  Tone,
  InboxChannel,
  ConversionStatus,
  WorkspaceSnapshot,
  LiveSuggestion,
} from "@/types";
import {
  mockConversations,
  defaultSettings,
  mockGenerateAiReply,
} from "@/data/mockData";

export type Action =
  | { type: "SELECT_CONVERSATION"; id: string }
  | { type: "SET_VIEW"; view: View }
  | { type: "SET_CHANNEL"; channel: InboxChannel }
  | { type: "SET_DRAFT"; conversationId: string; text: string }
  | {
      type: "SEND_MESSAGE" | "USE_AI_SUGGESTION" | "EDIT_AND_SEND";
      conversationId: string;
      text: string;
    }
  | { type: "TOGGLE_AUTO_SEND"; conversationId: string }
  | { type: "MARK_READ"; conversationId: string }
  | {
      type: "UPDATE_LEAD";
      conversationId: string;
      notes?: string;
      status?: ConversionStatus;
    }
  | { type: "UPDATE_SETTINGS"; settings: Partial<BusinessSettings> }
  | { type: "SET_TONE"; tone: Tone }
  | { type: "TOGGLE_AUTO_REPLY" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SELECT_CONVERSATION":
      if (
        !state.conversations.some(
          (conversation) => conversation.id === action.id,
        )
      )
        return state;
      return {
        ...state,
        selectedConversationId: action.id,
        currentView: "chat",
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.id
            ? { ...conversation, unread: false }
            : conversation,
        ),
      };
    case "SET_VIEW":
      return { ...state, currentView: action.view };
    case "SET_CHANNEL":
      return {
        ...state,
        channel: action.channel,
        currentView: "inbox",
        selectedConversationId: null,
      };
    case "SET_DRAFT":
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.conversationId]: action.text.slice(0, 4000),
        },
      };
    case "SEND_MESSAGE":
    case "USE_AI_SUGGESTION":
    case "EDIT_AND_SEND": {
      const text = action.text.trim().slice(0, 4000);
      if (
        !text ||
        !state.conversations.some(
          (conversation) => conversation.id === action.conversationId,
        )
      )
        return state;
      const timestamp = Date.now();
      const message: Message = {
        id: crypto.randomUUID(),
        conversationId: action.conversationId,
        sender: action.type === "USE_AI_SUGGESTION" ? "ai" : "user",
        text,
        timestamp,
      };
      return {
        ...state,
        drafts: { ...state.drafts, [action.conversationId]: "" },
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
                lastMessage: text,
                lastMessageTime: timestamp,
                unread: false,
              }
            : conversation,
        ),
      };
    }
    case "TOGGLE_AUTO_SEND":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId &&
          conversation.intent !== "spam"
            ? {
                ...conversation,
                autoSendEnabled: !conversation.autoSendEnabled,
              }
            : conversation,
        ),
      };
    case "MARK_READ":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId
            ? { ...conversation, unread: false }
            : conversation,
        ),
      };
    case "UPDATE_LEAD":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId
            ? {
                ...conversation,
                leadNotes: action.notes ?? conversation.leadNotes,
                conversionStatus:
                  action.status ?? conversation.conversionStatus,
              }
            : conversation,
        ),
      };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "SET_TONE":
      return { ...state, settings: { ...state.settings, tone: action.tone } };
    case "TOGGLE_AUTO_REPLY":
      return {
        ...state,
        settings: {
          ...state.settings,
          autoReplyEnabled: !state.settings.autoReplyEnabled,
        },
      };
    default:
      return state;
  }
}

const initialState: AppState = {
  conversations: mockConversations,
  selectedConversationId: null,
  currentView: "inbox",
  settings: defaultSettings,
  channel: "all",
  drafts: {},
};
const workspaceStorageKey = "dmcloser-workspace-v1";
const intents = ["buy", "question", "spam"];
const statuses = ["new", "engaged", "qualified", "converted", "lost"];

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Conversation;
  return (
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item.contactName === "string" &&
    typeof item.contactAvatar === "string" &&
    ["instagram", "whatsapp"].includes(item.platform) &&
    intents.includes(item.intent) &&
    statuses.includes(item.conversionStatus) &&
    typeof item.leadNotes === "string" &&
    typeof item.unread === "boolean" &&
    typeof item.autoSendEnabled === "boolean" &&
    Number.isFinite(item.lastMessageTime) &&
    Number.isFinite(new Date(item.lastMessageTime).getTime()) &&
    typeof item.lastMessage === "string" &&
    Array.isArray(item.messages) &&
    item.messages.every(
      (message) =>
        message &&
        typeof message.id === "string" &&
        typeof message.text === "string" &&
        ["contact", "ai", "user"].includes(message.sender) &&
        Number.isFinite(message.timestamp) &&
        Number.isFinite(new Date(message.timestamp).getTime()),
    )
  );
}

function initializeState(): AppState {
  try {
    const stored = localStorage.getItem(workspaceStorageKey);
    if (!stored) return initialState;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return initialState;
    const settings = { ...defaultSettings };
    const saved = parsed.settings;
    if (saved && typeof saved === "object") {
      for (const key of [
        "businessName",
        "businessDescription",
        "productsSold",
      ] as const) {
        if (typeof saved[key] === "string" && saved[key].trim())
          settings[key] = saved[key].slice(0, 2000);
      }
      if (["friendly", "premium", "aggressive"].includes(saved.tone))
        settings.tone = saved.tone;
      if (typeof saved.autoReplyEnabled === "boolean")
        settings.autoReplyEnabled = saved.autoReplyEnabled;
      if (Number.isFinite(saved.autoSendConfidenceThreshold))
        settings.autoSendConfidenceThreshold = Math.min(
          100,
          Math.max(50, Math.round(saved.autoSendConfidenceThreshold / 5) * 5),
        );
    }
    const drafts: Record<string, string> = {};
    if (parsed.drafts && typeof parsed.drafts === "object") {
      for (const [id, text] of Object.entries(parsed.drafts))
        if (typeof text === "string") drafts[id] = text.slice(0, 4000);
    }
    return {
      ...initialState,
      settings,
      drafts,
      conversations:
        Array.isArray(parsed.conversations) &&
        parsed.conversations.length > 0 &&
        parsed.conversations.every(isConversation)
          ? parsed.conversations
          : mockConversations,
    };
  } catch {
    return initialState;
  }
}

export interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  selectedConversation: Conversation | null;
  aiSuggestion: { text: string; confidence: number } | LiveSuggestion | null;
  storageAvailable: boolean;
  mode: "demo" | "live";
  update: (action: Action) => Promise<boolean>;
  live?: {
    snapshot: WorkspaceSnapshot;
    pending: boolean;
    error: string | null;
    connectionState: "connected" | "reconnecting";
    request: <T>(
      path: string,
      options?: { method?: string; body?: unknown; key?: string },
    ) => Promise<T>;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
    hold: (conversationId: string) => void;
    clearError: () => void;
    loadMore: () => Promise<void>;
    hasMore: boolean;
  };
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initializeState);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(
        workspaceStorageKey,
        JSON.stringify({
          conversations: state.conversations,
          settings: state.settings,
          drafts: state.drafts,
        }),
      );
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [state.conversations, state.settings, state.drafts]);

  const selectedConversation = useMemo(
    () =>
      state.conversations.find(
        (conversation) => conversation.id === state.selectedConversationId,
      ) ?? null,
    [state.conversations, state.selectedConversationId],
  );
  const aiSuggestion = useMemo(() => {
    if (
      !selectedConversation ||
      selectedConversation.messages.slice(-1)[0]?.sender !== "contact" ||
      selectedConversation.intent === "spam" ||
      selectedConversation.conversionStatus === "converted"
    )
      return null;
    const result = mockGenerateAiReply(selectedConversation, state.settings);
    return { text: result.text, confidence: result.confidence };
  }, [selectedConversation, state.settings]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        selectedConversation,
        aiSuggestion,
        storageAvailable,
        mode: "demo",
        update: async (action) => {
          dispatch(action);
          return true;
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
