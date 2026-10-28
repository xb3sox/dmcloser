import type { Database } from "./db.ts";

export interface Flags {
  automationEnabled: boolean;
  revenueEnabled: boolean;
}

type Env = Record<string, string | undefined>;

function envBoolean(env: Env, name: string): boolean | undefined {
  const raw = env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return undefined;
  // A typo must fail closed, not fall back to the seeded true row.
  return raw === "true" || raw === "1";
}

async function stored(db: Database, key: string): Promise<unknown> {
  const [row] = await db.query("SELECT value FROM feature_flags WHERE key=$1", [
    key,
  ]);
  if (!row) return undefined;
  if (typeof row.value !== "string") return row.value;
  try {
    return JSON.parse(row.value);
  } catch {
    // A driver may hand back a plain string; keep it so malformed values are
    // rejected by the caller instead of looking like an absent row.
    return row.value;
  }
}

/**
 * Resolve the operator flags for one workspace. Environment values win over
 * database rows so an incident can force a kill switch without a SQL write.
 * A missing row means off; the migration seeds the current behavior on.
 */
export async function resolveFlags(
  db: Database,
  workspaceId: string,
  env: Env = process.env,
): Promise<Flags> {
  const [automation, revenue, pilotValue] = await Promise.all([
    stored(db, "automation.enabled"),
    stored(db, "revenue.enabled"),
    stored(db, "pilot.workspaces"),
  ]);
  const pilot = env.PILOT_WORKSPACES
    ? env.PILOT_WORKSPACES.split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : Array.isArray(pilotValue)
      ? pilotValue.map(String)
      : pilotValue === undefined
        ? []
        : // A malformed pilot row must not silently open Revenue to everyone.
          ["__invalid__"];
  return {
    automationEnabled:
      envBoolean(env, "AUTOMATION_ENABLED") ??
      (typeof automation === "boolean" ? automation : false),
    revenueEnabled:
      (envBoolean(env, "REVENUE_ENABLED") ??
        (typeof revenue === "boolean" ? revenue : false)) &&
      (pilot.length === 0 || pilot.includes(workspaceId)),
  };
}
