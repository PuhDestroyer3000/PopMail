"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/* ---------------- Avatar ---------------- */

const GRADIENTS: [string, string][] = [
  ["#6366f1", "#3b82f6"],
  ["#8b5cf6", "#d946ef"],
  ["#06b6d4", "#3b82f6"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
  ["#f43f5e", "#ec4899"],
  ["#64748b", "#475569"],
  ["#84cc16", "#10b981"],
];

function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function Avatar({ name, email, size = 36 }: { name: string; email: string; size?: number }) {
  const [c1, c2] = GRADIENTS[hashStr(email || name) % GRADIENTS.length];
  const initials = (name || email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div
      className="grid shrink-0 select-none place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
      }}
    >
      {initials || "?"}
    </div>
  );
}

/* ---------------- Formatting ---------------- */

export function formatListDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

export function formatSnooze(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-[6px] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full overflow-hidden rounded-2xl border border-(--line) bg-(--panel) shadow-(--shadow-lg) animate-pop-in"
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-(--line) px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-(--ink2)">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="rounded-lg p-1.5 text-(--ink3) transition-colors hover:bg-(--hover) hover:text-(--ink)">
        <X size={16} />
      </button>
    </div>
  );
}
