import { sql, type SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { db, getDriver } from "@/db";
import { getSqlite } from "@/db/sqlite";
import type {
  AccountRow,
  AccountWithCounts,
  EmailRow,
  NewEmail,
  Stats,
} from "./types";

/* ------------------------------------------------------------------ */
/* Low-level driver plumbing                                           */
/* ------------------------------------------------------------------ */

const sqliteDialect = new SQLiteSyncDialect();

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}
function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  return String(v);
}

async function all<T = Record<string, unknown>>(query: SQL): Promise<T[]> {
  if (getDriver() === "pg") {
    const res = await db.execute(query);
    return res.rows as unknown as T[];
  }
  const lite = await getSqlite();
  const { sql: text, params } = sqliteDialect.sqlToQuery(query);
  const bound = params.map((p) =>
    p === true ? 1 : p === false ? 0 : p instanceof Date ? p.toISOString() : p
  );
  return lite.all(text, bound) as T[];
}

async function run(query: SQL): Promise<void> {
  await all(query);
}

let readyPromise: Promise<void> | null = null;
// Re-entrancy guard: the seed itself uses store helpers that call ensureReady().
let seeding = false;

/** Create tables (idempotent) + seed the demo account on first launch. */
export function ensureReady(): Promise<void> {
  if (seeding) return Promise.resolve();
  if (!readyPromise) {
    readyPromise = (async () => {
      if (getDriver() === "pg") {
        for (const stmt of PG_DDL) await run(sql.raw(stmt));
      } else {
        const lite = await getSqlite();
        for (const stmt of SQLITE_DDL) lite.exec(stmt);
      }
      seeding = true;
      try {
        await maybeSeed();
      } finally {
        seeding = false;
      }
    })().catch((e) => {
      readyPromise = null;
      seeding = false;
      throw e;
    });
  }
  return readyPromise;
}

/* ------------------------------------------------------------------ */
/* Row mappers                                                         */
/* ------------------------------------------------------------------ */

function mapAccount(r: Record<string, unknown>): AccountRow {
  return {
    id: Number(r.id),
    name: String(r.name),
    email: String(r.email),
    provider: String(r.provider),
    color: String(r.color),
    imapHost: (r.imap_host as string) ?? null,
    imapPort: r.imap_port == null ? null : Number(r.imap_port),
    imapUser: (r.imap_user as string) ?? null,
    imapPass: (r.imap_pass as string) ?? null,
    smtpHost: (r.smtp_host as string) ?? null,
    smtpPort: r.smtp_port == null ? null : Number(r.smtp_port),
    smtpUser: (r.smtp_user as string) ?? null,
    smtpPass: (r.smtp_pass as string) ?? null,
    createdAt: toIso(r.created_at),
  };
}

