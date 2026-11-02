import { createAccount, insertEmail, getSetting, setSetting } from "./store";
import { scoreEmail } from "./spam";
import type { NewEmail } from "./types";

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const later = (min: number) => new Date(Date.now() + min * 60_000).toISOString();

const you = { name: "Alex Carter", email: "alex@popmail.app" };

interface DemoSpec extends Omit<NewEmail, "accountId"> {}

const SEED: DemoSpec[] = [
  // ---------------- Personal ----------------
  d("sarah-dinner", "inbox", "personal", "Sarah Kim", "sarah.kim@gmail.com",
    "Dinner this Friday? 🍜".replace(" 🍜", ""),
    "Hey Alex! It's been way too long. Are you free for dinner this Friday? I found this tiny ramen place downtown with incredible reviews. Let me know and I'll book us a table for 7pm. Bring that energy you've been bragging about 😄".replace(" 😄", ""),
    ago(12), { isRead: false }),
  d("mom-photos", "inbox", "personal", "Mom", "linda.carter@gmail.com",
    "Photos from the trip!",
    "Hi sweetheart! Finally got around to uploading the photos from our cabin weekend. The ones of you and Dad by the lake are my favorite. Tell Sarah we said hi — and call your mother sometime this week!\n\nLove, Mom",
    ago(65), { isRead: false, hasAttachments: true }),
  d("daniel-proposal", "inbox", "personal", "Daniel Ross", "daniel@northwindstudio.com",
    "Re: Proposal draft",
    "Alex,\n\nI went through the proposal twice. The timeline in section 3 is realistic but I'd tighten the budget to $48k. If we land this, it sets us up for the whole year.\n\nCan you update the numbers and send the final version before Thursday's call?\n\nThanks,\nDaniel",
    ago(130), { isRead: false }),
  d("priya-hike", "inbox", "personal", "Priya Nair", "priya.nair@outlook.com",
    "Weekend hiking plan",
    "Morning! Trailhead is Glacier Point parking at 7:30am sharp. I'll bring coffee and the good granola. Weather says 68° and sunny — perfect. We'll be back by 3pm so dinner plans are safe. Who's bringing the speaker this time?",
    ago(60 * 26), { isRead: true }),
  d("james-fantasy", "inbox", "personal", "James Wu", "jwu88@gmail.com",
    "Fantasy league trade",
    "Bro. FINAL offer: my RB2 + a 4th rounder for your WR1. My team is cursed this year and you know it. Do the right thing. League dinner is still on at my place next month either way.",
    ago(60 * 28), { isRead: true }),
  d("grandma", "inbox", "personal", "Grandma Rose", "rose.carter@aol.com",
    "Re: Sunday lunch",
    "Hello dear, yes Sunday at noon works perfectly. I'm making the lasagna you like, the one with the extra cheese. Bring your appetite and tell me more about this new job of yours. Love you.",
    ago(60 * 76), { isRead: true }),

  // ---------------- Notifications ----------------
  d("gh-build", "inbox", "notifications", "GitHub", "notifications@github.com",
    "[popmail] Build passed on main",
    "Workflow \"CI\" run #214 completed successfully.\n\n✔ install\n✔ typecheck\n✔ build\n\nDuration: 2m 41s".replace("✔ install\n✔ typecheck\n✔ build", "install — passed\ntypecheck — passed\nbuild — passed"),
    ago(25), { isRead: false }),
  d("figma-mention", "inbox", "notifications", "Figma", "team@figma.com",
    "Maya mentioned you in “PopMail Redesign”",
    "Maya Chen: \"@alex can you double-check the reading pane spacing on the dark theme? The 12px gutter feels tight on smaller screens. Otherwise this is ready to ship.\"",
    ago(45), { isRead: false }),
  d("chase-statement", "inbox", "notifications", "Chase Secure", "no-reply@alertsp.chase.com",
    "Your new statement is ready",
    "Your May statement for account ending in 4821 is now available. Current balance: $4,209.17. Minimum payment due June 12: $35.00.\n\nIf you did not authorize recent activity, contact us immediately.",
    ago(60 * 6), { isRead: true }),
  d("vercel-deploy", "inbox", "notifications", "Vercel", "notifications@vercel.com",
    "Deployment completed: popmail-web",
    "Your project popmail-web was successfully deployed to production.\n\nCommit: feat: smart inbox grouping\nDuration: 48s\nStatus: ● Ready",
    ago(60 * 8), { isRead: true }),
  d("gcal-invite", "inbox", "notifications", "Google Calendar", "calendar-notification@google.com",
    "Invitation: Design sync @ Tue 10:00",
    "Maya Chen has invited you to Design sync on Tuesday, June 10 at 10:00–10:30am (America/New_York). Video call link attached. Going? Reply in your calendar.",
    ago(60 * 24), { isRead: true }),
  d("linkedin-views", "inbox", "notifications", "LinkedIn", "notifications-noreply@linkedin.com",
    "You appeared in 12 searches this week",
    "Recruiters and others found you 12 times this week. Search appearances are up 40% since you added “product engineer” to your headline. Keep your profile fresh to stay visible.",
    ago(60 * 50), { isRead: true }),
  d("stripe-payout", "inbox", "notifications", "Stripe", "receipts@stripe.com",
    "Your payout of $1,204.00 is on its way",
    "A payout of $1,204.00 was initiated to your bank account ending in 7788. Expected arrival: 2 business days. This covers 23 transactions from May 26 – June 1.\n\nThank you for using Stripe.",
    ago(60 * 5), { isRead: false, snoozedUntil: later(60 * 20) }),

  // ---------------- Newsletters ----------------
  d("morning-digest", "inbox", "newsletters", "Morning Digest", "crew@morningdigest.com",
    "The 5 things to know this morning",
    "Good morning. Today's briefing:\n\n1. Apple reportedly testing two foldable iPhone prototypes ahead of a 2027 launch.\n2. The Fed holds rates steady; markets rally into the close.\n3. NASA's Europa Clipper sends back its clearest images yet.\n4. Box office: the summer's first $100M opening weekend.\n5. Recipe of the day: 15-minute miso butter pasta.\n\nTo stop receiving: unsubscribe below.",
    ago(60), { isRead: false }),
  d("ph-daily", "inbox", "newsletters", "Product Hunt Daily", "daily@producthunt.com",
    "Today's top hunts: an AI sleep coach and more",
    "Fresh on the leaderboard:\n\n• Somnia — AI sleep coach that actually works (412 upvotes)\n• Clipboard — your clipboard, finally synced everywhere (388)\n• TinyBill — invoicing for freelancers in 30 seconds (341)\n\nHappy hunting! Unsubscribe any time.",
    ago(60 * 3), { isRead: false }),
  d("ux-weekly", "inbox", "newsletters", "UX Weekly", "newsletter@uxweekly.design",
    "Issue #142: The death of the hamburger menu",
    "This week: why teams are quietly retiring the hamburger menu, a case study on bottom-sheet navigation, five delightful empty states, and a critique of AI-generated wireframes.\n\nReading time: 6 minutes. Unsubscribe in one click.",
    ago(60 * 48), { isRead: true }),
  d("prag-eng", "inbox", "newsletters", "The Pragmatic Engineer", "gergely@pragmaticengineer.com",
    "What senior engineers do differently",
    "A deep dive into habits that separate senior engineers: writing before coding, managing up, and treating on-call as a product surface. Plus: industry pulse on compensation bands across 40 companies.\n\nYou're receiving this because you subscribed. Unsubscribe below.",
    ago(60 * 72), { isRead: true }),
  d("yc-school", "inbox", "newsletters", "Startup School", "school@ycombinator.com",
    "Applications open for the next batch",
    "Applications for Startup School are now open. This 8-week online course covers idea validation, talking to users, and shipping your MVP — free, as always.\n\nDeadline: June 30. Don't want these emails? Unsubscribe below.",
    ago(60 * 98), { isRead: true }),

  // ---------------- Auto-filtered spam ----------------
  d("spam-prize", "spam", "personal", "Prize Center", "lucky.winner3892@prize-claim.top",
    "CONGRATULATIONS!!! You have WON a $1,000,000 prize!",
    "DEAR LUCKY WINNER!!! You have been SELECTED as our lucky winner of $1,000,000 USD in the GLOBAL EMAIL LOTTERY! This is 100% FREE money — no obligation! ACT NOW, this is a LIMITED TIME OFFER!!! Click here now to claim your prize and provide your bank details for the wire transfer. Congratulations!!!",
    ago(60 * 9), { isSpam: true, spamScore: 96, spamReason: "spam keywords · ALL CAPS · suspicious domain" }),
  d("spam-verify", "spam", "personal", "Account Security", "secure-update3737@acc0unt-verify.xyz",
    "Urgent: verify your account now!",
    "Dear Customer, your account will be SUSPENDED in 24 hours due to unusual sign-in activity!!! Verify your identity immediately to avoid permanent closure. Click here now: https://bit.ly/33xfake. Failure to act now means you lose EVERYTHING.",
    ago(60 * 30), { isSpam: true, isRead: true, spamScore: 88, spamReason: "spam keywords · urgency + links · suspicious domain" }),
  d("spam-crypto", "spam", "personal", "Crypto Giveaway", "airdrop@bit2x.buzz",
    "Double your Bitcoin in 24 hours!!",
    "Exclusive crypto giveaway! Send 0.1 BTC and receive 0.2 BTC back instantly — guaranteed income, risk-free! This investment opportunity is only open for a limited time. Make $$$ while you sleep! Visit https://bit2x.buzz/double now!",
    ago(60 * 52), { isSpam: true, isRead: true, spamScore: 93, spamReason: "spam keywords · crypto giveaway · suspicious domain" }),

  // ---------------- Sent ----------------
  d("sent-proposal", "sent", "personal", "Alex Carter", "alex@popmail.app",
    "Re: Proposal draft",
    "Daniel,\n\nUpdated the budget to $48k and restructured the timeline — section 3 now has buffer weeks. Final version attached for Thursday's call.\n\nTalk soon,\nAlex",
    ago(60 * 2), { isRead: true }, [{ name: "Daniel Ross", email: "daniel@northwindstudio.com" }]),
  d("sent-hike", "sent", "personal", "Alex Carter", "alex@popmail.app",
    "Re: Weekend hiking plan",
    "Coffee duty accepted. I'll bring the speaker too — my playlist has been personally victimized by this group for years. See you at 7:15.\n\n— Alex",
    ago(60 * 26), { isRead: true }, [{ name: "Priya Nair", email: "priya.nair@outlook.com" }]),
  d("sent-launch", "sent", "personal", "Alex Carter", "alex@popmail.app",
    "PopMail launch checklist",
    "Team,\n\nFinal checklist for Thursday:\n\n1. Freeze the build Wednesday at noon\n2. Publish release notes + changelog\n3. Schedule launch post (9am ET)\n4. Support rotation: Maya → me\n\nLet's make it boring. In the best way.\n\nAlex",
    ago(60 * 22), { isRead: true }, [{ name: "Maya Chen", email: "maya@northwindstudio.com" }]),

  // ---------------- Done / archived ----------------
  d("arch-amazon", "archive", "notifications", "Amazon", "auto-confirm@amazon.com",
    "Your order has shipped",
    "Good news! Your package (order #114-2788391-5525042) is on the way.\n\nEstimated delivery: Thursday by 9pm.\nItems: USB-C hub, desk mat.\n\nTrack your package in Your Orders.",
    ago(60 * 5), { isRead: true }),
  d("arch-netflix", "archive", "newsletters", "Netflix", "info@mailer.netflix.com",
    "New season alert: shows picked for you",
    "Because you watched our top dramas, here is what's new: Season 2 of “Harbor Lights”, plus a documentary series everyone is talking about.\n\nYou're receiving recommendations because you're subscribed. Unsubscribe below.",
    ago(60 * 55), { isRead: true }),
];

