import type { Database } from "./db.ts";
import type { Config } from "./config.ts";

export interface FlagState {
  automationEnabled: boolean;
  revenueEnabled: boolean;
  pilotWorkspaces: string[];
}

export class FlagProvider {
  constructor(
    public config?: Config,
    public db?: Database,
  ) {}

  async getFlag<T>(
    key: string,
    defaultValue: T,
    db: Database | undefined = this.db,
  ): Promise<T> {
    const envKey = `FLAGS_${key.toUpperCase().replace(/\./g, "_")}`;
    const altEnvKey = key.toUpperCase().replace(/\./g, "_");
    const envVal = process.env[envKey] ?? process.env[altEnvKey];

    let dbVal: any = undefined;
    if (db) {
      try {
        const rows = await db.query(
          "SELECT value FROM feature_flags WHERE key=$1",
          [key],
        );
        if (rows.length > 0 && rows[0].value !== undefined) {
          dbVal = rows[0].value;
        }
      } catch {
        // Table may not exist in early test setup
      }
    }

    if (typeof defaultValue === "boolean") {
      if (envVal === "false" || envVal === "0") {
        return false as T;
      }
      if (typeof dbVal === "boolean") return dbVal as T;
      if (typeof dbVal === "string") return (dbVal === "true" || dbVal === "1") as T;
      if (typeof dbVal === "number") return (dbVal === 1) as T;

      if (envVal === "true" || envVal === "1") {
        return true as T;
      }
      return defaultValue;
    }

    if (Array.isArray(defaultValue)) {
      if (Array.isArray(dbVal)) return dbVal as T;
      if (typeof dbVal === "string") {
        try {
          const parsed = JSON.parse(dbVal);
          if (Array.isArray(parsed)) return parsed as T;
        } catch {
          return dbVal.split(",").map((s: string) => s.trim()).filter(Boolean) as T;
        }
      }
      if (typeof envVal === "string" && envVal.trim()) {
        try {
          const parsed = JSON.parse(envVal);
          if (Array.isArray(parsed)) return parsed as T;
        } catch {
          return envVal.split(",").map((s) => s.trim()).filter(Boolean) as T;
        }
      }
      return defaultValue;
    }

    return defaultValue;
  }

  async isAutomationEnabled(workspaceId?: string, db?: Database): Promise<boolean> {
    return this.getFlag<boolean>("automation.enabled", false, db);
  }

  async isRevenueEnabled(workspaceId: string, db?: Database): Promise<boolean> {
    const globalRevenue = await this.getFlag<boolean>("revenue.enabled", false, db);
    if (!globalRevenue) return false;

    const pilotList = await this.getFlag<string[]>("pilot.workspaces", [], db);
    if (pilotList.length === 0) {
      return true;
    }
    if (pilotList.includes("*")) return true;
    return pilotList.includes(workspaceId);
  }

  async setFlag(key: string, value: any, db: Database | undefined = this.db): Promise<void> {
    if (!db) return;
    await db.query(
      "INSERT INTO feature_flags(key, value, updated_at) VALUES($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()",
      [key, JSON.stringify(value)],
    );
  }

  async evalState(workspaceId: string, db?: Database): Promise<FlagState> {
    const automationEnabled = await this.isAutomationEnabled(workspaceId, db);
    const revenueEnabled = await this.isRevenueEnabled(workspaceId, db);
    const pilotWorkspaces = await this.getFlag<string[]>("pilot.workspaces", [], db);
    return {
      automationEnabled,
      revenueEnabled,
      pilotWorkspaces,
    };
  }
}
