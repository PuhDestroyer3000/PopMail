"use client";

import { useState } from "react";
import {
  Search, Pin, CheckCheck, Trash2, Paperclip, AlarmClock, ChevronDown,
  User, Bell, Newspaper, ShieldX, Sparkles, Inbox, Undo2,
} from "lucide-react";
import type { EmailRow } from "@/lib/types";
import { Avatar, formatListDate, formatSnooze } from "./ui";
import type { View } from "./sidebar";

const SECTION_META: Record<string, { label: string; icon: typeof User; tint: string }> = {
  pinned: { label: "Pinned", icon: Pin, tint: "#f59e0b" },
  personal: { label: "Personal", icon: User, tint: "#2f7cf6" },
  notifications: { label: "Notifications", icon: Bell, tint: "#8b5cf6" },
  newsletters: { label: "Newsletters", icon: Newspaper, tint: "#10b981" },
};

export type QuickAction = "done" | "pin" | "unpin" | "trash" | "restore" | "spam" | "notspam";

export default function EmailList({
  view,
  emails,
  loading,
  selectedId,
  onSelect,
  onAction,
  q,
  setQ,
  accountColor,
}: {
  view: View;
  emails: EmailRow[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAction: (id: number, action: QuickAction) => void;
  q: string;
  setQ: (v: string) => void;
  accountColor: (id: number) => string;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [focusIdx, setFocusIdx] = useState(0);

  const toggleSection = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const sections = buildSections(view, emails);

  function Row({ e, i }: { e: EmailRow; i: number }) {
    const unread = !e.isRead;
    const selected = selectedId === e.id;
    return (
      <div
        key={e.id}
        onClick={() => {
          onSelect(e.id);
          setFocusIdx(i);
        }}
        className={`group relative mx-1.5 cursor-pointer rounded-xl border px-3 py-2.5 transition-all duration-150 animate-fade-up ${
          selected
            ? "border-(--sel-line) bg-(--sel)"
            : "border-transparent hover:border-(--line) hover:bg-(--hover)"
        }`}
        style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }}
      >
        <div className="flex items-start gap-2.5">
          <div className="relative pt-0.5">
            <Avatar name={e.fromName} email={e.fromEmail} size={36} />
            {unread && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-(--panel) bg-(--accent)" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className={`truncate text-[13.5px] ${unread ? "font-bold" : "font-medium text-(--ink2)"}`}>
                {e.fromName || e.fromEmail}
              </span>
              <span className="ml-auto shrink-0 text-[11px] tabular-nums text-(--ink3)">
                {e.snoozedUntil ? (
                  <span className="flex items-center gap-1 text-(--amber)">
                    <AlarmClock size={11} /> {formatSnooze(e.snoozedUntil)}
                  </span>
                ) : (
                  formatListDate(e.date)
                )}
              </span>
            </div>
            <div className={`mt-px truncate text-[12.5px] ${unread ? "font-semibold" : "text-(--ink2)"}`}>
              {e.subject}
            </div>
            <div className="mt-px line-clamp-1 text-[12px] leading-snug text-(--ink3)">{e.snippet}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accountColor(e.accountId) }} />
              {e.hasAttachments && <Paperclip size={11} className="text-(--ink3)" />}
              {e.isPinned && <Pin size={11} className="text-(--amber)" />}
              {e.isSpam && (
                <span className="flex items-center gap-1 rounded-full bg-(--red)/10 px-1.5 py-px text-[10px] font-semibold text-(--red)">
                  <ShieldX size={10} /> Spam · {e.spamScore}
                </span>
              )}
              {view === "smart" && e.category !== "personal" && !e.isSpam && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-(--ink3)">
                  {e.category === "notifications" ? "Notification" : "Newsletter"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hover quick actions */}
        <div className="absolute right-2 top-2 hidden items-center gap-0.5 rounded-lg border border-(--line) bg-(--panel) p-0.5 shadow-(--shadow) group-hover:flex animate-fade-in">
          {view !== "trash" && view !== "spam" && (
            <>
              <HoverBtn title={e.isPinned ? "Unpin" : "Pin"} onClick={(ev) => { ev.stopPropagation(); onAction(e.id, e.isPinned ? "unpin" : "pin"); }}>
                <Pin size={13} className={e.isPinned ? "text-(--amber)" : ""} />
              </HoverBtn>
              <HoverBtn title="Mark done" onClick={(ev) => { ev.stopPropagation(); onAction(e.id, "done"); }}>
                <CheckCheck size={13} />
              </HoverBtn>
              <HoverBtn title="Move to trash" onClick={(ev) => { ev.stopPropagation(); onAction(e.id, "trash"); }}>
                <Trash2 size={13} />
              </HoverBtn>
            </>
          )}
          {view === "spam" && (
            <HoverBtn title="Not spam" onClick={(ev) => { ev.stopPropagation(); onAction(e.id, "notspam"); }}>
              <Undo2 size={13} />
            </HoverBtn>
          )}
          {view === "trash" && (
            <HoverBtn title="Restore" onClick={(ev) => { ev.stopPropagation(); onAction(e.id, "restore"); }}>
              <Undo2 size={13} />
            </HoverBtn>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="flex h-full w-[400px] shrink-0 flex-col border-r border-(--line) bg-(--panel)">
      {/* Search */}
      <div className="border-b border-(--line) p-2.5">
        <div className="flex items-center gap-2 rounded-xl bg-(--panel2) px-3 py-2 ring-(--accent) transition-shadow focus-within:ring-2">
          <Search size={14.5} className="shrink-0 text-(--ink3)" />
          <input
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="Search all mail…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-(--ink3)"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-[11px] font-semibold text-(--accent)">Clear</button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 space-y-1 overflow-y-auto py-1.5" tabIndex={-1}>
        {loading && <SkeletonList />}
        {!loading && emails.length === 0 && <Empty view={view} searching={!!q} />}
        {!loading &&
          sections.map((sec) => {
            const isCollapsed = collapsed[sec.key];
            const meta = SECTION_META[sec.key];
            return (
              <div key={sec.key}>
                {sec.key !== "flat" && meta && (
                  <button
                    onClick={() => toggleSection(sec.key)}
                    className="sticky top-0 z-10 flex w-full items-center gap-2 bg-(--panel)/90 px-4 pb-1 pt-2 backdrop-blur-sm"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: `${meta.tint}1f`, color: meta.tint }}>
                      <meta.icon size={11.5} />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-(--ink2)">{meta.label}</span>
                    <span className="rounded-full bg-(--hover) px-1.5 text-[10px] font-bold text-(--ink3)">{sec.items.length}</span>
                    <ChevronDown size={13} className={`ml-auto text-(--ink3) transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                )}
                {!isCollapsed && sec.items.map((e, i) => <Row key={e.id} e={e} i={i} />)}
              </div>
            );
          })}
      </div>
    </section>
  );
}

function HoverBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-md p-1.5 text-(--ink2) transition-colors hover:bg-(--hover) hover:text-(--ink)"
    >
      {children}
    </button>
  );
}

export function orderedEmails(view: View, emails: EmailRow[]): EmailRow[] {
  if (view !== "smart") return emails;
  const pinned = emails.filter((e) => e.isPinned);
  const personal = emails.filter((e) => !e.isPinned && e.category === "personal");
  const notifications = emails.filter((e) => !e.isPinned && e.category === "notifications");
  const newsletters = emails.filter((e) => !e.isPinned && e.category === "newsletters");
  return [...pinned, ...personal, ...notifications, ...newsletters];
}

function buildSections(view: View, emails: EmailRow[]): { key: string; items: EmailRow[] }[] {
  if (view !== "smart") return [{ key: "flat", items: emails }];
  const pinned = emails.filter((e) => e.isPinned);
  const personal = emails.filter((e) => !e.isPinned && e.category === "personal");
  const notifications = emails.filter((e) => !e.isPinned && e.category === "notifications");
  const newsletters = emails.filter((e) => !e.isPinned && e.category === "newsletters");
  return [
    { key: "pinned", items: pinned },
    { key: "personal", items: personal },
    { key: "notifications", items: notifications },
    { key: "newsletters", items: newsletters },
  ].filter((s) => s.items.length > 0);
}

function SkeletonList() {
  return (
    <div className="space-y-2.5 px-4 py-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex gap-3" style={{ opacity: 1 - i * 0.12 }}>
          <div className="skeleton h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="skeleton h-2.5 w-3/5" />
            <div className="skeleton h-2.5 w-4/5" />
            <div className="skeleton h-2.5 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ view, searching }: { view: View; searching: boolean }) {
  const copy: Record<string, [string, string]> = {
    smart: ["All caught up", "Your Smart Inbox is empty. New mail lands here, sorted for you."],
    spam: ["No spam right now", "PopMail's filter is learning from everything you mark."],
    pinned: ["Nothing pinned", "Pin important threads to keep them at the top."],
    snoozed: ["Nothing snoozed", "Snooze mail to deal with it at the perfect time."],
    sent: ["No sent mail yet", "Messages you send will appear here."],
    archive: ["Nothing done yet", "Mark mail as done to file it away."],
    trash: ["Trash is empty", "Deleted mail waits here before it's gone for good."],
  };
  const [title, sub] = searching
    ? ["No matches", "Try a different name, subject, or keyword."]
    : copy[view] ?? ["Empty", "Nothing here yet."];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center animate-fade-up">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-(--accent)/15 to-(--accent)/5 text-(--accent)">
        {searching ? <Search size={22} /> : view === "spam" ? <ShieldX size={22} /> : view === "smart" ? <Sparkles size={22} /> : <Inbox size={22} />}
      </div>
      <div className="text-[14px] font-semibold">{title}</div>
      <div className="max-w-[240px] text-[12.5px] leading-relaxed text-(--ink2)">{sub}</div>
    </div>
  );
}
