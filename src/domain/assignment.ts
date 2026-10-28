import type { AssignmentMode, AssignmentSettings } from "../types/index.ts";
const modes: AssignmentMode[] = ["manual", "round_robin", "load_capped"];
export const defaultAssignment: AssignmentSettings = {
  mode: "manual",
  cap: 20,
  eligibleUserIds: [],
  timezone: "UTC",
};
export function normalizeAssignment(value: unknown): AssignmentSettings {
  const raw = value as Partial<AssignmentSettings> | undefined;
  const cap = raw?.cap;
  if (
    !raw ||
    typeof raw !== "object" ||
    !raw.mode ||
    !modes.includes(raw.mode) ||
    typeof cap !== "number" ||
    !Number.isInteger(cap) ||
    cap < 1 ||
    cap > 100 ||
    !Array.isArray(raw.eligibleUserIds) ||
    raw.eligibleUserIds.some((id) => typeof id !== "string") ||
    typeof raw.timezone !== "string" ||
    !raw.timezone.trim()
  )
    return defaultAssignment;
  return {
    mode: raw.mode,
    cap,
    eligibleUserIds: raw.eligibleUserIds.slice(0, 100),
    timezone: raw.timezone.trim().slice(0, 64),
  };
}

export interface AssignmentCandidate {
  userId: string;
  load: number;
}

export function chooseAssignee(
  rule: AssignmentSettings,
  members: AssignmentCandidate[],
  lastAssignedUserId: string | null = null,
): string | null {
  if (rule.mode === "manual" || rule.eligibleUserIds.length === 0) return null;
  const order = members
    .filter((m) => rule.eligibleUserIds.includes(m.userId))
    .sort((a, b) => a.userId.localeCompare(b.userId));
  if (order.length === 0) return null;
  if (rule.mode === "load_capped") {
    const available = order.filter((m) => m.load < rule.cap);
    if (available.length === 0) return null;
    return available.reduce((best, m) => (m.load < best.load ? m : best)).userId;
  }
  const start = lastAssignedUserId
    ? order.findIndex((m) => m.userId === lastAssignedUserId)
    : -1;
  for (let step = 1; step <= order.length; step++) {
    const candidate = order[(start + step) % order.length];
    if (candidate.load < rule.cap) return candidate.userId;
  }
  return null;
}
