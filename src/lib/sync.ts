import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { AccountRow, NewEmail } from "./types";
import { insertEmail, listAccounts } from "./store";
import { scoreEmail } from "./spam";
import { categorize } from "./classify";
import { deliverNextDemoEmail } from "./demo";

export interface SyncResult {
  account: string;
  fetched: number;
  spamCaught: number;
  error?: string;
  demo?: boolean;
}

const MAX_PER_FOLDER = 60;

async function syncImapAccount(account: AccountRow): Promise<SyncResult> {
  if (!account.imapHost || !account.imapPort || !account.imapUser || !account.imapPass) {
    return { account: account.email, fetched: 0, spamCaught: 0, error: "Missing IMAP settings" };
  }
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapPort === 993,
    auth: { user: account.imapUser, pass: account.imapPass },
    logger: false,
    socketTimeout: 30_000,
    tls: { rejectUnauthorized: false },
  });

  let fetched = 0;
  let spamCaught = 0;
  try {
    await client.connect();
    const folders: { path: string; as: "inbox" | "sent" }[] = [{ path: "INBOX", as: "inbox" }];
    // Try to locate the Sent folder via special-use flag
    try {
      const list = await client.list();
      for (const box of list) {
        if (box.specialUse === "\\Sent") folders.push({ path: box.path, as: "sent" });
      }
    } catch {
      /* folders beyond INBOX are a bonus */
    }

    for (const folder of folders) {
      let lock;
      try {
        lock = await client.getMailboxLock(folder.path);
      } catch {
        continue;
      }
      try {
        const status = await client.status(folder.path, { messages: true });
        const total = status && status.messages ? status.messages : 0;
        if (total === 0) continue;
        const start = Math.max(1, total - MAX_PER_FOLDER + 1);
        for await (const msg of client.fetch(`${start}:*`, { envelope: true, source: true })) {
          if (!msg.source || !msg.envelope) continue;
          const parsed = await simpleParser(msg.source);
          const messageId = parsed.messageId || `uid-${msg.uid}-${folder.as}`;
          const fromAddr = parsed.from?.value?.[0];
          const bodyText = parsed.text || "";
          const subject = parsed.subject || "(no subject)";
          const isSpamCandidate = folder.as === "inbox";
          const verdict = isSpamCandidate
            ? await scoreEmail({ fromEmail: fromAddr?.address ?? "", subject, bodyText })
            : { score: 0, isSpam: false, reasons: [] };
          const category = categorize({
            fromEmail: fromAddr?.address ?? "",
            fromName: fromAddr?.name ?? "",
            subject,
            bodyText,
            headers: Object.fromEntries(
              (parsed.headers.has("list-unsubscribe") ? ["list-unsubscribe"] : [])
                .map((k) => [k, String(parsed.headers.get(k))])
            ),
          });
          const email: NewEmail = {
            accountId: account.id,
            messageId,
            folder: verdict.isSpam ? "spam" : folder.as,
            category,
            fromName: fromAddr?.name || fromAddr?.address || "",
            fromEmail: fromAddr?.address ?? "",
            to: (parsed.to && Array.isArray(parsed.to) ? parsed.to : parsed.to ? [parsed.to] : [])
              .flatMap((g) => g.value.map((a) => ({ name: a.name ?? "", email: a.address ?? "" }))),
            cc: (parsed.cc && Array.isArray(parsed.cc) ? parsed.cc : parsed.cc ? [parsed.cc] : [])
              .flatMap((g) => g.value.map((a) => ({ name: a.name ?? "", email: a.address ?? "" }))),
            subject,
            bodyText:
              bodyText ||
              (typeof parsed.html === "string"
                ? parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
                : "") ||
              "",
            bodyHtml: typeof parsed.html === "string" ? parsed.html : null,
            date: (parsed.date ?? new Date()).toISOString(),
            isRead: msg.flags?.has("\\Seen") ?? false,
            isSpam: verdict.isSpam,
            spamScore: verdict.score,
            spamReason: verdict.reasons.join(" · "),
            hasAttachments: (parsed.attachments?.length ?? 0) > 0,
          };
          await insertEmail(email);
          fetched++;
          if (verdict.isSpam) spamCaught++;
        }
      } finally {
        lock?.release();
      }
    }
    return { account: account.email, fetched, spamCaught };
  } catch (e) {
    return {
      account: account.email,
      fetched,
      spamCaught,
      error: e instanceof Error ? e.message : "Connection failed",
    };
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

export async function syncAll(accountId?: number): Promise<SyncResult[]> {
  const accounts = await listAccounts();
  const targets = accountId ? accounts.filter((a) => a.id === accountId) : accounts;
  const results: SyncResult[] = [];
  for (const account of targets) {
    if (!account.imapHost) {
      const delivered = await deliverNextDemoEmail(account.id);
      results.push({ account: account.email, fetched: delivered ? 1 : 0, spamCaught: 0, demo: true });
      continue;
    }
    results.push(await syncImapAccount(account));
  }
  return results;
}

/** Quick connectivity check used when adding a new account. */
export async function testImapConnection(input: {
  host: string;
  port: number;
  user: string;
  pass: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = new ImapFlow({
    host: input.host,
    port: input.port,
    secure: input.port === 993,
    auth: { user: input.user, pass: input.pass },
    logger: false,
    socketTimeout: 20_000,
    tls: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
  }
}
