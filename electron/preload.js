// PopMail preload — keeps the window isolated; exposes only the app version.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("popmail", {
  version: process.versions.electron || "dev",
});
