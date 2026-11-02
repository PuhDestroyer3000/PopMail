import { deleteEmail, getEmail, updateEmail } from "@/lib/store";
import { trainFromEmail } from "@/lib/spam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action =
  | "read" | "unread"
  | "pin" | "unpin"
  | "star" | "unstar"
  | "done" | "undone"
  | "archive"
  | "spam" | "notspam"
  | "trash" | "delete" | "restore"
  | "snooze" | "unsnooze";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const email = await getEmail(Number(id));
  if (!email) return Response.json({ error: "Not found" }, { status: 404 });
  if (!email.isRead) await updateEmail(email.id, { isRead: true });
  return Response.json({ email });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const emailId = Number(id);
  const body = (await req.json()) as { action: Action; until?: string };
  const email = await getEmail(emailId);
  if (!email) return Response.json({ error: "Not found" }, { status: 404 });

  switch (body.action) {
    case "read": await updateEmail(emailId, { isRead: true }); break;
    case "unread": await updateEmail(emailId, { isRead: false }); break;
    case "pin": await updateEmail(emailId, { isPinned: true }); break;
    case "unpin": await updateEmail(emailId, { isPinned: false }); break;
    case "star": await updateEmail(emailId, { isStarred: true }); break;
    case "unstar": await updateEmail(emailId, { isStarred: false }); break;
    case "done": await updateEmail(emailId, { isDone: true, folder: "archive" }); break;
    case "undone": await updateEmail(emailId, { isDone: false, folder: "inbox" }); break;
    case "archive": await updateEmail(emailId, { folder: "archive" }); break;
    case "restore": await updateEmail(emailId, { folder: "inbox", isDone: false }); break;
    case "snooze": await updateEmail(emailId, { snoozedUntil: body.until ?? null }); break;
    case "unsnooze": await updateEmail(emailId, { snoozedUntil: null }); break;
    case "spam":
      await trainFromEmail(email, true);
      await updateEmail(emailId, { isSpam: true, folder: "spam" });
      break;
    case "notspam":
      await trainFromEmail(email, false);
      await updateEmail(emailId, { isSpam: false, folder: "inbox", spamScore: 0, spamReason: "" });
      break;
    case "trash":
      if (email.folder === "trash") await deleteEmail(emailId);
      else await updateEmail(emailId, { folder: "trash" });
      break;
    case "delete": await deleteEmail(emailId); break;
    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
