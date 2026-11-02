import type { EmailRow } from "./types";

/**
 * PopMail AI features.
 * If OPENAI_API_KEY is set in the environment, PopMail uses OpenAI for
 * genuinely smart summaries / replies. Otherwise it falls back to a fast,
 * fully on-device engine so every feature works offline in the .exe too.
 */

export function aiMode(): "openai" | "on-device" {
  return process.env.OPENAI_API_KEY ? "openai" : "on-device";
}

async function openaiChat(system: string, user: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/* ---------------- On-device fallback engine ---------------- */

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 400);
}

function localSummarize(email: EmailRow): string[] {
  const sents = sentences(email.bodyText);
  if (!sents.length) {
    return [email.snippet || email.subject];
  }
  // Term-frequency scoring (tiny TextRank)
  const freq = new Map<string, number>();
  for (const s of sents) {
    for (const w of s.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  const scored = sents.map((s, i) => {
    let score = 0;
    const ws = s.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    for (const w of ws) score += freq.get(w) ?? 0;
    score = score / Math.max(1, ws.length) + (i === 0 ? 1.5 : 0);
    return { s, i, score };
  });
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s.replace(/^(hi|hello|dear|hey)[^.\n]*[.,]?\s*/i, ""));
  return top;
}

function localSmartReplies(email: EmailRow): string[] {
  const t = `${email.subject} ${email.bodyText}`.toLowerCase();
  const name = email.fromName.split(" ")[0] || "there";
  const replies: string[] = [];

  if (/(meeting|call|schedule|calendar|catch ?up|sync|zoom|meet|lunch|coffee)/.test(t)) {
    replies.push(`That works for me — see you then!`, `Thanks ${name}! Could we do 30 minutes later in the day?`, `I've accepted the invite. Talk soon!`);
  } else if (/(review|feedback|approval|approve|sign ?off|look at|check (this|it) out|thoughts)/.test(t)) {
    replies.push(`Thanks ${name} — looks great, approved!`, `I'll review this today and send feedback by tomorrow.`, `Got it. A couple of small tweaks, then it's good to go.`);
  } else if (/(invoice|payment|bill|receipt|order)/.test(t)) {
    replies.push(`Payment confirmed, thanks!`, `Thanks — could you resend the invoice as a PDF?`, `Received, we'll process this today.`);
  } else if (/(question|\?)/.test(t)) {
    replies.push(`Great question — I'll dig in and get back to you today.`, `Yes, that works. Thanks for checking!`, `Let me confirm and reply with details shortly.`);
  } else if (/(thank|thanks|appreciated|appreciate)/.test(t)) {
    replies.push(`You're very welcome!`, `Anytime — happy to help!`, `Glad it worked out!`);
  } else {
    replies.push(`Thanks for the update, ${name}!`, `Got it — I'll take care of this today.`, `Sounds good, thanks!`);
  }
  return replies.slice(0, 3);
}

/* ---------------- Public API ---------------- */

export async function summarizeEmail(email: EmailRow): Promise<{ bullets: string[]; mode: string }> {
  const viaAi = await openaiChat(
    "You are the summarizer inside the PopMail desktop app. Summarize the email in exactly 3 short bullet points (max 18 words each), plain text, no markdown symbols other than a leading '- '. Focus on decisions, dates, and action items.",
    `Subject: ${email.subject}\nFrom: ${email.fromName} <${email.fromEmail}>\n\n${email.bodyText.slice(0, 6000)}`
  );
  if (viaAi) {
    const bullets = viaAi
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 4);
    if (bullets.length) return { bullets, mode: "openai" };
  }
  return { bullets: localSummarize(email), mode: "on-device" };
}

export async function smartReplies(email: EmailRow): Promise<{ replies: string[]; mode: string }> {
  const viaAi = await openaiChat(
    "You are the smart-reply generator inside PopMail. Write exactly 3 short reply options for this email (each max 15 words, friendly-professional tone). One affirmative, one question/alternative, one neutral. Output each on its own line with no numbering or bullets.",
    `Subject: ${email.subject}\nFrom: ${email.fromName}\n\n${email.bodyText.slice(0, 4000)}`
  );
  if (viaAi) {
    const replies = viaAi
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
    if (replies.length) return { replies, mode: "openai" };
  }
  return { replies: localSmartReplies(email), mode: "on-device" };
}
