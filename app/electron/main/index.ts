import { app, BrowserWindow } from "electron";
import path from "node:path";
import { createMainWindow } from "./MainRunner";

// Fix WebGL context issues on Linux and some hardware
if (process.platform === "linux") {
  app.commandLine.appendSwitch("disable-gpu-sandbox");
}
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ └─┬ preload
// │   └── index.js
// ├─┬ .output
// │ └─┬ public
// │   └── index.html

// Set APP_ROOT for use in other modules
// This path works when running from dist-electron/main/index.js
process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, ".output/public");

process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.whenReady().then(async () => {
  await createMainWindow();
});