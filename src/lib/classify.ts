import type { Category } from "./types";

/**
 * Smart Inbox triage, Spark-style: splits incoming mail into
 * Personal / Notifications / Newsletters.
 */
export function categorize(input: {
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  headers?: Record<string, string>;
}): Category {
  const from = input.fromEmail.toLowerCase();
  const name = input.fromName.toLowerCase();
  const subj = input.subject.toLowerCase();
  const local = from.split("@")[0] ?? "";
  const h = input.headers ?? {};

  // Newsletters / marketing
  if (
    h["list-unsubscribe"] ||
    h["list-id"] ||
    /unsubscribe/i.test(input.bodyText.slice(0, 1200)) ||
    /(newsletter|digest|weekly|roundup|this week in|issue #|edition)/.test(subj) ||
    /(newsletter|news|digest|updates|offers|promo|marketing|mail|mailer|bulletin)/.test(local) ||
    /(substack|beehiiv|mailchimp|sendgrid|klaviyo|constantcontact)/.test(from)
  ) {
    return "newsletters";
  }

  // Automated notifications
  if (
    /^(no-?reply|donotreply|notifications?|alerts?|bot|automated|system|support|billing|receipts?|orders?|invites|calendar-noreply|messages)@/.test(local) ||
    /(github|gitlab|notion|figma|vercel|stripe|paypal|amaz|google|microsoft|apple|facebook|linkedin|twitter|x\.com|slack|discord|jira|atlassian|dropbox|spotify|netflix|uber|airbnb|coinbase|bank)/.test(from) ||
    /(notification|alert|verify|verification|security|sign-?in|login|password|receipt|invoice|order|shipping|delivery|statement|payment|reminder|invitation|mentioned you|assigned you|build (succeeded|failed)|commented on)/.test(subj) ||
    /(notification|automated|do not reply)/.test(name)
  ) {
    return "notifications";
  }

  return "personal";
}
