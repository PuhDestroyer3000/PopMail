/**
 * Assembles desktop/app — the self-contained PopMail server that ships
 * inside the .exe:
 *   .next/standalone  -> desktop/app            (server + minimal node_modules)
 *   .next/static      -> desktop/app/.next/static
 *   public            -> desktop/app/public
 */
import fs from "node:fs";

const STANDALONE = ".next/standalone";
const OUT = "desktop/app";

if (!fs.existsSync(`${STANDALONE}/server.js`)) {
  console.error("standalone build not found — run `next build` first");
  process.exit(1);
}

fs.rmSync("desktop", { recursive: true, force: true });
fs.cpSync(STANDALONE, OUT, { recursive: true });

fs.mkdirSync(`${OUT}/.next`, { recursive: true });
fs.cpSync(".next/static", `${OUT}/.next/static`, { recursive: true });

if (fs.existsSync("public")) {
  fs.cpSync("public", `${OUT}/public`, { recursive: true });
}

console.log("desktop/app prepared");