// Delivered one-by-one whenever the user hits "Check for new mail"
const INCOMING: DemoSpec[] = [
  d("in-olivia", "inbox", "personal", "Olivia Chen", "olivia.chen@gmail.com",
    "Quick question about the deck",
    "Hey Alex! Loved the PopMail pitch you sent over. One question before I share it with partners: on slide 8, is the spam filter running fully on-device? If so that's a huge privacy story. Ping me when you can!"),
  d("in-github-pr", "inbox", "notifications", "GitHub", "notifications@github.com",
    "[popmail] New pull request: feat/smart-replies",
    "Maya opened pull request #87: feat/smart-replies\n\nAdds on-device smart replies to the reading pane.\n2 files changed, 148 additions.\n\nYou are receiving this because you are subscribed to this thread."),
  d("in-ph-feature", "inbox", "notifications", "Product Hunt", "hello@producthunt.com",
    "PopMail just got featured!",
    "Congratulations! PopMail was selected for today's featured section. Expect a wave of traffic and reviews in the next 12 hours. Reply with your launch assets if you'd like them in the roundup."),
  d("in-spam-iphone", "spam", "personal", "Reward Zone", "free.gift4820@exclusive-rewards.xyz",
    "FREE iPhone 17 Pro - claim NOW!!!",
    "You've been chosen to receive a FREE iPhone 17 Pro!!! This is a limited time offer and 100% free. Click here now and pay only shipping! Congratulations, act now before this exclusive reward expires!!!",
    undefined, { isSpam: true, spamScore: 98, spamReason: "spam keywords · ALL CAPS · suspicious domain" }),
  d("in-maya-docs", "inbox", "personal", "Maya Chen", "maya@northwindstudio.com",
    "Spec feedback + one blocker",
    "Shipped the new empty states. One blocker: the snooze dropdown needs copy review — \"Later\" vs \"Tomorrow morning\" is confusing. Can you take a look before Thursday? Everything else in the spec got a green check.",
    ago(2)),
];

