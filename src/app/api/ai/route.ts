import { getEmail } from "@/lib/store";
import { smartReplies, summarizeEmail, aiMode } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ mode: aiMode() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { action: "summarize" | "replies"; id: number };
  const email = await getEmail(Number(body.id));
  if (!email) return Response.json({ error: "Not found" }, { status: 404 });

  if (body.action === "summarize") {
    return Response.json(await summarizeEmail(email));
  }
  return Response.json(await smartReplies(email));
}
