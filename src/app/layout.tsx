import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PopMail — Fast, clean email for everyone",
  description:
    "PopMail is a lightweight mail client with a Smart Inbox, AI summaries, smart replies and a self-learning spam filter. Runs on the web or as a Windows .exe.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('popmail-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
      </head>
      <body className="bg-(--bg) text-(--ink)">{children}</body>
    </html>
  );
}
