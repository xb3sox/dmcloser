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
  return {
    mode: raw?.mode && modes.includes(raw.mode) ? raw.mode : "manual",
    cap:
      Number.isInteger(raw?.cap) && raw!.cap! >= 1 && raw!.cap! <= 100
        ? raw!.cap!
        : 20,
    eligibleUserIds: Array.isArray(raw?.eligibleUserIds)
      ? raw.eligibleUserIds
          .filter((id): id is string => typeof id === "string")
          .slice(0, 100)
      : [],
    timezone:
      typeof raw?.timezone === "string" && raw.timezone.trim()
        ? raw.timezone.trim().slice(0, 64)
        : "UTC",
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
  if (rule.mode === "manual") return null;
  const eligible =
    rule.eligibleUserIds.length === 0
      ? members
      : members.filter((m) => rule.eligibleUserIds.includes(m.userId));
  const available = eligible
    .filter((m) => m.load < rule.cap)
    .sort((a, b) => a.userId.localeCompare(b.userId));
  if (available.length === 0) return null;
  if (rule.mode === "load_capped")
    return available.reduce((best, m) => (m.load < best.load ? m : best)).userId;
  const index = lastAssignedUserId
    ? available.findIndex((m) => m.userId === lastAssignedUserId)
    : -1;
  return available[(index + 1) % available.length].userId;
}
