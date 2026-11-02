import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  provider: text("provider").notNull().default("custom"),
  color: text("color").notNull().default("#2f7cf6"),
  // null host => demo / offline account (no real server connection)
  imapHost: text("imap_host"),
  imapPort: integer("imap_port"),
  imapUser: text("imap_user"),
  imapPass: text("imap_pass"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const emails = pgTable(
  "emails",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    messageId: text("message_id").notNull(),
    folder: text("folder").notNull().default("inbox"), // inbox | sent | archive | spam | trash | drafts
    category: text("category").notNull().default("personal"), // personal | notifications | newsletters
    fromName: text("from_name").notNull().default(""),
    fromEmail: text("from_email").notNull().default(""),
    toJson: text("to_json").notNull().default("[]"),
    ccJson: text("cc_json").notNull().default("[]"),
    subject: text("subject").notNull().default("(no subject)"),
    snippet: text("snippet").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    bodyHtml: text("body_html"),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    isRead: boolean("is_read").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    isDone: boolean("is_done").notNull().default(false),
    isStarred: boolean("is_starred").notNull().default(false),
    isSpam: boolean("is_spam").notNull().default(false),
    spamScore: integer("spam_score").notNull().default(0),
    spamReason: text("spam_reason").notNull().default(""),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    hasAttachments: boolean("has_attachments").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("emails_account_message_unique").on(t.accountId, t.messageId),
    index("emails_account_folder_date_idx").on(t.accountId, t.folder, t.date),
  ]
);

// Self-learning spam filter memory (Naive-Bayes token counts)
export const spamTokens = pgTable("spam_tokens", {
  token: text("token").primaryKey(),
  spam: integer("spam").notNull().default(0),
  ham: integer("ham").notNull().default(0),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});
