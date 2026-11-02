"use client";

import {
  Inbox, Pin, AlarmClock, SendHorizontal, CheckCheck, ShieldX, Trash2,
  Plus, PenLine, RefreshCw, Moon, Sun, Layers,
} from "lucide-react";
import type { AccountWithCounts, Stats } from "@/lib/types";
import { Avatar } from "./ui";

export type View = "smart" | "pinned" | "snoozed" | "sent" | "archive" | "spam" | "trash";

const NAV: { id: View; label: string; icon: typeof Inbox; folderKey?: string }[] = [
  { id: "smart", label: "Smart Inbox", icon: Inbox, folderKey: "inbox" },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "snoozed", label: "Snoozed", icon: AlarmClock },
  { id: "sent", label: "Sent", icon: SendHorizontal, folderKey: "sent" },
  { id: "archive", label: "Done", icon: CheckCheck, folderKey: "archive" },
  { id: "spam", label: "Spam", icon: ShieldX, folderKey: "spam" },
  { id: "trash", label: "Trash", icon: Trash2, folderKey: "trash" },
];

export default function Sidebar({
  view,
  setView,
  accountId,
  setAccountId,
  accounts,
  stats,
  syncing,
  onSync,
  onCompose,
  onAddAccount,
  theme,
  onToggleTheme,
}: {
  view: View;
  setView: (v: View) => void;
  accountId: number | null;
  setAccountId: (id: number | null) => void;
  accounts: AccountWithCounts[];
  stats: Stats | null;
  syncing: boolean;
  onSync: () => void;
  onCompose: () => void;
  onAddAccount: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-(--line) bg-(--panel)">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <img src="/icon.svg" alt="PopMail" width={30} height={30} className="rounded-[9px] shadow-sm" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-[17px] font-bold tracking-tight">PopMail</span>
          <span className="rounded-full bg-(--hover) px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-(--ink3)">beta</span>
        </div>
      </div>

      {/* Compose */}
      <div className="px-3 pb-2">
        <button
          onClick={onCompose}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-(--accent) to-(--accent2) px-3 py-2.5 text-[13.5px] font-semibold text-white shadow-(--shadow) transition-transform duration-150 hover:brightness-110 active:scale-[0.98]"
        >
          <PenLine size={15} />
          Compose
          <kbd className="ml-auto rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">C</kbd>
        </button>
      </div>

      {/* Search-free sync row */}
      <div className="flex items-center justify-between px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-(--ink3)">
        <span>Folders</span>
        <button
          onClick={onSync}
          title="Check for new mail"
          className="flex items-center gap-1 rounded-md px-1.5 py-1 normal-case text-(--ink2) transition-colors hover:bg-(--hover) hover:text-(--accent)"
        >
          <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2.5">
        {NAV.map((item) => {
          const active = view === item.id;
          const count = item.folderKey ? stats?.byFolder[item.folderKey] ?? 0 : 0;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13.5px] transition-colors ${
                active
                  ? "bg-(--sel) font-semibold text-(--accent)"
                  : "text-(--ink2) hover:bg-(--hover) hover:text-(--ink)"
              }`}
            >
              <item.icon size={16.5} strokeWidth={active ? 2.3 : 2} />
              <span className="truncate">{item.label}</span>
              {count > 0 && (
                <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none ${
                  active ? "bg-(--accent) text-white" : item.id === "spam" ? "bg-(--red)/12 text-(--red)" : "bg-(--hover) text-(--ink2)"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Accounts */}
      <div className="mt-4 flex items-center justify-between px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-(--ink3)">
        <span>Accounts</span>
        <Layers size={11} />
      </div>
      <div className="flex flex-col gap-0.5 overflow-y-auto px-2.5">
        <button
          onClick={() => setAccountId(null)}
          className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
            accountId === null ? "bg-(--sel)" : "hover:bg-(--hover)"
          }`}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-(--accent) to-(--accent2) text-white">
            <Layers size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[13px] ${accountId === null ? "font-semibold text-(--accent)" : "font-medium"}`}>All accounts</div>
            <div className="truncate text-[11px] text-(--ink3)">Unified inbox</div>
          </div>
        </button>

        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setAccountId(a.id)}
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
              accountId === a.id ? "bg-(--sel)" : "hover:bg-(--hover)"
            }`}
          >
            <Avatar name={a.name} email={a.email} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`truncate text-[13px] ${accountId === a.id ? "font-semibold text-(--accent)" : "font-medium"}`}>{a.name}</span>
                {a.isDemo && (
                  <span className="rounded-full bg-(--amber)/15 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-(--amber)">demo</span>
                )}
              </div>
              <div className="truncate text-[11px] text-(--ink3)">{a.email}</div>
            </div>
            {a.unread > 0 && (
              <span className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-full bg-(--accent) px-1 text-[10px] font-bold text-white">
                {a.unread}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={onAddAccount}
          className="mt-1 flex items-center gap-2.5 rounded-xl border border-dashed border-(--line) px-2.5 py-2 text-[13px] text-(--ink2) transition-colors hover:border-(--accent) hover:text-(--accent)"
        >
          <div className="grid h-8 w-8 place-items-center rounded-full bg-(--hover)">
            <Plus size={15} />
          </div>
          Add account
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-(--line) px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-(--ink3)">
          <span className="h-1.5 w-1.5 rounded-full bg-(--green)" />
          {stats ? `${stats.spamCaught} spam blocked` : "Ready"}
        </div>
        <button
          onClick={onToggleTheme}
          title="Toggle theme"
          className="rounded-lg p-2 text-(--ink2) transition-colors hover:bg-(--hover) hover:text-(--ink)"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </aside>
  );
}
