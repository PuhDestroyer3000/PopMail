"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar, { type View } from "./sidebar";
import EmailList, { orderedEmails, type QuickAction } from "./email-list";
import ReadingPane, { type PaneAction } from "./reading-pane";
import Compose, { type ComposeDraft } from "./compose";
import AddAccount from "./add-account";
import type { AccountWithCounts, EmailRow, Stats } from "@/lib/types";

interface Toast {
  id: number;
  msg: string;
  undo?: { label: string; run: () => Promise<void> | void };
}

export default function MailApp() {
  const [view, setView] = useState<View>("smart");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<AccountWithCounts[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] = useState<Partial<ComposeDraft>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  /* ---------------- Theme ---------------- */
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("popmail-theme", next);
    } catch { /* ignore */ }
  };

  /* ---------------- Toasts ---------------- */
  const pushToast = useCallback((msg: string, undo?: Toast["undo"]) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  /* ---------------- Data loading ---------------- */
  const loadAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    const json = await res.json();
    setAccounts(json.accounts ?? []);
    return (json.accounts ?? []) as AccountWithCounts[];
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/stats");
    setStats(await res.json());
  }, []);

  const loadEmails = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (qDebounced) params.set("q", qDebounced);
      else if (view === "smart" || view === "pinned" || view === "snoozed") params.set("view", "smart");
      else params.set("folder", view);
      if (accountId) params.set("accountId", String(accountId));
      if (view === "snoozed") params.set("limit", "400");
      const res = await fetch(`/api/emails?${params.toString()}`);
      const json = await res.json();
      let list: EmailRow[] = json.emails ?? [];
      if (!qDebounced && view === "pinned") list = list.filter((e) => e.isPinned);
      if (!qDebounced && view === "snoozed") list = list.filter((e) => e.snoozedUntil && new Date(e.snoozedUntil).getTime() > Date.now());
      setEmails(list);
    } finally {
      setLoading(false);
    }
  }, [view, accountId, qDebounced]);

  const refresh = useCallback(async (silent = false) => {
    await Promise.all([loadAccounts(), loadStats(), loadEmails({ silent })]);
  }, [loadAccounts, loadStats, loadEmails]);

  // Boot
  useEffect(() => {
    (async () => {
      const accs = await loadAccounts();
      await Promise.all([loadStats(), loadEmails()]);
      setBooting(false);
      if (accs.length === 0) setAddOpen(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload list when view/account/search changes
  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Gentle background refresh
  useEffect(() => {
    const t = setInterval(() => void refresh(true), 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const selected = useMemo(
    () => emails.find((e) => e.id === selectedId) ?? null,
    [emails, selectedId]
  );

  const accountColor = useCallback(
    (id: number) => accounts.find((a) => a.id === id)?.color ?? "#2f7cf6",
    [accounts]
  );

  /* ---------------- Actions ---------------- */
  const act = useCallback(
    async (id: number, action: string, until?: string) => {
      await fetch(`/api/emails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, until }),
      });
    },
    []
  );

  const patchLocal = useCallback((id: number, patch: Partial<EmailRow>) => {
    setEmails((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const dropLocal = useCallback((id: number) => {
    setEmails((list) => list.filter((e) => e.id !== id));
  }, []);

  const doAction = useCallback(
    async (id: number, action: QuickAction | PaneAction, until?: string) => {
      const target = emails.find((e) => e.id === id);
      const finish = async () => {
        await refresh(true);
      };
      switch (action) {
        case "done":
        case "archive":
          await act(id, action);
          if (view === "smart" || view === "pinned") dropLocal(id);
          else patchLocal(id, { folder: "archive", isDone: action === "done" });
          pushToast(action === "done" ? "Marked as done" : "Archived", {
            label: "Undo",
            run: async () => { await act(id, "restore"); await refresh(true); },
          });
          void finish();
          break;
        case "trash":
          await act(id, "trash");
          dropLocal(id);
          if (selectedId === id) setSelectedId(null);
          pushToast("Moved to trash", { label: "Undo", run: async () => { await act(id, "restore"); await refresh(true); } });
          void finish();
          break;
        case "restore":
          await act(id, "restore");
          dropLocal(id);
          if (selectedId === id) setSelectedId(null);
          pushToast("Restored to inbox");
          void finish();
          break;
        case "delete":
          await act(id, "delete");
          dropLocal(id);
          if (selectedId === id) setSelectedId(null);
          pushToast("Deleted forever");
          void finish();
          break;
        case "spam":
          await act(id, "spam");
          dropLocal(id);
          if (selectedId === id) setSelectedId(null);
          pushToast("Marked as spam — filter learned from this", {
            label: "Undo",
            run: async () => { await act(id, "notspam"); await refresh(true); },
          });
          void finish();
          break;
        case "notspam":
          await act(id, "notspam");
          dropLocal(id);
          if (selectedId === id) setSelectedId(null);
          pushToast("Moved back to inbox — filter updated");
          void finish();
          break;
        case "pin":
          await act(id, "pin");
          patchLocal(id, { isPinned: true });
          void finish();
          break;
        case "unpin":
          await act(id, "unpin");
          patchLocal(id, { isPinned: false });
          if (view === "pinned") dropLocal(id);
          void finish();
          break;
        case "star":
          await act(id, "star");
          patchLocal(id, { isStarred: true });
          break;
        case "unstar":
          await act(id, "unstar");
          patchLocal(id, { isStarred: false });
          break;
        case "unread":
          await act(id, "unread");
          patchLocal(id, { isRead: false });
          void loadStats();
          break;
        case "snooze" as never:
          break;
      }
      void target;
    },
    [act, emails, refresh, view, selectedId, patchLocal, dropLocal, pushToast, loadStats]
  );

  const snooze = useCallback(
    async (id: number, until: string) => {
      await act(id, "snooze", until);
      patchLocal(id, { snoozedUntil: until });
      pushToast("Snoozed — it’ll pop back up later", {
        label: "Undo",
        run: async () => { await act(id, "unsnooze"); await refresh(true); },
      });
      await refresh(true);
    },
    [act, patchLocal, pushToast, refresh]
  );

  const selectEmail = useCallback(
    (id: number) => {
      setSelectedId(id);
      const target = emails.find((e) => e.id === id);
      if (target && !target.isRead) {
        patchLocal(id, { isRead: true });
        void act(id, "read").then(() => void loadStats());
      }
    },
    [emails, patchLocal, act, loadStats]
  );

  /* ---------------- Sync ---------------- */
  const doSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      const parts: string[] = [];
      if (json.fetched > 0) parts.push(`${json.fetched} new`);
      if (json.spamCaught > 0) parts.push(`${json.spamCaught} spam filtered`);
      if (json.errors?.length) parts.push(`${json.errors.length} account${json.errors.length > 1 ? "s" : ""} couldn't sync`);
      pushToast(parts.length ? parts.join(" · ") : "You’re up to date");
      await refresh(true);
    } catch {
      pushToast("Sync failed — check your connection");
    } finally {
      setSyncing(false);
    }
  }, [syncing, refresh, pushToast]);

  /* ---------------- Compose / reply ---------------- */
  const openCompose = useCallback((initial: Partial<ComposeDraft> = {}) => {
    setComposeInitial(initial);
    setComposeOpen(true);
  }, []);

  const reply = useCallback(
    async (text: string) => {
      if (!selected) return;
      const to = selected.folder === "sent" ? selected.to.map((t) => t.email).join(", ") : selected.fromEmail;
      const subject = selected.subject.startsWith("Re:") ? selected.subject : `Re: ${selected.subject}`;
      if (!text.trim()) {
        openCompose({ accountId: selected.accountId, to, subject });
        return;
      }
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selected.accountId, to, subject, text }),
      });
      const json = await res.json();
      if (json.ok) pushToast("Reply sent");
      else pushToast(`Couldn’t send: ${json.error}`);
    },
    [selected, openCompose, pushToast]
  );

  const forward = useCallback(() => {
    if (!selected) return;
    openCompose({
      accountId: selected.accountId,
      subject: `Fwd: ${selected.subject}`,
      text: `\n\n---------- Forwarded message ----------\nFrom: ${selected.fromName} <${selected.fromEmail}>\nDate: ${new Date(selected.date).toLocaleString()}\nSubject: ${selected.subject}\n\n${selected.bodyText}`,
    });
  }, [selected, openCompose]);

  /* ---------------- Keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return;
      if (composeOpen || addOpen) return;
      const flat = orderedEmails(view, emails);
      const idx = selectedId ? flat.findIndex((x) => x.id === selectedId) : -1;
      if (e.key === "c") { e.preventDefault(); openCompose(); }
      else if (e.key === "Escape") setSelectedId(null);
      else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const next = flat[Math.min(flat.length - 1, idx + 1)];
        if (next) selectEmail(next.id);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prev = flat[Math.max(0, idx - 1)];
        if (prev) selectEmail(prev.id);
      } else if (e.key === "Enter" && idx >= 0) selectEmail(flat[idx].id);
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) void doAction(selectedId, "trash");
      else if (e.key === "e" && selectedId) void doAction(selectedId, "done");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emails, view, selectedId, composeOpen, addOpen, openCompose, selectEmail, doAction]);

  /* ---------------- Render ---------------- */
  return (
    <div className="flex h-screen overflow-hidden bg-(--bg)">
      <Sidebar
        view={view}
        setView={(v) => { setView(v); setSelectedId(null); setQ(""); }}
        accountId={accountId}
        setAccountId={(id) => { setAccountId(id); setSelectedId(null); }}
        accounts={accounts}
        stats={stats}
        syncing={syncing}
        onSync={() => void doSync()}
        onCompose={() => openCompose()}
        onAddAccount={() => setAddOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {booting ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-fade-up">
            <img src="/icon.svg" alt="" width={52} height={52} className="rounded-2xl shadow-(--shadow-lg)" />
            <div className="text-[13px] font-medium text-(--ink3)">Opening your inbox…</div>
          </div>
        </div>
      ) : (
        <main className="flex min-w-0 flex-1 animate-fade-in">
          <EmailList
            view={view}
            emails={emails}
            loading={loading}
            selectedId={selectedId}
            onSelect={selectEmail}
            onAction={(id, a) => void doAction(id, a)}
            q={q}
            setQ={setQ}
            accountColor={accountColor}
          />
          <ReadingPane
            email={selected}
            onAction={(a) => selected && void doAction(selected.id, a)}
            onReply={reply}
            onForward={forward}
            onSnooze={(until) => selected && void snooze(selected.id, until)}
          />
        </main>
      )}

      <Compose
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        accounts={accounts}
        initial={composeInitial}
        onSent={() => void refresh(true)}
      />

      <AddAccount
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => void refresh()}
      />

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-xl bg-(--ink) px-4 py-2.5 text-[13px] font-medium text-(--bg) shadow-(--shadow-lg) animate-pop-in"
          >
            {t.msg}
            {t.undo && (
              <button
                onClick={() => {
                  void t.undo!.run();
                  setToasts((list) => list.filter((x) => x.id !== t.id));
                }}
                className="rounded-md bg-white/15 px-2 py-0.5 text-[12px] font-bold text-white transition-colors hover:bg-white/25"
              >
                {t.undo.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
