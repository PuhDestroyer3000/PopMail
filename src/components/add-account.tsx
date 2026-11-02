"use client";

import { useState } from "react";
import { Mail, Globe, Apple, Play, Loader2, ArrowLeft, CheckCircle2, Settings2 } from "lucide-react";
import { Modal, ModalHeader } from "./ui";

const PROVIDERS = [
  { id: "gmail", name: "Gmail", note: "App password required", grad: ["#ea4335", "#f97316"] },
  { id: "outlook", name: "Outlook", note: "Microsoft 365 / Hotmail", grad: ["#0a6cff", "#2f7cf6"] },
  { id: "yahoo", name: "Yahoo", note: "App password required", grad: ["#7c3aed", "#a855f7"] },
  { id: "icloud", name: "iCloud", note: "App-specific password", grad: ["#475569", "#64748b"] },
  { id: "custom", name: "Custom IMAP", note: "Any mail server", grad: ["#0891b2", "#10b981"] },
  { id: "demo", name: "Demo Account", note: "Try PopMail instantly", grad: ["#f59e0b", "#f43f5e"] },
];

export default function AddAccount({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [provider, setProvider] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setProvider(null); setName(""); setEmail(""); setPassword("");
    setImapHost(""); setImapPort("993"); setSmtpHost(""); setSmtpPort("465");
    setBusy(false); setError(null); setDone(false);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 250);
  };

  const submit = async () => {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      if (provider === "demo") {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "demo" }),
        });
        if (!res.ok) throw new Error("Could not create the demo account.");
      } else {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name, email, password, provider,
            imapHost: provider === "custom" ? imapHost : undefined,
            imapPort: provider === "custom" ? Number(imapPort) : undefined,
            smtpHost: provider === "custom" ? smtpHost : undefined,
            smtpPort: provider === "custom" ? Number(smtpPort) : undefined,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Could not connect.");
      }
      setDone(true);
      setTimeout(() => {
        onAdded();
        close();
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const p = PROVIDERS.find((x) => x.id === provider);

  return (
    <Modal open={open} onClose={close} width={560}>
      <ModalHeader
        title="Add an email account"
        subtitle={provider ? (p?.name ?? "") : "Connect Gmail, Outlook, Yahoo, iCloud, or any IMAP server."}
        onClose={close}
      />
      {!provider ? (
        <div className="grid grid-cols-2 gap-2.5 p-5 sm:grid-cols-3">
          {PROVIDERS.map((prov, i) => (
            <button
              key={prov.id}
              onClick={() => setProvider(prov.id)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-(--line) bg-(--panel2) px-3 py-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-(--accent)/40 hover:shadow-(--shadow) animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${prov.grad[0]}, ${prov.grad[1]})` }}
              >
                {prov.id === "gmail" && <Mail size={19} />}
                {prov.id === "outlook" && <Mail size={19} />}
                {prov.id === "yahoo" && <Globe size={19} />}
                {prov.id === "icloud" && <Apple size={19} />}
                {prov.id === "custom" && <Settings2 size={19} />}
                {prov.id === "demo" && <Play size={19} />}
              </div>
              <div className="text-[13px] font-semibold">{prov.name}</div>
              <div className="text-[10.5px] text-(--ink3)">{prov.note}</div>
            </button>
          ))}
        </div>
      ) : done ? (
        <div className="flex flex-col items-center gap-3 p-12 text-center animate-pop-in">
          <CheckCircle2 size={44} className="text-(--green)" />
          <div className="text-[15px] font-semibold">Account connected</div>
          <div className="text-[13px] text-(--ink2)">PopMail is syncing your inbox now.</div>
        </div>
      ) : provider === "demo" ? (
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-(--amber)/30 bg-(--amber)/[0.07] px-4 py-3 text-[13px] leading-relaxed text-(--ink2)">
            The demo account loads a realistic mailbox — personal mail, notifications, newsletters, and spam that gets
            auto-filtered. Every <b>Sync</b> press delivers a new message. You can send mail to Sarah, Daniel, Maya,
            Priya, or Mom and they’ll write back.
          </div>
          {error && <Err msg={error} />}
          <div className="flex gap-2">
            <Back onClick={() => setProvider(null)} disabled={busy} />
            <button onClick={submit} disabled={busy} className="btn-primary flex-1 rounded-xl bg-gradient-to-b from-(--accent) to-(--accent2) py-2.5 text-[13.5px] font-semibold text-white transition-all enabled:hover:brightness-110 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="mx-auto animate-spin" /> : "Create demo mailbox"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-5">
          <Field label="Your name" value={name} onChange={setName} placeholder="Alex Carter" />
          <Field label="Email address" value={email} onChange={setEmail} placeholder={`you@${provider === "gmail" ? "gmail.com" : provider === "outlook" ? "outlook.com" : provider === "yahoo" ? "yahoo.com" : provider === "icloud" ? "icloud.com" : "example.com"}`} type="email" />
          <div>
            <Field label={provider === "gmail" || provider === "yahoo" || provider === "icloud" ? "App password" : "Password"} value={password} onChange={setPassword} placeholder="••••••••••••••••" type="password" />
            {provider !== "custom" && (
              <a
                href={helpLink(provider)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[11.5px] font-medium text-(--accent) hover:underline"
              >
                How do I get {provider === "outlook" ? "my password" : "an app password"}?
              </a>
            )}
          </div>
          {provider === "custom" && (
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-(--line) bg-(--panel2) p-3">
              <Field label="IMAP host" value={imapHost} onChange={setImapHost} placeholder="imap.example.com" />
              <Field label="IMAP port" value={imapPort} onChange={setImapPort} placeholder="993" />
              <Field label="SMTP host" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.example.com" />
              <Field label="SMTP port" value={smtpPort} onChange={setSmtpPort} placeholder="465" />
            </div>
          )}
          {error && <Err msg={error} />}
          <div className="flex gap-2 pt-1">
            <Back onClick={() => setProvider(null)} disabled={busy} />
            <button
              onClick={submit}
              disabled={busy || !email || !password || (provider === "custom" && (!imapHost || !smtpHost))}
              className="flex-1 rounded-xl bg-gradient-to-b from-(--accent) to-(--accent2) py-2.5 text-[13.5px] font-semibold text-white transition-all enabled:hover:brightness-110 disabled:opacity-50"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin" /> Testing connection…
                </span>
              ) : (
                "Connect account"
              )}
            </button>
          </div>
          <p className="text-center text-[11px] text-(--ink3)">
            Credentials are stored locally on this device and never sent anywhere except your mail server.
          </p>
        </div>
      )}
    </Modal>
  );
}

function helpLink(provider: string): string {
  switch (provider) {
    case "gmail": return "https://support.google.com/accounts/answer/185833";
    case "yahoo": return "https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html";
    case "icloud": return "https://support.apple.com/en-us/102654";
    default: return "https://support.microsoft.com/account-billing";
  }
}

function Field({ label, value, onChange, placeholder, type }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-(--ink3)">{label}</span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-(--line) bg-(--panel) px-3 py-2 text-[13.5px] outline-none transition-shadow focus:ring-2 focus:ring-(--accent)/40 placeholder:text-(--ink3)"
      />
    </label>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-(--red)/30 bg-(--red)/[0.07] px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-(--red) animate-fade-in">
      {msg}
    </div>
  );
}

function Back({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-xl border border-(--line) px-3.5 py-2.5 text-[13px] font-semibold text-(--ink2) transition-colors hover:bg-(--hover) disabled:opacity-50"
    >
      <ArrowLeft size={14} /> Back
    </button>
  );
}
