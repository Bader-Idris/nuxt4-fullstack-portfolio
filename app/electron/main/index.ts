import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { URL } from "node:url";
import fs from "node:fs";

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ ├─┬ preload
// │ │ └── index.js
// │ ├─┬ renderer
// │ │ └── index.html
// process.env.APP_ROOT = path.join(import.meta.dirname, '..')
process.env.APP_ROOT = path.join(__dirname, '../..') // check out prod version, especially the ugly default nuxt config

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, '.output/public')

process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(MAIN_DIST, 'preload.js'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`http://localhost:${process.env.PORT}`);
    // win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
    console.log("[Electron Main] VITE_DEV_SERVER_URL:", process.env.VITE_DEV_SERVER_URL);
  } else {
    console.log("[Electron Main] Loading file:", path.join(process.env.VITE_PUBLIC!, "index.html"));
    console.log("[Electron Main] Resources path:", process.resourcesPath);
    console.log("[Electron Main] App path:", app.getAppPath());

    // Determine the base directory for unpacked assets
    // In production: unpacked files are in resources/app.asar.unpacked/
    const resourcesBase = process.resourcesPath || path.join(path.dirname(app.getAppPath()), 'resources');
    const unpackedBase = path.join(resourcesBase, 'app.asar.unpacked');
    
    console.log("[Electron Main] Resources base:", resourcesBase);
    console.log("[Electron Main] Unpacked base:", unpackedBase);

    // Set up file protocol interceptor for app assets
    // This intercepts requests for /imgs/, /_nuxt/, etc. and serves them from unpacked directory or ASAR
    session.defaultSession.protocol.interceptFileProtocol('file', (request, callback) => {
      const parsedUrl = new URL(request.url);
      let pathname = decodeURIComponent(parsedUrl.pathname);

      // Handle Windows paths (e.g., /C:/path -> C:/path)
      const isWindowsPath = /^\/[A-Z]:\//i.test(pathname);
      if (isWindowsPath) {
        pathname = pathname.substring(1);
      }

      // Check if this is an app asset that should be served from app resources
      const appAssetPrefixes = ['/imgs/', '/_nuxt/', '/fonts/', '/sounds/', '/favicon', '/builds/', '/__nuxt_content/'];
      const isAppAsset = appAssetPrefixes.some(prefix => pathname.startsWith(prefix));

      if (isAppAsset) {
        // First try unpacked location (for images, fonts, sounds)
        const unpackedPath = path.join(unpackedBase, '.output/public', pathname);
        
        console.log(`[Electron Protocol] Trying unpacked: ${unpackedPath}`);

        fs.stat(unpackedPath, (err, stats) => {
          if (!err && stats.isFile()) {
            console.log(`[Electron Protocol] Serving unpacked: ${unpackedPath}`);
            callback({ path: unpackedPath });
          } else {
            // Fallback to ASAR archive (for JS, CSS, etc.)
            const asarPath = path.join(resourcesBase, 'app.asar', '.output/public', pathname);
            console.log(`[Electron Protocol] Trying ASAR: ${asarPath}`);
            
            fs.stat(asarPath, (err2, stats2) => {
              if (err2) {
                console.error(`[Electron Protocol] File not found: ${pathname}`);
                callback({ statusCode: 404 });
              } else {
                console.log(`[Electron Protocol] Serving ASAR: ${asarPath}`);
                callback({ path: asarPath });
              }
            });
          }
        });
      } else {
        // Default handling for other paths
        callback({ path: decodeURIComponent(parsedUrl.pathname) });
      }
    });

    win.loadFile(path.join(process.env.VITE_PUBLIC!, 'index.html'));
  }
}

function initIpc() {
  ipcMain.handle('app-start-time', () => (new Date).toLocaleString())
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  initIpc()
  createWindow()
})
