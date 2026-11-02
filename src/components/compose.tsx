"use client";

import { useState } from "react";
import { Minus, SendHorizontal, X, ChevronDown } from "lucide-react";
import type { AccountWithCounts } from "@/lib/types";

export interface ComposeDraft {
  accountId: number;
  to: string;
  cc: string;
  subject: string;
  text: string;
}

export default function Compose({
  open,
  onClose,
  accounts,
  initial,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  accounts: AccountWithCounts[];
  initial: Partial<ComposeDraft>;
  onSent: () => void;
}) {
  const [draft, setDraft] = useState<Partial<ComposeDraft>>(initial);
  const [minimized, setMinimized] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCc, setShowCc] = useState(!!initial.cc);

  // Reset when a fresh compose is opened
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setDraft(initial);
      setMinimized(false);
      setError(null);
      setShowCc(!!initial.cc);
    }
  }

  if (!open) return null;

  const accountId = draft.accountId ?? accounts[0]?.id;
  const canSend = !!draft.to?.trim() && !!draft.text?.trim() && !sending;

  const send = async () => {
    if (!canSend || !accountId) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          to: draft.to,
          cc: draft.cc,
          subject: draft.subject,
          text: draft.text,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      onSent();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const fromAccount = accounts.find((a) => a.id === accountId);

  return (
    <div
      className={`fixed bottom-0 right-5 z-40 flex w-[480px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-t-2xl border border-(--line) bg-(--panel) shadow-(--shadow-lg) animate-pop-in ${
        minimized ? "h-12" : "h-[460px]"
      }`}
    >
      <div className="flex h-12 shrink-0 items-center justify-between bg-(--panel2) px-4">
        <span className="text-[13px] font-semibold">{draft.subject || "New message"}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized((v) => !v)} className="rounded-md p-1.5 text-(--ink3) hover:bg-(--hover) hover:text-(--ink)">
            <Minus size={14} />
          </button>
          <button onClick={onClose} className="rounded-md p-1.5 text-(--ink3) hover:bg-(--hover) hover:text-(--ink)">
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="flex items-center gap-2 border-b border-(--line2) px-4 py-2 text-[13px]">
            <span className="w-11 text-(--ink3)">From</span>
            <div className="relative flex-1">
              <select
                value={accountId}
                onChange={(e) => setDraft((d) => ({ ...d, accountId: Number(e.target.value) }))}
                className="w-full cursor-pointer appearance-none bg-transparent font-medium outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} &lt;{a.email}&gt;{a.isDemo ? " (demo)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-1 top-1.5 text-(--ink3)" />
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-(--line2) px-4 py-2">
            <span className="w-11 text-[13px] text-(--ink3)">To</span>
            <input
              autoFocus
              value={draft.to ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              placeholder="friends@example.com"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--ink3)"
            />
            {!showCc && (
              <button onClick={() => setShowCc(true)} className="text-[11.5px] font-semibold text-(--ink3) hover:text-(--ink)">
                Cc
              </button>
            )}
          </div>
          {showCc && (
            <div className="flex items-center gap-2 border-b border-(--line2) px-4 py-2">
              <span className="w-11 text-[13px] text-(--ink3)">Cc</span>
              <input
                value={draft.cc ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, cc: e.target.value }))}
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
            </div>
          )}
          <div className="border-b border-(--line2) px-4 py-2">
            <input
              value={draft.subject ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
              placeholder="Subject"
              className="w-full bg-transparent text-[13px] font-semibold outline-none placeholder:font-normal placeholder:text-(--ink3)"
            />
          </div>
          <textarea
            value={draft.text ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Write your message…  (⌘/Ctrl + Enter to send)"
            className="flex-1 resize-none bg-transparent px-4 py-3 text-[13.5px] leading-relaxed outline-none placeholder:text-(--ink3)"
          />
          {error && <div className="px-4 pb-1 text-[12px] font-medium text-(--red)">{error}</div>}
          <div className="flex items-center gap-2 px-3.5 pb-3">
            <button
              onClick={() => void send()}
              disabled={!canSend}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-(--accent) to-(--accent2) px-4 py-2 text-[13px] font-semibold text-white shadow-(--shadow) transition-all enabled:hover:brightness-110 enabled:active:scale-[0.97] disabled:opacity-40"
            >
              <SendHorizontal size={14} />
              {sending ? "Sending…" : "Send"}
            </button>
            {fromAccount?.isDemo && (
              <span className="text-[11px] text-(--ink3)">
                Demo account — mail stays local, and known contacts reply on your next sync.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
