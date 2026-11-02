# PopMail

A fast, lightweight, Spark-style mail app — **unified Smart Inbox**, **AI summaries & smart replies**, a **self-learning spam filter**, snooze / pin / done, keyboard shortcuts, and a dark mode.

It runs two ways:

1. **As a Windows `.exe`** (recommended) — built for you **for free by GitHub's servers**. You don't need to install *anything* except the finished app. Follow the tutorial below.
2. **As a web app** — `npm install && npm run dev` if you know Node.js (not required, skip this if unsure).

---

# The Super-Easy “Turn It Into An .exe” Tutorial

**Time needed: ~15 minutes (most of it is just waiting). Coding knowledge needed: zero.**
You will: make a GitHub account → put this code on GitHub → click one button → download your `PopMail-Setup.exe`.

> Why does this work? GitHub has a free feature called **Actions** — a computer in the cloud that builds real software. This project already contains the exact build recipe (`.github/workflows/build-windows.yml`), so GitHub builds the `.exe` for you and gives it back as a download.

## Part 1 — Get a GitHub account (2 minutes)

1. Go to **https://github.com** and click **Sign up**.
2. Make an account (it's free) and verify your email.
3. Done. That was the hard part.

## Part 2 — Put this project on GitHub (3 minutes)

**The no-tools way (recommended for beginners):**

1. Click the **+** icon in GitHub's top-right corner → **New repository**.
2. Name it exactly: **`PopMail`**
3. Make sure it says **Public** (private also works).
4. **Uncheck** "Add a README file" (we already have one).
5. Click **Create repository**.
6. On the empty page that appears, find the blue text link that says **“uploading an existing file”** and click it.
7. **Drag and drop ALL the files and folders of this project** into that page (select everything, including the hidden `.github` folder and `.gitignore` — on Windows press `Ctrl+A` in the project folder; on Mac `Cmd+A`).
   - ⚠️ **Important:** the `.github` folder (it contains the build recipe) MUST be uploaded or no `.exe` will be made. If you don't see it, turn on "show hidden files" in your file explorer.
   - You can skip `node_modules` / `.next` if they exist — those are build junk.
8. Wait for the upload bar to finish, scroll down, and click the green **Commit changes** button.

**Alternative (if you prefer) — GitHub Desktop app:**
Install **GitHub Desktop** → `File → Add local repository` → choose this folder → publish. Same result.

## Part 3 — Build the .exe (10 minutes of waiting: you click 3 things)

1. In your new PopMail repository, click the **Actions** tab (top menu bar, looks like a play button ▶).
2. GitHub may show a notice: *"Workflows aren't being run on this repository"* → click the big green **“I understand my workflows, go ahead and enable them”** button.
3. On the left sidebar, click **“Build PopMail .exe”**.
4. On the right you'll see **“This workflow has a workflow_dispatch event trigger”** with a **“Run workflow”** button → click **Run workflow**, then click the green **Run workflow** in the little popup.
5. A new row appears in the list with a yellow spinning dot — the build is running. Click it to watch progress if you're curious (totally optional).
6. Wait **5–10 minutes**. The dot turns into a green checkmark ✅ when your `.exe` is ready.

## Part 4 — Download and install PopMail (1 minute)

1. Open the green-checkmarked build run (click it).
2. Scroll to the bottom of that page to the **“Artifacts”** section.
3. Download **`PopMail-Windows-Installer`** (it saves as a `.zip`).
4. Double-click the zip → you'll see **`PopMail-Setup-1.0.0.exe`** → drag it out (or extract).
5. **Double-click `PopMail-Setup-1.0.0.exe`.**
6. **Windows might show a blue “Windows protected your PC” popup.** This is normal for brand-new indie apps (the expensive Microsoft certificate is the only thing that removes it). Click **“More info”** → **“Run anyway”**. Your app is safe — you built it yourself from this exact code.
7. PopMail installs itself and opens. A **PopMail** shortcut appears on your desktop — you're done!

> **Where is my mail stored?** Everything stays on **your computer**, in `%APPDATA%\PopMail`. No accounts, passwords, or emails ever leave your PC (they only travel between PopMail and your own email provider, exactly like Outlook does).

## Part 5 — Set up your accounts

- PopMail opens with a **Demo account** preloaded so you can explore instantly (press **Sync** — new demo mail arrives, and spam gets caught live).
- Click **Add account** in the left sidebar to connect real mail:
  - **Gmail:** Google requires an *app password* (not your normal one). It's 2 minutes: go to https://myaccount.google.com/apppasswords (2-Step Verification must be on) → create a password named "PopMail" → paste the 16-letter code into PopMail. [Google's official guide](https://support.google.com/accounts/answer/185833)
  - **Outlook:** your normal Microsoft password.
  - **Yahoo:** make an app password at https://login.yahoo.com/account/security → "Generate app password".
  - **iCloud:** make an app-specific password at https://appleid.apple.com → Sign-In and Security → App-Specific Passwords.
  - **Custom IMAP:** enter the IMAP/SMTP host + port from your provider's help page.

## Update or rebuild anytime

Made a tweak? Just push new code (re-upload changed files) — the build runs automatically on every push. Or go to **Actions → Build PopMail .exe → Run workflow** to rebuild. Download the new artifact, install over the old one. Your data stays.

---

# Useful things to know

- **Accounts & credentials** are stored locally only (SQLite file in `%APPDATA%\PopMail`) and are used solely to talk to your mail servers via encrypted IMAP/SMTP.
- **Spam filter:** it's on-device and learns. Mark a message as spam (or rescue one with “Not spam”) and it immediately adjusts its scoring.
- **AI:** summaries & smart replies work **on-device out of the box** (nothing leaves your PC). Want full GPT-grade summaries? Set an `OPENAI_API_KEY` environment variable on your PC and PopMail automatically upgrades (a “GPT” badge appears in the summary card).
- **Keyboard:** `C` compose · `↑/↓` or `j/k` move · `Enter` open · `E` mark done · `Delete` trash · `Cmd/Ctrl+Enter` send · `Esc` close.
- **Troubleshooting the build:** if the Action shows a red ❌, click the run → click the failed step → the logs say exactly what broke. 95% of issues are: (a) forgot to upload the `.github` folder, (b) uploaded into a subfolder so `package.json` isn't at the top level, or (c) a temporary GitHub hiccup — just press **Re-run jobs**.

---

# For developers (optional reading)

```bash
npm install        # install deps
npm run dev        # web app at http://localhost:3000
npm run build      # production build (also emits .next/standalone for desktop)
npx drizzle-kit push   # create/update Postgres tables (web mode)
```

- **Stack:** Next.js 16 (App Router) · Drizzle ORM · PostgreSQL (web) / embedded `node:sqlite` (desktop, zero-install) · imapflow (IMAP) · nodemailer (SMTP) · Tailwind CSS v4 · Electron + electron-builder.
- The desktop app forks the standalone Next server with `POPMAIL_DESKTOP=1`, which switches storage to a local SQLite file — the same codebase serves web and `.exe`.