export function demoReplyFor(toEmail: string): { from: string; name: string; subject: string; body: string } | null {
  const map: Record<string, { name: string; body: string }> = {
    "sarah.kim@gmail.com": {
      name: "Sarah Kim",
      body: "Perfect!! Ramen at 7 it is. I booked the table — it's called Menya Noodle Bar, downtown. Don't be late this time 😉".replace(" 😉", ""),
    },
    "daniel@northwindstudio.com": {
      name: "Daniel Ross",
      body: "This is exactly what I wanted to see. $48k approved — send the final deck and we're golden for Thursday. Great work.",
    },
    "maya@northwindstudio.com": {
      name: "Maya Chen",
      body: "Love it. I'll take the support rotation Thursday morning then. Also — the new reading pane shipped to staging, take a look when you have 5 minutes!",
    },
    "priya.nair@outlook.com": {
      name: "Priya Nair",
      body: "HA! Your playlist stays home. See you at the trailhead — 7:15 sharp means 7:15!",
    },
    "linda.carter@gmail.com": {
      name: "Mom",
      body: "That's wonderful sweetheart! Don't forget to print the one of you two by the lake for the fridge. Love you!",
    },
  };
  const hit = map[toEmail.toLowerCase()];
  if (!hit) return null;
  return { from: toEmail, name: hit.name, subject: "", body: hit.body };
}