function parseAddr(json: unknown): { name: string; email: string }[] {
  try {
    const arr = JSON.parse(String(json ?? "[]"));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function mapEmail(r: Record<string, unknown>): EmailRow {
  return {
    id: Number(r.id),
    accountId: Number(r.account_id),
    messageId: String(r.message_id),
    folder: String(r.folder) as EmailRow["folder"],
    category: String(r.category) as EmailRow["category"],
    fromName: String(r.from_name ?? ""),
    fromEmail: String(r.from_email ?? ""),
    to: parseAddr(r.to_json),
    cc: parseAddr(r.cc_json),
    subject: String(r.subject ?? "(no subject)"),
    snippet: String(r.snippet ?? ""),
    bodyText: String(r.body_text ?? ""),
    bodyHtml: (r.body_html as string) ?? null,
    date: toIso(r.date),
    isRead: toBool(r.is_read),
    isPinned: toBool(r.is_pinned),
    isDone: toBool(r.is_done),
    isStarred: toBool(r.is_starred),
    isSpam: toBool(r.is_spam),
    spamScore: Number(r.spam_score ?? 0),
    spamReason: String(r.spam_reason ?? ""),
    snoozedUntil: r.snoozed_until == null ? null : toIso(r.snoozed_until),
    hasAttachments: toBool(r.has_attachments),
  };
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

export async function listAccounts(): Promise<AccountRow[]> {
  await ensureReady();
  const rows = await all(sql`SELECT * FROM accounts ORDER BY id ASC`);
  return rows.map(mapAccount);
}

export async function getAccount(id: number): Promise<AccountRow | undefined> {
  await ensureReady();
  const rows = await all(sql`SELECT * FROM accounts WHERE id = ${id} LIMIT 1`);
  return rows[0] ? mapAccount(rows[0]) : undefined;
}

export interface AccountInput {
  name: string;
  email: string;
  provider: string;
  color: string;
  imapHost?: string | null;
  imapPort?: number | null;
  imapUser?: string | null;
  imapPass?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
}

export async function createAccount(a: AccountInput): Promise<number> {
  await ensureReady();
  if (getDriver() === "pg") {
    const rows = await all<{ id: number }>(sql`
      INSERT INTO accounts (name, email, provider, color, imap_host, imap_port, imap_user, imap_pass, smtp_host, smtp_port, smtp_user, smtp_pass)
      VALUES (${a.name}, ${a.email}, ${a.provider}, ${a.color}, ${a.imapHost ?? null}, ${a.imapPort ?? null}, ${a.imapUser ?? null}, ${a.imapPass ?? null}, ${a.smtpHost ?? null}, ${a.smtpPort ?? null}, ${a.smtpUser ?? null}, ${a.smtpPass ?? null})
      RETURNING id`);
    return Number(rows[0].id);
  }
  const lite = await getSqlite();
  lite.run(
    `INSERT INTO accounts (name, email, provider, color, imap_host, imap_port, imap_user, imap_pass, smtp_host, smtp_port, smtp_user, smtp_pass)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      a.name, a.email, a.provider, a.color,
      a.imapHost ?? null, a.imapPort ?? null, a.imapUser ?? null, a.imapPass ?? null,
      a.smtpHost ?? null, a.smtpPort ?? null, a.smtpUser ?? null, a.smtpPass ?? null,
    ]
  );
  const r = lite.get("SELECT last_insert_rowid() AS id");
  return Number(r?.id);
}

export async function deleteAccount(id: number): Promise<void> {
  await ensureReady();
  await run(sql`DELETE FROM emails WHERE account_id = ${id}`);
  await run(sql`DELETE FROM accounts WHERE id = ${id}`);
}

export async function listAccountsWithCounts(): Promise<AccountWithCounts[]> {
  const accounts = await listAccounts();
  const counts = await all<{ account_id: number; n: number }>(sql`
    SELECT account_id, COUNT(*) AS n FROM emails
    WHERE folder = 'inbox' AND is_read = ${false} AND is_spam = ${false} AND is_done = ${false}
    GROUP BY account_id`);
  const byAccount = new Map(counts.map((c) => [Number(c.account_id), Number(c.n)]));
  return accounts.map((a) => ({
    ...a,
    isDemo: !a.imapHost,
    unread: byAccount.get(a.id) ?? 0,
  }));
}

/* ------------------------------------------------------------------ */
/* Emails                                                              */
/* ------------------------------------------------------------------ */

export interface ListOptions {
  folder?: string;
  accountId?: number;
  q?: string;
  category?: string;
  smart?: boolean; // inbox minus done/snoozed/spam
  limit?: number;
  offset?: number;
}

export async function listEmails(opts: ListOptions): Promise<EmailRow[]> {
  await ensureReady();
  const limit = Math.min(opts.limit ?? 200, 500);
  const offset = opts.offset ?? 0;
  const conds: SQL[] = [];
  if (opts.smart) {
    conds.push(sql`folder = 'inbox'`);
    conds.push(sql`is_done = ${false}`);
    conds.push(sql`(snoozed_until IS NULL OR snoozed_until <= ${new Date().toISOString()})`);
  } else if (opts.folder) {
    conds.push(sql`folder = ${opts.folder}`);
  }
  if (opts.accountId) conds.push(sql`account_id = ${opts.accountId}`);
  if (opts.category) conds.push(sql`category = ${opts.category}`);
  if (opts.q) {
    const like = `%${opts.q.toLowerCase()}%`;
    conds.push(
      sql`(LOWER(subject) LIKE ${like} OR LOWER(from_name) LIKE ${like} OR LOWER(from_email) LIKE ${like} OR LOWER(body_text) LIKE ${like})`
    );
  }
  const where = conds.length
    ? sql`WHERE ${sql.join(conds, sql` AND `)}`
    : sql``;
  const rows = await all(
    sql`SELECT * FROM emails ${where} ORDER BY is_pinned DESC, date DESC LIMIT ${limit} OFFSET ${offset}`
  );
  return rows.map(mapEmail);
}

export async function getEmail(id: number): Promise<EmailRow | undefined> {
  await ensureReady();
  const rows = await all(sql`SELECT * FROM emails WHERE id = ${id} LIMIT 1`);
  return rows[0] ? mapEmail(rows[0]) : undefined;
}

export async function insertEmail(e: NewEmail): Promise<void> {
  await ensureReady();
  const snippet =
    e.bodyText.replace(/\s+/g, " ").trim().slice(0, 140) || e.subject;
  await run(sql`
    INSERT INTO emails (account_id, message_id, folder, category, from_name, from_email, to_json, cc_json, subject, snippet, body_text, body_html, date, is_read, is_spam, spam_score, spam_reason, has_attachments, snoozed_until)
    VALUES (${e.accountId}, ${e.messageId}, ${e.folder}, ${e.category}, ${e.fromName}, ${e.fromEmail}, ${JSON.stringify(e.to)}, ${JSON.stringify(e.cc ?? [])}, ${e.subject}, ${snippet}, ${e.bodyText}, ${e.bodyHtml ?? null}, ${e.date}, ${!!e.isRead}, ${!!e.isSpam}, ${e.spamScore ?? 0}, ${e.spamReason ?? ""}, ${!!e.hasAttachments}, ${e.snoozedUntil ?? null})
    ON CONFLICT (account_id, message_id) DO NOTHING`);
}

export type EmailPatch = Partial<{
  folder: string;
  isRead: boolean;
  isPinned: boolean;
  isDone: boolean;
  isStarred: boolean;
  isSpam: boolean;
  spamScore: number;
  spamReason: string;
  snoozedUntil: string | null;
  category: string;
}>;

export async function updateEmail(id: number, patch: EmailPatch): Promise<void> {
  await ensureReady();
  const sets: SQL[] = [];
  if (patch.folder !== undefined) sets.push(sql`folder = ${patch.folder}`);
  if (patch.isRead !== undefined) sets.push(sql`is_read = ${patch.isRead}`);
  if (patch.isPinned !== undefined) sets.push(sql`is_pinned = ${patch.isPinned}`);
  if (patch.isDone !== undefined) sets.push(sql`is_done = ${patch.isDone}`);
  if (patch.isStarred !== undefined) sets.push(sql`is_starred = ${patch.isStarred}`);
  if (patch.isSpam !== undefined) sets.push(sql`is_spam = ${patch.isSpam}`);
  if (patch.spamScore !== undefined) sets.push(sql`spam_score = ${patch.spamScore}`);
  if (patch.spamReason !== undefined) sets.push(sql`spam_reason = ${patch.spamReason}`);
  if (patch.snoozedUntil !== undefined) sets.push(sql`snoozed_until = ${patch.snoozedUntil}`);
  if (patch.category !== undefined) sets.push(sql`category = ${patch.category}`);
  if (!sets.length) return;
  await run(sql`UPDATE emails SET ${sql.join(sets, sql`, `)} WHERE id = ${id}`);
}

export async function deleteEmail(id: number): Promise<void> {
  await ensureReady();
  await run(sql`DELETE FROM emails WHERE id = ${id}`);
}

export async function getStats(): Promise<Stats> {
  await ensureReady();
  const folderCounts = await all<{ folder: string; n: number }>(sql`
    SELECT folder, COUNT(*) AS n FROM emails
    WHERE is_read = ${false}
      AND (snoozed_until IS NULL OR snoozed_until <= ${new Date().toISOString()})
      AND (folder != 'inbox' OR is_done = ${false})
    GROUP BY folder`);
  const accountCounts = await all<{ account_id: number; n: number }>(sql`
    SELECT account_id, COUNT(*) AS n FROM emails
    WHERE folder = 'inbox' AND is_read = ${false} AND is_spam = ${false} AND is_done = ${false}
    GROUP BY account_id`);
  const spam = await all<{ n: number }>(sql`
    SELECT COUNT(*) AS n FROM emails WHERE folder = 'spam' OR is_spam = ${true}`);
  const byFolder: Record<string, number> = {};
  let total = 0;
  for (const c of folderCounts) {
    byFolder[c.folder] = Number(c.n);
    total += Number(c.n);
  }
  const byAccount: Record<number, number> = {};
  for (const c of accountCounts) byAccount[Number(c.account_id)] = Number(c.n);
  return { totalUnread: total, byFolder, byAccount, spamCaught: Number(spam[0]?.n ?? 0) };
}

export async function markFolderRead(folder: string, accountId?: number): Promise<void> {
  await ensureReady();
  if (accountId) {
    await run(sql`UPDATE emails SET is_read = ${true} WHERE folder = ${folder} AND account_id = ${accountId}`);
  } else {
    await run(sql`UPDATE emails SET is_read = ${true} WHERE folder = ${folder}`);
  }
}

/* ------------------------------------------------------------------ */
/* Spam-token memory + settings                                        */
/* ------------------------------------------------------------------ */

export async function trainTokens(tokens: string[], isSpam: boolean): Promise<void> {
  await ensureReady();
  const spamInc = isSpam ? 1 : 0;
  const hamInc = isSpam ? 0 : 1;
  for (const t of tokens) {
    await run(sql`
      INSERT INTO spam_tokens (token, spam, ham) VALUES (${t}, ${spamInc}, ${hamInc})
      ON CONFLICT (token) DO UPDATE SET spam = spam_tokens.spam + ${spamInc}, ham = spam_tokens.ham + ${hamInc}`);
  }
}

export async function getTokenStats(
  tokens: string[]
): Promise<Map<string, { spam: number; ham: number }>> {
  await ensureReady();
  const map = new Map<string, { spam: number; ham: number }>();
  if (!tokens.length) return map;
  const rows = await all<{ token: string; spam: number; ham: number }>(
    sql`SELECT token, spam, ham FROM spam_tokens WHERE token IN (${sql.join(
      tokens.map((t) => sql`${t}`),
      sql`, `
    )})`
  );
  for (const r of rows) map.set(r.token, { spam: Number(r.spam), ham: Number(r.ham) });
  return map;
}

export async function getSetting(key: string): Promise<string | null> {
  await ensureReady();
  const rows = await all<{ value: string }>(
    sql`SELECT value FROM settings WHERE key = ${key} LIMIT 1`
  );
  return rows[0] ? String(rows[0].value) : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureReady();
  await run(sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}`);
}

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

async function maybeSeed(): Promise<void> {
  const rows = await all<{ id: number }>(sql`SELECT id FROM accounts LIMIT 1`);
  if (rows.length) return;
  const { seedDemo } = await import("./demo");
  await seedDemo();
}

/* ------------------------------------------------------------------ */
/* DDL                                                                 */
/* ------------------------------------------------------------------ */

const EMAIL_COLS_PG = `
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'inbox',
  category TEXT NOT NULL DEFAULT 'personal',
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  to_json TEXT NOT NULL DEFAULT '[]',
  cc_json TEXT NOT NULL DEFAULT '[]',
  subject TEXT NOT NULL DEFAULT '(no subject)',
  snippet TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  body_html TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_done BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_spam BOOLEAN NOT NULL DEFAULT false,
  spam_score INTEGER NOT NULL DEFAULT 0,
  spam_reason TEXT NOT NULL DEFAULT '',
  snoozed_until TIMESTAMPTZ,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()`;

const EMAIL_COLS_SQLITE = `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'inbox',
  category TEXT NOT NULL DEFAULT 'personal',
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  to_json TEXT NOT NULL DEFAULT '[]',
  cc_json TEXT NOT NULL DEFAULT '[]',
  subject TEXT NOT NULL DEFAULT '(no subject)',
  snippet TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  body_html TEXT,
  date TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_done INTEGER NOT NULL DEFAULT 0,
  is_starred INTEGER NOT NULL DEFAULT 0,
  is_spam INTEGER NOT NULL DEFAULT 0,
  spam_score INTEGER NOT NULL DEFAULT 0,
  spam_reason TEXT NOT NULL DEFAULT '',
  snoozed_until TEXT,
  has_attachments INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT ''`;

const PG_DDL = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'custom',
    color TEXT NOT NULL DEFAULT '#2f7cf6',
    imap_host TEXT, imap_port INTEGER, imap_user TEXT, imap_pass TEXT,
    smtp_host TEXT, smtp_port INTEGER, smtp_user TEXT, smtp_pass TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS emails (${EMAIL_COLS_PG})`,
  `CREATE UNIQUE INDEX IF NOT EXISTS emails_account_message_unique ON emails (account_id, message_id)`,
  `CREATE INDEX IF NOT EXISTS emails_account_folder_date_idx ON emails (account_id, folder, date)`,
  `CREATE TABLE IF NOT EXISTS spam_tokens (token TEXT PRIMARY KEY, spam INTEGER NOT NULL DEFAULT 0, ham INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`,
];

const SQLITE_DDL = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'custom',
    color TEXT NOT NULL DEFAULT '#2f7cf6',
    imap_host TEXT, imap_port INTEGER, imap_user TEXT, imap_pass TEXT,
    smtp_host TEXT, smtp_port INTEGER, smtp_user TEXT, smtp_pass TEXT,
    created_at TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS emails (${EMAIL_COLS_SQLITE})`,
  `CREATE UNIQUE INDEX IF NOT EXISTS emails_account_message_unique ON emails (account_id, message_id)`,
  `CREATE INDEX IF NOT EXISTS emails_account_folder_date_idx ON emails (account_id, folder, date)`,
  `CREATE TABLE IF NOT EXISTS spam_tokens (token TEXT PRIMARY KEY, spam INTEGER NOT NULL DEFAULT 0, ham INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`,
];
