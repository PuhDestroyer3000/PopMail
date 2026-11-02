import { createAccount, listAccountsWithCounts } from "@/lib/store";
import { testImapConnection, syncAll } from "@/lib/sync";
import { seedDemo } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESETS: Record<string, { imap: [string, number]; smtp: [string, number]; hint?: string }> = {
  gmail: { imap: ["imap.gmail.com", 993], smtp: ["smtp.gmail.com", 465] },
  outlook: { imap: ["outlook.office365.com", 993], smtp: ["smtp.office365.com", 587] },
  yahoo: { imap: ["imap.mail.yahoo.com", 993], smtp: ["smtp.mail.yahoo.com", 465] },
  icloud: { imap: ["imap.mail.me.com", 993], smtp: ["smtp.mail.me.com", 587] },
};

export async function GET() {
  const accounts = await listAccountsWithCounts();
  return Response.json({ accounts: accounts.map((a) => ({ ...a, imapPass: undefined, smtpPass: undefined })) });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    mode?: "demo" | "real";
    name?: string;
    email?: string;
    provider?: string;
    password?: string;
    imapHost?: string;
    imapPort?: number;
    smtpHost?: string;
    smtpPort?: number;
    skipTest?: boolean;
  };

  if (body.mode === "demo") {
    await seedDemo();
    return Response.json({ ok: true });
  }

  const name = (body.name ?? "").trim() || (body.email ?? "").split("@")[0];
  const email = (body.email ?? "").trim();
  const provider = body.provider ?? "custom";
  if (!email || !email.includes("@")) {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  let imapHost = body.imapHost?.trim();
  let imapPort = body.imapPort;
  let smtpHost = body.smtpHost?.trim();
  let smtpPort = body.smtpPort;
  if (provider !== "custom" && PRESETS[provider]) {
    [imapHost, imapPort] = PRESETS[provider].imap;
    [smtpHost, smtpPort] = PRESETS[provider].smtp;
  }
  if (!imapHost || !imapPort || !smtpHost || !smtpPort) {
    return Response.json({ ok: false, error: "IMAP/SMTP server settings are missing." }, { status: 400 });
  }
  if (!body.password) {
    return Response.json({ ok: false, error: "Password (or app password) is required." }, { status: 400 });
  }

  if (!body.skipTest) {
    const test = await testImapConnection({ host: imapHost, port: imapPort, user: email, pass: body.password });
    if (!test.ok) {
      return Response.json(
        {
          ok: false,
          error: `Could not sign in to ${imapHost}: ${test.error}. For Gmail/iCloud/Yahoo you usually need an “app password”, not your normal password.`,
        },
        { status: 400 }
      );
    }
  }

  const id = await createAccount({
    name,
    email,
    provider,
    color: pickColor(email),
    imapHost,
    imapPort,
    imapUser: email,
    imapPass: body.password,
    smtpHost,
    smtpPort,
    smtpUser: email,
    smtpPass: body.password,
  });

  // First sync in the background so the inbox fills up right away
  syncAll(id).catch(() => undefined);

  return Response.json({ ok: true, id });
}

function pickColor(email: string): string {
  const palette = ["#2f7cf6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e"];
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}
