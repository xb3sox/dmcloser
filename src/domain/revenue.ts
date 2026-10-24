import {
  type BrainEntry,
  type Deal,
  type Industry,
  type SalesInsight,
  type LeadSignal,
} from "../types/revenue.ts";
import { normalizeText, isClinical, isOptOut, isRefund, isUnsafe } from "./safety.ts";

export const scoringVersion = "revenue-rules-v1";
export const industryGuidance: Record<
  Industry,
  { question: string; next: string; boundary: string }
> = {
  general: {
    question: "What would a good outcome look like for you?",
    next: "Agree on the next step",
    boundary: "Never invent a price, availability, policy or completed action.",
  },
  real_estate: {
    question: "Which location and property type are you looking for?",
    next: "Arrange a property viewing",
    boundary:
      "No mortgage approval, investment return, protected-class profiling or legal advice.",
  },
  medical: {
    question: "Would you like help arranging a consultation with the clinic?",
    next: "Arrange a clinic consultation",
    boundary:
      "Scheduling and approved service information only. Never diagnose, request medical records, recommend treatment or promise results.",
  },
  automotive: {
    question: "Which model and purchase timeframe do you have in mind?",
    next: "Arrange a test drive",
    boundary:
      "No invented stock, finance eligibility, rates or warranty coverage.",
  },
  beauty: {
    question: "Which service and appointment day would suit you?",
    next: "Arrange a service consultation",
    boundary:
      "No promised results, diagnoses or unapproved treatment suitability claims.",
  },
  ecommerce: {
    question: "Which product or variant are you interested in?",
    next: "Prepare the right quote",
    boundary:
      "Only approved catalog prices, stock and policies. Never invent checkout links or discounts.",
  },
  custom: {
    question: "What would a good outcome look like for you?",
    next: "Agree on the next step",
    boundary:
      "Never invent a price, availability, policy or completed action.",
  },
};
export const stagePrior: Record<string, number> = {
  new: 0.1,
  qualified: 0.35,
  proposed: 0.6,
  negotiation: 0.75,
  won: 1,
  lost: 0,
};

