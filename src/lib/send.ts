import nodemailer from "nodemailer";
import type { AccountRow } from "./types";
import { insertEmail } from "./store";
import { queueDemoReply } from "./demo";

export interface SendInput {
  accountId: number;
  to: string;
  cc?: string;
  subject: string;
  text: string;
}

/** Sends mail over SMTP, stores a copy in Sent, and (for demo accounts) queues a lifelike auto-reply. */
export async function sendMail(account: AccountRow, input: SendInput): Promise<{ ok: boolean; error?: string }> {
  const toList = input.to
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ccList = (input.cc ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!toList.length) return { ok: false, error: "Add at least one recipient." };

  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@popmail>`;

  // Demo / offline account: simulate sending, keep everything local
  if (!account.smtpHost) {
    await new Promise((r) => setTimeout(r, 450));
    await insertEmail({
      accountId: account.id,
      messageId,
      folder: "sent",
      category: "personal",
      fromName: account.name,
      fromEmail: account.email,
      to: toList.map((email) => ({
        name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
      })),
      cc: ccList.map((email) => ({ name: email.split("@")[0], email })),
      subject: input.subject,
      bodyText: input.text,
      date: new Date().toISOString(),
      isRead: true,
    });
    // Demo contacts reply on the next sync — feels like real mail flowing
    for (const t of toList) {
      await queueDemoReply(account.id, t, input.subject);
    }
    return { ok: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort ?? 587,
      secure: (account.smtpPort ?? 587) === 465,
      auth: { user: account.smtpUser ?? account.imapUser ?? "", pass: account.smtpPass ?? account.imapPass ?? "" },
      connectionTimeout: 20_000,
    });
    await transporter.sendMail({
      from: `"${account.name}" <${account.email}>`,
      to: toList.join(", "),
      cc: ccList.length ? ccList.join(", ") : undefined,
      subject: input.subject,
      text: input.text,
      messageId,
    });
    await insertEmail({
      accountId: account.id,
      messageId,
      folder: "sent",
      category: "personal",
      fromName: account.name,
      fromEmail: account.email,
      to: toList.map((email) => ({ name: "", email })),
      cc: ccList.map((email) => ({ name: "", email })),
      subject: input.subject,
      bodyText: input.text,
      date: new Date().toISOString(),
      isRead: true,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send" };
  }
}
