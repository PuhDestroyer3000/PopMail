import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * PopMail runs in two modes:
 *  - Hosted / web preview  -> PostgreSQL via DATABASE_URL
 *  - Desktop .exe          -> embedded SQLite file (no server to install)
 *
 * Both paths are lazy so the module never connects during `next build`.
 */

export type Driver = "pg" | "sqlite";

export function getDriver(): Driver {
  if (process.env.POPMAIL_DESKTOP === "1") return "sqlite";
  return process.env.DATABASE_URL ? "pg" : "sqlite";
}

const globalForDb = globalThis as typeof globalThis & {
  __popmailPgPool?: Pool;
};

function getPool(): Pool {
  if (!globalForDb.__popmailPgPool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required");
    globalForDb.__popmailPgPool = new Pool({ connectionString: databaseUrl });
  }
  return globalForDb.__popmailPgPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop, receiver) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