function d(
  messageId: string,
  folder: DemoSpec["folder"],
  category: DemoSpec["category"],
  fromName: string,
  fromEmail: string,
  subject: string,
  bodyText: string,
  date?: string,
  extra?: Partial<DemoSpec>,
  to: { name: string; email: string }[] = [you]
): DemoSpec {
  return {
    messageId: `<${messageId}@popmail.demo>`,
    folder,
    category,
    fromName,
    fromEmail,
    to: folder === "sent" ? to : [you],
    cc: [],
    subject,
    bodyText,
    bodyHtml: null,
    date: date ?? new Date().toISOString(),
    isRead: extra?.isRead ?? false,
    isSpam: extra?.isSpam ?? false,
    spamScore: extra?.spamScore ?? 0,
    spamReason: extra?.spamReason ?? "",
    hasAttachments: extra?.hasAttachments ?? false,
    snoozedUntil: extra?.snoozedUntil ?? null,
  };
}

export async function seedDemo(): Promise<void> {
  const accountId = await createAccount({
    name: "Alex Carter",
    email: you.email,
    provider: "demo",
    color: "#2f7cf6",
  });
  for (const e of SEED) {
    await insertEmail({ ...e, accountId });
  }
  await setSetting(`demo_queue_${accountId}`, "0");
}

/** Deliver the next queued demo message ("new mail"). */
export async function deliverNextDemoEmail(accountId: number): Promise<boolean> {
  const key = `demo_queue_${accountId}`;
  const idx = Number((await getSetting(key)) ?? "0");
  const pendingRaw = await getSetting(`replies_${accountId}`);
  const pending: DemoSpec[] = pendingRaw ? JSON.parse(pendingRaw) : [];

  if (pending.length > 0) {
    const [next, ...rest] = pending;
    await insertEmail({ ...next, accountId, date: new Date().toISOString() });
    await setSetting(`replies_${accountId}`, JSON.stringify(rest));
    return true;
  }
  if (idx >= INCOMING.length) return false;
  const spec = INCOMING[idx];
  // Run live through the spam filter so auto-filtering is genuinely working
  if (!spec.isSpam) {
    const verdict = await scoreEmail({
      fromEmail: spec.fromEmail,
      subject: spec.subject,
      bodyText: spec.bodyText,
    });
    if (verdict.isSpam) {
      spec.isSpam = true;
      spec.folder = "spam";
      spec.spamScore = verdict.score;
      spec.spamReason = verdict.reasons.join(" · ");
    }
  }
  await insertEmail({ ...spec, accountId, date: new Date().toISOString() });
  await setSetting(key, String(idx + 1));
  return true;
}

/** Queue an automatic reply from a demo contact after the user sends mail. */
export async function queueDemoReply(accountId: number, toEmail: string, subject: string): Promise<void> {
  const reply = demoReplyFor(toEmail);
  if (!reply) return;
  const key = `replies_${accountId}`;
  const raw = await getSetting(key);
  const pending: DemoSpec[] = raw ? JSON.parse(raw) : [];
  pending.push(
    d(`reply-${Date.now()}`, "inbox", "personal", reply.name, reply.from,
      subject.startsWith("Re:") ? subject : `Re: ${subject}`, reply.body)
  );
  await setSetting(key, JSON.stringify(pending));
}
