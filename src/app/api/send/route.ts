import { getAccount } from "@/lib/store";
import { sendMail } from "@/lib/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    accountId: number;
    to: string;
    cc?: string;
    subject?: string;
    text?: string;
  };
  const account = await getAccount(Number(body.accountId));
  if (!account) return Response.json({ ok: false, error: "Account not found." }, { status: 404 });
  if (!body.text?.trim()) return Response.json({ ok: false, error: "Message is empty." }, { status: 400 });

  const result = await sendMail(account, {
    accountId: account.id,
    to: body.to ?? "",
    cc: body.cc,
    subject: body.subject?.trim() || "(no subject)",
    text: body.text,
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
