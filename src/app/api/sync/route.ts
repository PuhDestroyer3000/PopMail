import { syncAll } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let accountId: number | undefined;
  try {
    const body = (await req.json()) as { accountId?: number };
    accountId = body.accountId;
  } catch {
    /* empty body = sync everything */
  }
  const results = await syncAll(accountId);
  const fetched = results.reduce((n, r) => n + r.fetched, 0);
  const spamCaught = results.reduce((n, r) => n + r.spamCaught, 0);
  const errors = results.filter((r) => r.error).map((r) => `${r.account}: ${r.error}`);
  return Response.json({ ok: errors.length === 0, fetched, spamCaught, errors, results });
}
