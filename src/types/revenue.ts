export type Industry =
  | "general"
  | "real_estate"
  | "medical"
  | "automotive"
  | "beauty"
  | "ecommerce";
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
export interface BusinessProfile {
  industry: Industry;
  currency: string;
  autoStage: boolean;
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
  }[];
}
export interface RevenueOverview {
  currency: string;
  from: string;
  to: string;
  forecastTo: string;
  revenueMinor: number;
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
export const industryLabels: Record<Industry, string> = {
  general: "General",
  real_estate: "Real Estate",
  medical: "Medical Clinics",
  automotive: "Automotive",
  beauty: "Beauty",
  ecommerce: "Ecommerce",
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
export function money(minor: number | null, currency: string) {
  if (minor === null) return "Not set";
  return new Intl.NumberFormat("en-US", {
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
