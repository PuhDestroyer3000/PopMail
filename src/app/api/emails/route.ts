import { listEmails } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const smart = url.searchParams.get("view") === "smart";
  const emails = await listEmails({
    smart,
    folder: url.searchParams.get("folder") ?? undefined,
    accountId: url.searchParams.get("accountId") ? Number(url.searchParams.get("accountId")) : undefined,
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 200,
    offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
  });
  return Response.json({ emails });
}
