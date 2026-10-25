import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { mkdir, readFile, readdir } from "node:fs/promises";
import type { Config } from "./config.ts";

export interface Database {
  query<T = Record<string, any>>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(run: (tx: Database) => Promise<T>): Promise<T>;
  listen?(channel: string, callback: (payload: string) => void): Promise<() => Promise<void>>;
  close(): Promise<void>;
  kind: "postgres" | "pglite";
  connectionString?: string;
  ssl?: boolean;
}

export async function createDatabase(
  config: Pick<Config, "databaseUrl" | "databaseSsl" | "dataDir">,
  migrationThrough = Infinity,
): Promise<Database> {
  let database: Database;
  if (config.databaseUrl) {
    const pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    const wrap = (client: Pick<pg.PoolClient, "query">): Database => ({
      kind: "postgres",
      query: async (sql, params) => (await client.query(sql, params)).rows,
      transaction: async () => {
        throw new Error("Nested transactions are not supported.");
      },
      close: async () => {},
    });
    database = {
      kind: "postgres",
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl,
      query: async (sql, params) => (await pool.query(sql, params)).rows,
      close: () => pool.end(),
      transaction: async (run) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await run(wrap(client));
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
  } else {
    if (config.dataDir !== ":memory:")
      await mkdir(config.dataDir, { recursive: true, mode: 0o700 });
    const instance = new PGlite(
      config.dataDir === ":memory:" ? undefined : `${config.dataDir}/postgres`,
    );
    await instance.waitReady;
    database = {
      kind: "pglite",
      query: async (sql, params) =>
        (await instance.query(sql, params)).rows as any[],
      listen: async (channel, callback) => {
        const unlisten = await instance.listen(channel, callback);
        return async () => {
          await unlisten();
        };
      },
      close: () => instance.close(),
      transaction: async (run) =>
        instance.transaction(async (tx) =>
          run({
            kind: "pglite",
            query: async (sql, params) =>
              (await tx.query(sql, params)).rows as any[],
            transaction: async () => {
              throw new Error("Nested transactions are not supported.");
            },
            close: async () => {},
          }),
        ),
    };
  }
  const directory = new URL("./migrations/", import.meta.url);
  await database.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const files = (await readdir(directory))
    .filter(
      (file) =>
        /^\d+.*\.sql$/.test(file) &&
        Number(file.match(/^\d+/)![0]) <= migrationThrough,
    )
    .sort();
  for (const file of files) {
    const version = Number(file.match(/^\d+/)![0]);
    const sql = await readFile(new URL(file, directory), "utf8");
    await database.transaction(async (tx) => {
      // Serialize migration discovery so concurrent deploys cannot apply a version twice.
      await tx.query("LOCK TABLE schema_migrations IN EXCLUSIVE MODE");
      if (
        (
          await tx.query(
            "SELECT version FROM schema_migrations WHERE version=$1",
            [version],
          )
        ).length
      )
        return;
      for (const statement of sql
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean))
        await tx.query(statement);
      await tx.query(
        "INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT DO NOTHING",
        [version],
      );
    });
  }
  return database;
}