export function scoreLead(
  deal: Deal,
  conversation: {
    intent: string;
    messages: { id: string; sender: string; text: string; timestamp: number }[];
  },
  entries: BrainEntry[],
  industry: Industry,
  cohorts: {
    stage: string;
    won: number;
    lost: number;
    rate: number | null;
  }[] = [],
  now = Date.now(),
  learning: { priceLosses: number } = { priceLosses: 0 },
): SalesInsight {
  const incoming = conversation.messages
    .filter((message) => message.sender === "contact")
    .slice(-30);
  const text = incoming.map((message) => message.text).join("\n");
  const latest = incoming[incoming.length - 1];
  const signals: LeadSignal[] = [];
  // Optimization: pre-normalize and pre-reverse incoming messages once to avoid re-normalizing across signal checks.
  const incomingReversed = incoming
    .map((msg) => ({
      ...msg,
      normalized: normalizeText(msg.text),
    }))
    .reverse();
  const matchedTest = (
    test: (value: string, normalized: string) => boolean,
    label: string,
  ) => {
    const message = incomingReversed.find((item) =>
      test(item.text, item.normalized),
    );
    if (message)
      signals.push({
        label,
        messageId: message.id,
        excerpt: message.text.slice(0, 180),
      });
    return !!message;
  };
  const matched = (pattern: RegExp, label: string) =>
    matchedTest((value) => pattern.test(value), label);
  const unsafe = isUnsafe(text);
  const optOut = matchedTest(
    (text, norm) => isOptOut(text, norm),
    "Contact opted out",
  );
  const sensitive =
    unsafe ||
    matchedTest(
      (value, norm) => isRefund(value, norm) || isClinical(value, norm),
      "Human review required",
    );
  const buying =
    !unsafe &&
    matched(
      /\b(i want to buy|i'd like to order|ready to (buy|order|book)|checkout|place an order|book (a|the)|buy (it|one|this)|reserve (it|one))\b/i,
      "Explicit purchase language",
    );
  const urgent =
    !unsafe &&
    matched(
      /\b(today|tomorrow|this week|as soon as possible)\b/i,
      "Near-term interest (unconfirmed)",
    );
  const budgetHint =
    !unsafe &&
    matched(
      /\b(my|our) budget\b|\b(can spend|budget is)\b/i,
      "Budget mentioned; confirm amount",
    );
  const authorityHint =
    !unsafe &&
    matched(
      /\b(i (am|'m) the owner|i decide|i make the decision|my (boss|partner)|our (manager|director))\b/i,
      "Authority mentioned; confirm role",
    );
  const objections: string[] = [];
  if (
    !unsafe &&
    matched(
      /\b(too expensive|cheaper|price is high|can't afford|cannot afford|over budget)\b/i,
      "Price objection",
    )
  )
    objections.push("Price");
  if (
    !unsafe &&
    matched(
      /\b(competitor|another (brand|company)|comparing|elsewhere)\b/i,
      "Comparing alternatives",
    )
  )
    objections.push("Competition");
  if (
    !unsafe &&
    matched(/\b(not now|later|need to think|not ready)\b/i, "Timing objection")
  )
    objections.push("Timing");
  if (
    !unsafe &&
    matched(/\b(reviews|trust|guarantee|proof)\b/i, "Needs reassurance")
  )
    objections.push("Trust");
  const q = deal.qualification;
  const bant: SalesInsight["bant"] = {
    budget: q.budgetMinor !== null ? "confirmed" : "unknown",
    authority: q.authority !== "unknown" ? "confirmed" : "unknown",
    need: q.need.trim() ? "confirmed" : "unknown",
    timeline: q.timelineDate ? "confirmed" : "unknown",
  };
  const qualified =
    Object.values(bant).every((status) => status === "confirmed") &&
    q.authority === "decision_maker" &&
    (q.budgetMinor || 0) > 0;
  const product = entries.find(
    (entry) =>
      entry.id === deal.productId &&
      entry.approved &&
      ["product", "service"].includes(entry.kind) &&
      entry.currency === deal.currency &&
      (!entry.expiresAt || entry.expiresAt > now),
  );
  const indicativeValueMinor = deal.valueMinor ?? product?.priceMinor ?? null;
  const risks: string[] = [];
  if (deal.escalated)
    risks.push(
      `Human escalation: ${deal.escalationReason || "Owner review requested"}`,
    );
  if (optOut) risks.push("Contact opted out. No automated outreach.");
  if (sensitive)
    risks.push("Sensitive or untrusted content. Human review only.");
  if (!["won", "lost"].includes(deal.stage)) {
    if (latest && now - latest.timestamp > 7 * 86400000)
      risks.push("No customer response in seven days.");
    if (
      deal.expectedClose &&
      deal.expectedClose < new Date(now).toISOString().slice(0, 10)
    )
      risks.push("Expected close date is overdue.");
    if (q.authority !== "decision_maker")
      risks.push("Decision-maker not confirmed.");
    if (
      q.budgetMinor !== null &&
      indicativeValueMinor !== null &&
      q.budgetMinor < indicativeValueMinor
    )
      risks.push("Confirmed budget is below deal value.");
  }
  const confirmed = Object.values(bant).filter(
    (status) => status === "confirmed",
  ).length;
  let score = Math.round(
    10 +
      Math.min(stagePrior[deal.stage] || 0, 0.75) * 35 +
      confirmed * 10 +
      (buying ? 18 : 0) +
      (urgent ? 7 : 0) +
      (budgetHint ? 3 : 0) +
      (authorityHint ? 3 : 0) -
      objections.length * 5 -
      (sensitive || optOut || deal.escalated ? 60 : 0),
  );
  score = Math.min(
    100,
    Math.max(0, conversation.intent === "spam" ? 0 : score),
  );
  const cohort = cohorts.find((item) => item.stage === deal.stage);
  const sampleSize = cohort ? cohort.won + cohort.lost : 0;
  const empirical = sampleSize >= 10 && cohort?.rate !== null;
  let probability = empirical
    ? cohort!.rate!
    : Math.min(
        0.95,
        (stagePrior[deal.stage] || 0.1) +
          confirmed * 0.025 +
          (buying ? 0.08 : 0) -
          objections.length * 0.04,
      );
  if (deal.escalated || sensitive || optOut) probability *= 0.5;
  if (
    risks.some(
      (risk) => risk.includes("overdue") || risk.includes("seven days"),
    )
  )
    probability *= 0.75;
  if (deal.stage === "won") probability = 1;
  if (deal.stage === "lost" || conversation.intent === "spam") probability = 0;
  probability = Math.round(Math.max(0, Math.min(1, probability)) * 100) / 100;
  let nextAction: string;
  let nextDraft: string | null = null;
  if (["won", "lost"].includes(deal.stage))
    nextAction =
      deal.stage === "won"
        ? "Record confirmed payment; do not count a win as cash."
        : "Use the recorded loss reason in your next review.";
  else if (
    optOut ||
    sensitive ||
    deal.escalated ||
    conversation.intent === "spam"
  )
    nextAction = "Escalate to a person. Do not send automated follow-ups.";
  else if (objections.includes("Price")) {
    nextAction =
      "Understand the price objection before offering an approved alternative.";
    nextDraft =
      "What matters most to you: the total price, the features, or the timing? I can help compare the right options.";
  } else if (learning.priceLosses >= 3 && q.budgetMinor === null) {
    nextAction = `Confirm budget early: ${learning.priceLosses} recorded losses cite price. This is observational, not causal.`;
    nextDraft =
      "Do you have a budget range in mind so I can suggest the right option?";
  } else if (objections.includes("Competition")) {
    nextAction =
      "Compare the customer's priorities against an approved competitor note.";
    nextDraft =
      "What are the most important differences you are comparing? I can help with the facts that matter to you.";
  } else if (objections.includes("Trust")) {
    nextAction = "Share approved evidence or an FAQ; never invent a guarantee.";
    nextDraft =
      "What would help you feel confident about the next step? I can clarify the details for you.";
  } else if (!q.need.trim()) {
    nextAction = "Confirm the customer's need.";
    nextDraft = industryGuidance[industry].question;
  } else if (q.authority === "unknown" || q.authority === "influencer") {
    nextAction = "Confirm who makes the decision.";
    nextDraft =
      "Will you be making the final decision, or is there someone else we should include?";
  } else if (q.budgetMinor === null) {
    nextAction = "Confirm a comfortable budget before proposing.";
    nextDraft =
      "Do you have a budget range in mind so I can suggest the right option?";
  } else if (!q.timelineDate) {
    nextAction = "Agree on a real purchase timeline.";
    nextDraft = "When would you ideally like to get started?";
  } else if (indicativeValueMinor === null)
    nextAction = "Choose an approved product or confirm the deal value.";
  else if (deal.stage === "new" || deal.stage === "qualified")
    nextAction = "Prepare an approved-price quote for review.";
  else {
    nextAction = industryGuidance[industry].next;
    nextDraft =
      "Would you like to agree on the next step, or is there anything else you would like clarified first?";
  }
  return {
    version: scoringVersion,
    score,
    probability,
    probabilityBasis: empirical
      ? "Smoothed workspace outcome rate; observational, not calibrated"
      : "Stage/qualification heuristic; not calibrated",
    sampleSize,
    hot:
      score >= 65 &&
      buying &&
      !sensitive &&
      !optOut &&
      !deal.escalated &&
      !["won", "lost"].includes(deal.stage) &&
      !!latest &&
      now - latest.timestamp < 7 * 86400000,
    indicativeValueMinor,
    valueBasis:
      deal.valueMinor !== null
        ? "Confirmed opportunity value"
        : product?.priceMinor !== null && product?.priceMinor !== undefined
          ? "Approved catalog price; indicative only"
          : "Unknown; excluded from forecast",
    qualified,
    bant,
    signals,
    objections,
    risks,
    nextAction,
    nextDraft,
    timeline: q.timelineDate
      ? `Confirmed target: ${q.timelineDate}`
      : urgent
        ? "Near-term language detected; date not confirmed"
        : "Unknown; ask before predicting a date",
    outcomeSamples: sampleSize,
  };
}
