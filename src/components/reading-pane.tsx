"use client";

import { useEffect, useRef, useState } from "react";
import {
  Reply, ReplyAll, Forward, CheckCheck, Trash2, ShieldX, Pin, Star,
  AlarmClock, Sparkles, Undo2, SendHorizontal, Bot, ChevronDown, Archive, Mail,
} from "lucide-react";
import type { EmailRow } from "@/lib/types";
import { Avatar, formatFullDate } from "./ui";

export type PaneAction =
  | "done" | "archive" | "trash" | "delete" | "restore" | "spam" | "notspam"
  | "pin" | "unpin" | "star" | "unstar" | "unread";

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export default function ReadingPane({
  email,
  onAction,
  onReply,
  onForward,
  onSnooze,
}: {
  email: EmailRow | null;
  onAction: (action: PaneAction) => void;
  onReply: (text: string) => Promise<void>;
  onForward: () => void;
  onSnooze: (until: string) => void;
}) {
  const [summary, setSummary] = useState<{ bullets: string[]; mode: string } | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [replies, setReplies] = useState<{ replies: string[]; mode: string } | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [quickReply, setQuickReply] = useState("");
  const [sending, setSending] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [visibleSummary, setVisibleSummary] = useState<string[]>([]);
  const sentRef = useRef(false);

  useEffect(() => {
    setSummary(null);
    setReplies(null);
    setQuickReply("");
    setSnoozeOpen(false);
    setVisibleSummary([]);
    sentRef.current = false;
  }, [email?.id]);

  // Typewriter reveal for the AI summary
  useEffect(() => {
    if (!summary) return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleSummary(summary.bullets.slice(0, i));
      if (i >= summary.bullets.length) clearInterval(t);
    }, 220);
    return () => clearInterval(t);
  }, [summary]);

  if (!email) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 bg-(--panel2) text-center">
        <div className="relative">
          <div className="grid h-20 w-20 place-items-center rounded-[22px] bg-gradient-to-br from-(--accent) to-(--accent2) text-white shadow-(--shadow-lg) animate-fade-up">
            <Sparkles size={30} />
          </div>
        </div>
        <div className="mt-1 text-[15px] font-semibold animate-fade-up" style={{ animationDelay: "80ms" }}>
          Nothing selected
        </div>
        <div className="max-w-[280px] text-[13px] leading-relaxed text-(--ink2) animate-fade-up" style={{ animationDelay: "140ms" }}>
          Pick a conversation on the left — or press <kbd className="rounded border border-(--line) bg-(--panel) px-1.5 py-0.5 text-[11px] font-semibold">C</kbd> to write something new.
        </div>
      </section>
    );
  }

  const doSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "summarize", id: email.id }),
      });
      setSummary(await res.json());
    } finally {
      setSummarizing(false);
    }
  };

  const doReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replies", id: email.id }),
      });
      setReplies(await res.json());
    } finally {
      setLoadingReplies(false);
    }
  };

  const sendQuick = async () => {
    if (!quickReply.trim() || sending) return;
    setSending(true);
    try {
      await onReply(quickReply.trim());
      setQuickReply("");
      sentRef.current = true;
    } finally {
      setSending(false);
    }
  };

  const snoozeChoices: [string, number][] = [
    ["Tomorrow, 8:00 AM", minutesUntil(8, 1)],
    ["This evening, 6:00 PM", minutesUntil(18, 0)],
    ["Next week", 60 * 24 * 7],
  ];

  const replyTo = email.folder === "sent" ? email.to[0]?.email ?? "" : email.fromEmail;
  const replyName = email.folder === "sent" ? email.to[0]?.name ?? "" : email.fromName;

  return (
    <section className="flex h-full flex-1 flex-col bg-(--panel2)">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-(--line) bg-(--panel) px-3 py-2">
        {email.folder !== "trash" && email.folder !== "spam" ? (
          <>
            <Tool icon={CheckCheck} label="Done" onClick={() => onAction("done")} />
            <Tool icon={Archive} label="Archive" onClick={() => onAction("archive")} />
            <div className="relative">
              <Tool icon={AlarmClock} label="Snooze" onClick={() => setSnoozeOpen((v) => !v)} />
              {snoozeOpen && (
                <div className="absolute left-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-(--line) bg-(--panel) p-1 shadow-(--shadow-lg) animate-pop-in">
                  {snoozeChoices.map(([label, mins]) => (
                    <button
                      key={label}
                      onClick={() => {
                        onSnooze(new Date(Date.now() + mins * 60000).toISOString());
                        setSnoozeOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] hover:bg-(--hover)"
                    >
                      <AlarmClock size={13} className="text-(--amber)" /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Tool icon={ShieldX} label="Spam" onClick={() => onAction("spam")} />
            <Tool icon={Trash2} label="Trash" onClick={() => onAction("trash")} />
          </>
        ) : (
          <>
            {email.folder === "spam" && <Tool icon={Undo2} label="Not spam" onClick={() => onAction("notspam")} />}
            {email.folder === "trash" && (
              <>
                <Tool icon={Undo2} label="Restore" onClick={() => onAction("restore")} />
                <Tool icon={Trash2} label="Delete forever" danger onClick={() => onAction("delete")} />
              </>
            )}
          </>
        )}
        <div className="mx-1 h-5 w-px bg-(--line)" />
        <Tool icon={Pin} label={email.isPinned ? "Unpin" : "Pin"} active={email.isPinned} onClick={() => onAction(email.isPinned ? "unpin" : "pin")} />
        <Tool icon={Star} label={email.isStarred ? "Unstar" : "Star"} active={email.isStarred} onClick={() => onAction(email.isStarred ? "unstar" : "star")} />
        <div className="ml-auto">
          <Tool icon={Mail} label="Mark unread" onClick={() => onAction("unread")} />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-[720px] animate-fade-up">
          <h1 className="text-[20px] font-bold leading-snug tracking-tight">{email.subject}</h1>

          <div className="mt-3 flex items-center gap-3">
            <Avatar name={email.fromName} email={email.fromEmail} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-semibold">{email.fromName || email.fromEmail}</span>
                <span className="truncate text-[12px] text-(--ink3)">&lt;{email.fromEmail}&gt;</span>
              </div>
              <div className="mt-0.5 truncate text-[12px] text-(--ink2)">
                to {email.to.map((t) => t.name || t.email).join(", ") || "me"}
                {email.cc.length > 0 && <> · cc {email.cc.map((t) => t.name || t.email).join(", ")}</>}
              </div>
            </div>
            <div className="shrink-0 text-right text-[11.5px] text-(--ink3)">{formatFullDate(email.date)}</div>
          </div>

          {email.isSpam && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-(--red)/25 bg-(--red)/[0.06] px-4 py-3">
              <ShieldX size={16} className="mt-0.5 shrink-0 text-(--red)" />
              <div>
                <div className="text-[13px] font-semibold text-(--red)">Filtered as spam · score {email.spamScore}/100</div>
                <div className="mt-0.5 text-[12px] text-(--ink2)">{email.spamReason || "This message matched your spam rules."} PopMail learns every time you correct it.</div>
              </div>
            </div>
          )}

          {/* AI summary */}
          <div className="mt-4 overflow-hidden rounded-xl border border-(--accent)/25 bg-gradient-to-br from-(--accent)/[0.07] to-transparent">
            {!summary ? (
              <button
                onClick={doSummarize}
                disabled={summarizing}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold text-(--accent) transition-colors hover:bg-(--accent)/[0.06]"
              >
                <Sparkles size={15} className={summarizing ? "animate-pulse" : ""} />
                {summarizing ? "Summarizing…" : "Summarize this email with AI"}
                <span className="ml-auto text-[10.5px] font-medium uppercase tracking-wide text-(--ink3)">
                  {summarizing ? "" : "1 click"}
                </span>
              </button>
            ) : (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-(--accent)">
                  <Sparkles size={14} />
                  AI summary
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-(--accent)/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                    <Bot size={10} /> {summary.mode === "openai" ? "GPT" : "on-device"}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {visibleSummary.map((b, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-(--ink) animate-fade-up">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-(--accent)" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Body */}
          {email.bodyHtml ? (
            <iframe
              title="email"
              sandbox=""
              srcDoc={`<!doctype html><html><head><style>body{font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.65;color:#333;padding:8px 2px}a{color:#2f7cf6}</style></head><body>${sanitizeHtml(email.bodyHtml)}</body></html>`}
              className="mt-4 w-full rounded-lg border border-(--line) bg-white"
              style={{ height: 400 }}
            />
          ) : (
            <div className="email-body mt-4 whitespace-pre-wrap text-[14px] leading-[1.75] text-(--ink)">
              {email.bodyText}
            </div>
          )}

          {email.hasAttachments && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-(--line) bg-(--panel) px-3.5 py-2.5 text-[12.5px] text-(--ink2)">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-(--accent)/10 text-(--accent)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </div>
              This email has attachments (download support lands in the next beta).
            </div>
          )}

          {/* Smart replies */}
          {email.folder === "inbox" && !email.isSpam && (
            <div className="mt-6">
              {!replies ? (
                <button
                  onClick={doReplies}
                  disabled={loadingReplies}
                  className="flex items-center gap-1.5 rounded-full border border-(--accent)/30 px-3.5 py-1.5 text-[12.5px] font-semibold text-(--accent) transition-colors hover:bg-(--accent)/[0.07]"
                >
                  <Sparkles size={13} className={loadingReplies ? "animate-pulse" : ""} />
                  {loadingReplies ? "Thinking…" : "Suggest smart replies"}
                  <ChevronDown size={12} className="-rotate-90 text-(--ink3)" />
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 animate-fade-up">
                  {replies.replies.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setQuickReply(r)}
                      className="rounded-full border border-(--accent)/30 bg-(--accent)/[0.05] px-3.5 py-1.5 text-[12.5px] font-medium text-(--accent) transition-all hover:-translate-y-px hover:bg-(--accent)/[0.12] animate-fade-up"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick reply */}
          {email.folder === "inbox" && !email.isSpam && (
            <div className="mt-5 rounded-xl border border-(--line) bg-(--panel) shadow-(--shadow) transition-shadow focus-within:ring-2 focus-within:ring-(--accent)/40">
              <div className="flex items-center gap-2 border-b border-(--line2) px-4 py-2 text-[12px] text-(--ink3)">
                <Reply size={12.5} />
                Quick reply to {replyName || replyTo}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={onForward}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-(--ink2) hover:bg-(--hover)"
                  >
                    <Forward size={12} /> Forward instead
                  </button>
                </div>
              </div>
              <textarea
                value={quickReply}
                onChange={(e) => setQuickReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void sendQuick();
                  }
                }}
                placeholder={sentRef.current ? "Sent! Write another reply…" : "Write a reply…  (⌘/Ctrl + Enter to send)"}
                rows={3}
                className="w-full resize-none bg-transparent px-4 py-3 text-[13.5px] leading-relaxed outline-none placeholder:text-(--ink3)"
              />
              <div className="flex items-center justify-end gap-2 px-3 pb-2.5">
                <button
                  onClick={() => void sendQuick()}
                  disabled={!quickReply.trim() || sending}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-(--accent) to-(--accent2) px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-all enabled:hover:brightness-110 enabled:active:scale-[0.97] disabled:opacity-40"
                >
                  <SendHorizontal size={13} />
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          )}

          {email.folder === "sent" && (
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => onReply("")}
                className="flex items-center gap-1.5 rounded-lg border border-(--line) bg-(--panel) px-3.5 py-2 text-[12.5px] font-semibold hover:bg-(--hover)"
              >
                <ReplyAll size={13.5} /> Follow up
              </button>
              <button
                onClick={onForward}
                className="flex items-center gap-1.5 rounded-lg border border-(--line) bg-(--panel) px-3.5 py-2 text-[12.5px] font-semibold hover:bg-(--hover)"
              >
                <Forward size={13.5} /> Forward
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function minutesUntil(hour: number, addDays: number): number {
  const target = new Date();
  target.setDate(target.getDate() + addDays);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() < Date.now()) target.setDate(target.getDate() + 1);
  return Math.round((target.getTime() - Date.now()) / 60000);
}

function Tool({
  icon: Icon, label, onClick, danger, active,
}: {
  icon: typeof Reply;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
        danger
          ? "text-(--red) hover:bg-(--red)/10"
          : active
            ? "bg-(--amber)/12 text-(--amber)"
            : "text-(--ink2) hover:bg-(--hover) hover:text-(--ink)"
      }`}
    >
      <Icon size={14} />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}


