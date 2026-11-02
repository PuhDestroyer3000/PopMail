import path from "node:path";
import fs from "node:fs";

/**
 * Embedded SQLite for the desktop (.exe) build — zero-install storage using
 * Node's built-in `node:sqlite` module (Electron forks the app server with
 * the required flag). Loaded dynamically so the web/Postgres build never
 * touches it.
 */

export interface SqliteHandle {
  run(sql: string, params?: unknown[]): void;
  all(sql: string, params?: unknown[]): Record<string, unknown>[];
  get(sql: string, params?: unknown[]): Record<string, unknown> | undefined;
  exec(sql: string): void;
}

const globalForSqlite = globalThis as typeof globalThis & {
  __popmailSqlite?: SqliteHandle;
};

export async function getSqlite(): Promise<SqliteHandle> {
  if (globalForSqlite.__popmailSqlite) return globalForSqlite.__popmailSqlite;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = await import("node:sqlite");
  const DatabaseSync = mod.DatabaseSync as unknown as new (
    file: string
  ) => {
    exec(sql: string): unknown;
    prepare(sql: string): {
      run(...params: unknown[]): unknown;
      all(...params: unknown[]): Record<string, unknown>[];
      get(...params: unknown[]): Record<string, unknown> | undefined;
    };
  };

  const dir =
    process.env.POPMAIL_DATA_DIR || process.cwd();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "popmail.db");
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL;");
  raw.exec("PRAGMA foreign_keys = ON;");

  globalForSqlite.__popmailSqlite = {
    exec(sql: string) {
      raw.exec(sql);
    },
    run(sql: string, params: unknown[] = []) {
      raw.prepare(sql).run(...params);
    },
    all(sql: string, params: unknown[] = []) {
      return raw.prepare(sql).all(...params);
    },
    get(sql: string, params: unknown[] = []) {
      return raw.prepare(sql).get(...params);
    },
  };
  return globalForSqlite.__popmailSqlite;
}
