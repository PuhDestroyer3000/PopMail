export interface AccountRow {
  id: number;
  name: string;
  email: string;
  provider: string;
  color: string;
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapPass: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  createdAt: string;
}

export type Folder = "inbox" | "sent" | "archive" | "spam" | "trash" | "drafts";
export type Category = "personal" | "notifications" | "newsletters";

export interface EmailRow {
  id: number;
  accountId: number;
  messageId: string;
  folder: Folder;
  category: Category;
  fromName: string;
  fromEmail: string;
  to: { name: string; email: string }[];
  cc: { name: string; email: string }[];
  subject: string;
  snippet: string;
  bodyText: string;
  bodyHtml: string | null;
  date: string; // ISO
  isRead: boolean;
  isPinned: boolean;
  isDone: boolean;
  isStarred: boolean;
  isSpam: boolean;
  spamScore: number;
  spamReason: string;
  snoozedUntil: string | null;
  hasAttachments: boolean;
}

export interface AccountWithCounts extends AccountRow {
  isDemo: boolean;
  unread: number;
}

export interface Stats {
  totalUnread: number;
  byFolder: Record<string, number>;
  byAccount: Record<number, number>;
  spamCaught: number;
}

export interface NewEmail {
  accountId: number;
  messageId: string;
  folder: Folder;
  category: Category;
  fromName: string;
  fromEmail: string;
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  date: string; // ISO
  isRead?: boolean;
  isSpam?: boolean;
  spamScore?: number;
  spamReason?: string;
  hasAttachments?: boolean;
  snoozedUntil?: string | null;
}
