export type Industry =
  | "general"
  | "real_estate"
  | "medical"
  | "automotive"
  | "beauty"
  | "ecommerce"
  | "custom";
export type BrainKind =
  | "product"
  | "service"
  | "faq"
  | "offer"
  | "competitor"
  | "playbook"
  | "voice";
export type DealStage =
  | "new"
  | "qualified"
  | "proposed"
  | "negotiation"
  | "won"
  | "lost";
export interface SectorField {
  key: string;
  label: string;
  type: "text" | "number" | "date";
  required: boolean;
}
export interface BusinessProfile {
  industry: Industry;
  currency: string;
  autoStage: boolean;
  sectorFields: SectorField[];
}
export interface BrainEntry {
  id: string;
  kind: BrainKind;
  title: string;
  content: string;
  priceMinor: number | null;
  currency: string;
  approved: boolean;
  expiresAt: number | null;
  version: number;
}
export interface BrainLink {
  id: string;
  fromId: string;
  toId: string;
  relation: "answers" | "supports" | "competes_with" | "bundles";
}
export interface Qualification {
  budgetMinor: number | null;
  authority: "unknown" | "decision_maker" | "influencer";
  need: string;
  timelineDate: string | null;
  /** Custom sector field values, keyed by the sector field key. */
  custom?: Record<string, string>;
}
export interface Deal {
  id: string;
  conversationId: string;
  stage: DealStage;
  valueMinor: number | null;
  currency: string;
  expectedClose: string | null;
  productId: string | null;
  qualification: Qualification;
  campaign: string;
  source: string;
  escalated: boolean;
  escalationReason: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface LeadSignal {
  label: string;
  messageId: string;
  excerpt: string;
}
export interface SalesInsight {
  version: string;
  score: number;
  probability: number;
  probabilityBasis: string;
  sampleSize: number;
  hot: boolean;
  indicativeValueMinor: number | null;
  valueBasis: string;
  qualified: boolean;
  bant: Record<
    "budget" | "authority" | "need" | "timeline",
    "confirmed" | "unknown"
  >;
  signals: LeadSignal[];
  objections: string[];
  risks: string[];
  nextAction: string;
  nextDraft: string | null;
  timeline: string;
  outcomeSamples: number;
}
export interface SalesTask {
  id: string;
  kind: "follow_up" | "escalation";
  dueAt: number;
  status: "scheduled" | "ready" | "done" | "cancelled";
  text: string;
  reason: string;
}
export interface DealQuote {
  id: string;
  totalMinor: number;
  currency: string;
  status: string;
  lines: {
    title: string;
    quantity: number;
    unitMinor: number;
    entryId: string;
    version: number;
  }[];
  expiresAt: number;
  text: string;
}
export interface Appointment {
  id: string;
  title: string;
  startAt: number;
  endAt: number;
  resource: string;
  status: "confirmed" | "cancelled";
}
export interface Outcome {
  id: string;
  outcome: "won" | "lost";
  reason: string;
  note: string;
  valueMinor: number | null;
  currency: string;
  createdAt: string;
}
export interface DealDetail {
  deal: Deal;
  insight: SalesInsight;
  quotes: DealQuote[];
  appointments: Appointment[];
  tasks: SalesTask[];
  outcome: Outcome | null;
  payments: {
    id: string;
    amountMinor: number;
    kind: "payment" | "refund";
    reference: string;
    occurredAt: number;
    voided?: boolean;
  }[];
}
export interface VerifiedReceipt {
  id: string;
  dealId: string;
  name: string;
  amountMinor: number;
  kind: "payment" | "refund";
  reference: string;
  occurredAt: number;
}
export interface RevenueOverview {
  currency: string;
  from: string;
  to: string;
  forecastTo: string;
  revenueMinor: number;
  /** Refunds reversed inside the same period as revenueMinor. */
  reversedMinor: number;
  /** Owner-confirmed receipts behind revenueMinor, one row per ledger event. */
  verifiedReceipts: VerifiedReceipt[];
  wonMinor: number;
  pipelineMinor: number;
  forecastMinor: number;
  unknownValueDeals: number;
  undatedDeals: number;
  conversionRate: number | null;
  qualifiedLeads: number;
  hotLeads: number;
  wonDeals: number;
  lostDeals: number;
  opportunities: {
    deal: Deal;
    insight: SalesInsight;
    name: string;
    platform: string;
  }[];
  reasons: { outcome: string; reason: string; count: number }[];
  attribution: {
    source: string;
    campaign: string;
    revenueMinor: number;
    wonMinor: number;
    wonDeals: number;
  }[];
  learning: {
    samples: number;
    successfulReplies: number;
    byStage: {
      stage: string;
      won: number;
      lost: number;
      rate: number | null;
    }[];
    lessons: string[];
  };
}
/**
 * One open opportunity waiting on a person. The recovery list is a human
 * worklist: it never sends anything by itself.
 */
export interface RecoveryEntry {
  dealId: string;
  conversationId: string;
  name: string;
  platform: string;
  stage: DealStage;
  daysStale: number;
  reason: string;
  nextAction: string;
  valueMinor: number | null;
  currency: string;
  insight?: SalesInsight;
}
export interface RecoveryList {
  /** Stale open opportunities, most stale first. */
  entries: RecoveryEntry[];
  /** Entries an operator dismissed. They can be restored. */
  dismissed: RecoveryEntry[];
  notice: string;
}
export const industryLabels: Record<Industry, string> = {
  general: "General",
  real_estate: "Real Estate",
  medical: "Medical Clinics",
  automotive: "Automotive",
  beauty: "Beauty",
  ecommerce: "Ecommerce",
  custom: "Custom",
};
export const stageLabels: Record<DealStage, string> = {
  new: "New lead",
  qualified: "Qualified",
  proposed: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};
export const brainLabels: Record<BrainKind, string> = {
  product: "Product",
  service: "Service",
  faq: "FAQ",
  offer: "Offer",
  competitor: "Competitor",
  playbook: "Sales playbook",
  voice: "Brand voice",
};
/**
 * Display-only money format. The locale parameter is for the client; server
 * call sites keep the default en-US because the AI grounding check compares
 * the formatted string against approved facts verbatim.
 */
export function money(
  minor: number | null,
  currency: string,
  locale = "en-US",
) {
  if (minor === null) return "Not set";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
export function parseMoney(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return NaN;
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor <= 100000000000 ? minor : NaN;
}
