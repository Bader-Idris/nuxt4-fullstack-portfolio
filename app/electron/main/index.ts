/**
 * CRITICAL: This file MUST NOT use top-level 'import' statements for 'electron'
 * to avoid bundler hoisting that would initialize Electron before our sandbox fix.
 */

// @ts-ignore
if (process.platform === "linux") {
  // --- CRITICAL LINUX SANDBOX FIX ---
  // We use require to ensure this runs BEFORE any imports are hoisted/initialized.
  const { app: electronApp } = require("electron");
  electronApp.commandLine.appendSwitch("no-sandbox");
  electronApp.commandLine.appendSwitch("disable-setuid-sandbox");
  electronApp.commandLine.appendSwitch("disable-gpu-sandbox");
  electronApp.commandLine.appendSwitch("disable-dev-shm-usage");
  
  // Set environment variable as an extra layer of defense
  process.env.ELECTRON_DISABLE_SANDBOX = "1";
}

// Use require for everything to prevent hoisting issues
const { app, BrowserWindow } = require("electron");
const path = require("node:path");

// Function to start the app logic
async function startApp() {
  // We use dynamic import for our runner to keep index.ts clean and hoisting-free
  const { createMainWindow } = await import("./MainRunner");
  
  app.commandLine.appendSwitch("ignore-gpu-blocklist");
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("enable-zero-copy");

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

  await createMainWindow();
}


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


// Initial environment setup for use in other modules
process.env.APP_ROOT = path.join(__dirname, "../..");
const RENDERER_DIST = path.join(process.env.APP_ROOT, ".output/public");

process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Bootstrap
app.whenReady().then(startApp);
