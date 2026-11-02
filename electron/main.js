/**
 * PopMail — Electron entry point.
 * Boots the bundled Next.js standalone server as a child process
 * (Electron runs it as Node), waits until it's healthy, then opens
 * a native window. All mail data lives in %APPDATA%/PopMail.
 */
const { app, BrowserWindow, shell } = require("electron");
const { fork } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

let server = null;
let mainWindow = null;
const isDev = !app.isPackaged;

function findFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(url, tries = 120) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then((r) => (r.ok ? resolve() : retry()))
        .catch(retry);
    };
    const retry = () => {
      if (--tries <= 0) reject(new Error("PopMail server did not start in time"));
      else setTimeout(attempt, 250);
    };
    attempt();
  });
}

async function startServer(port) {
  const serverDir = isDev
    ? path.join(__dirname, "..", ".next", "standalone")
    : path.join(process.resourcesPath, "app-server");
  const serverJs = path.join(serverDir, "server.js");

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: String(port),
    POPMAIL_DESKTOP: "1",
    POPMAIL_DATA_DIR: app.getPath("userData"),
    DATABASE_URL: "",
  };
  delete env.DATABASE_URL;

  // node:sqlite needs this flag on the Node versions bundled with Electron
  server = fork(serverJs, [], {
    env,
    cwd: serverDir,
    silent: true,
    execArgv: ["--experimental-sqlite"],
  });
  server.stdout.on("data", (d) => process.stdout.write(`[popmail] ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`[popmail] ${d}`));
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1020,
    minHeight: 640,
    title: "PopMail",
    autoHideMenuBar: true,
    backgroundColor: "#eef1f6",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Open external links (unsubscribe, help pages) in the real browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    const port = await findFreePort();
    await startServer(port);
    await waitForServer(`http://127.0.0.1:${port}/api/health`);
    await createWindow(port);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow(port);
    });
  });

  app.on("window-all-closed", () => app.quit());
  app.on("will-quit", () => {
    if (server) server.kill();
  });
}
