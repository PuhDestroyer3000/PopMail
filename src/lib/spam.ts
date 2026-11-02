import { getTokenStats, trainTokens } from "./store";

/**
 * PopMail spam filter — two layers that run fully on-device:
 *  1. Heuristics: keywords, shouting-caps, link density, suspicious TLDs…
 *  2. Learning memory: every time a user marks / un-marks a message as spam,
 *     token counts update and future scores get smarter (Naive-Bayes style).
 */

const SPAM_KEYWORDS = [
  "lottery", "winner", "won $", "you have won", "claim your prize", "free money",
  "cash bonus", "act now", "urgent", "limited time offer", "risk-free", "100% free",
  "no obligation", "click here now", "buy now", "viagra", "cialis", "casino",
  "jackpot", "crypto giveaway", "double your bitcoin", "investment opportunity",
  "guaranteed income", "work from home and earn", "make $$$", "nigerian prince",
  "inheritance", "wire transfer", " western union", "gift card", "suspended account",
  "verify your identity", "password expired", "unusual sign-in", "dear beneficiary",
  "selected as our lucky", "congratulations!!!", "weight loss miracle", "hot singles",
  "enlarge", "pharmacy online", "replica watch", "cbd gummies",
];

const BAD_TLDS = [".top", ".xyz", ".buzz", ".click", ".loan", ".win", ".rest", ".icu", ".cam", ".quest"];

export interface SpamVerdict {
  score: number; // 0..100
  isSpam: boolean;
  reasons: string[];
}

const STOPWORDS = new Set(
  ("the a an and or but if then with from your you are was were for not this that have has will would could should its it's our out all any can had her his she him they them their there here when what about into over under more some such only also very just like been being were does did done me my we us i to of in on at as by is it be he no so up do at".split(" "))
);

export function tokenize(text: string, cap = 40): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9@.\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && t.length <= 24 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens)).slice(0, cap);
}

export async function scoreEmail(input: {
  fromEmail: string;
  subject: string;
  bodyText: string;
}): Promise<SpamVerdict> {
  const reasons: string[] = [];
  let score = 0;
  const text = `${input.subject}\n${input.bodyText}`.toLowerCase();

  let hits = 0;
  for (const kw of SPAM_KEYWORDS) if (text.includes(kw)) hits++;
  if (hits > 0) {
    const pts = Math.min(hits * 18, 40);
    score += pts;
    reasons.push(`${hits} spam keyword${hits > 1 ? "s" : ""}`);
  }

  const letters = input.subject.replace(/[^A-Za-z]/g, "");
  const caps = input.subject.replace(/[^A-Z]/g, "");
  if (letters.length >= 8 && caps.length / letters.length > 0.7) {
    score += 16;
    reasons.push("subject is ALL CAPS");
  }

  const exclam = (input.subject + input.bodyText.slice(0, 400)).split("!").length - 1;
  if (exclam >= 3) {
    score += Math.min(exclam * 3, 12);
    reasons.push("excessive exclamation marks");
  }

  const links = (input.bodyText.match(/https?:\/\//g) || []).length;
  if (links >= 5) {
    score += Math.min(links * 2, 14);
    reasons.push("many links");
  }

  const tld = BAD_TLDS.find((t) => input.fromEmail.toLowerCase().endsWith(t));
  if (tld) {
    score += 18;
    reasons.push(`suspicious sender domain (${tld})`);
  }

  if (/[a-z]{2,}\d{4,}@/.test(input.fromEmail.toLowerCase())) {
    score += 10;
    reasons.push("random-looking sender address");
  }

  // Learning memory (Bayes-flavoured adjustment)
  try {
    const tokens = tokenize(`${input.fromEmail} ${input.subject} ${input.bodyText.slice(0, 2000)}`);
    const stats = await getTokenStats(tokens);
    let logOdds = 0;
    let used = 0;
    for (const t of tokens) {
      const s = stats.get(t);
      if (!s) continue;
      const pSpam = (s.spam + 0.5) / (s.spam + s.ham + 1);
      logOdds += Math.log(pSpam / (1 - pSpam));
      used++;
    }
    if (used > 0) {
      const adjust = Math.max(-30, Math.min(30, logOdds * 4));
      if (Math.abs(adjust) > 6) {
        reasons.push(adjust > 0 ? "learned: looks like mail you marked spam" : "learned: looks like mail you trust");
      }
      score += adjust;
    }
  } catch {
    /* learning layer is best-effort */
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, isSpam: score >= 45, reasons: reasons.slice(0, 3) };
}

/** Train the filter from user feedback. */
export async function trainFromEmail(email: {
  fromEmail: string;
  subject: string;
  bodyText: string;
}, isSpam: boolean): Promise<void> {
  const tokens = tokenize(`${email.fromEmail} ${email.subject} ${email.bodyText.slice(0, 2000)}`);
  await trainTokens(tokens, isSpam);
}
