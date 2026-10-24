export type Platform = "instagram" | "whatsapp";

export type InboxChannel = Platform | "all";

export type Intent = "buy" | "question" | "spam";

export type ConversionStatus =
  | "new"
  | "engaged"
  | "qualified"
  | "converted"
  | "lost";

export type Tone = "friendly" | "premium" | "aggressive";

export interface Message {
  id: string;
  conversationId: string;
  sender: "contact" | "ai" | "user";
  text: string;
  timestamp: number;
  isAiSuggestion?: boolean;
  suggestionConfidence?: number;
  deliveryStatus?:
    | "received"
    | "queued"
    | "sending"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "uncertain"
    | "cancelled";
  deliveryError?: string | null;
  automatic?: boolean;
}

export interface Conversation {
  id: string;
  contactName: string;
  contactAvatar: string;
  platform: Platform;
  lastMessage: string;
  lastMessageTime: number;
  intent: Intent;
  conversionStatus: ConversionStatus;
  messages: Message[];
  unread: boolean;
  autoSendEnabled: boolean;
  leadNotes: string;
  leadMemory?: string;
  windowUntil?: number;
  aiError?: string | null;
  connectionId?: string | null;
}

export interface LiveSuggestion {
  id: string;
  conversationId: string;
  sourceId: string;
  text: string;
  confidence: number;
  safe: boolean;
  reason: string;
  latencyMs: number;
}
export interface WorkspaceSnapshot {
  user: {
    id: string;
    name: string;
    email: string;
    role: "owner" | "member";
    verified: boolean;
  };
  csrf: string;
  workspace: {
    id: string;
    plan: string;
    billingStatus: string;
    trialUntil: number;
    active: boolean;
    conversationLimit: number;
    aiLimit: number;
  };
  settings: BusinessSettings;
  conversations: Conversation[];
  nextCursor: string | null;
  drafts: Record<string, string>;
  suggestions: LiveSuggestion[];
  connections: {
    id: string;
    platform: Platform;
    label: string;
    accountId: string;
    status: string;
    error: string | null;
    expiresAt: number | null;
  }[];
  usage: { aiReplies: number; conversations: number; failedJobs: number };
  members: {
    id: string;
    email: string;
    name: string;
    role: "owner" | "member";
  }[];
  audit: {
    action: string;
    resource_id: string | null;
    detail: Record<string, unknown>;
    created_at: string;
  }[];
  capabilities: {
    ai: boolean;
    instagram: boolean;
    whatsapp: boolean;
    billing: boolean;
    email: boolean;
    simulator: boolean;
    storage: string;
  };
}

export interface BusinessSettings {
  businessName: string;
  businessDescription: string;
  productsSold: string;
  tone: Tone;
  autoReplyEnabled: boolean;
  autoSendConfidenceThreshold: number;
  analyticsConsent: boolean;
}

export type View = "inbox" | "chat" | "settings" | 'revenue' | 'brain' | 'quality';

export interface AppState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  currentView: View;
  settings: BusinessSettings;
  channel: InboxChannel;
  drafts: Record<string, string>;
}
