import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { URL } from "node:url";
import fs from "node:fs";

// Fix WebGL context issues on Linux and some hardware
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

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

    // Dynamically build the list of app assets from the public directory
    const appAssetPatterns = ['_nuxt/', 'builds/', '__nuxt_content/', 'favicon'];
    try {
      const publicDir = process.env.VITE_PUBLIC;
      if (publicDir && fs.existsSync(publicDir)) {
        const items = fs.readdirSync(publicDir);
        items.forEach(item => {
          try {
            const isDir = fs.statSync(path.join(publicDir, item)).isDirectory();
            appAssetPatterns.push(isDir ? `${item}/` : item);
          } catch (e) { /* ignore */ }
        });
      }
    } catch (e) {
      console.error("[Electron Main] Failed to read public assets:", e);
    }
    const isAppAssetList = [...new Set(appAssetPatterns.map(p => p.toLowerCase()))];

    // Set up file protocol interceptor for app assets
    // This intercepts requests for /imgs/, /_nuxt/, etc. and serves them from unpacked directory or ASAR
    session.defaultSession.protocol.interceptFileProtocol('file', (request, callback) => {
      const parsedUrl = new URL(request.url);
      let pathname = decodeURIComponent(parsedUrl.pathname);

      console.log(`[Electron Protocol] Raw pathname: ${pathname}`);

      // On Windows, URL.pathname comes as /C:/path/to/file
      // We need to handle this carefully for cross-platform builds
      if (process.platform === 'win32') {
        // Check if this is a Windows path with drive letter
        if (/^\/[A-Z]:\//i.test(pathname)) {
          pathname = pathname.substring(1); // Remove leading slash: /C:/... -> C:/...
          console.log(`[Electron Protocol] Windows path detected: ${pathname}`);
        }
      }

      // Check if this is an app asset (imgs, _nuxt, fonts, sounds, etc.)
      // Normalize for comparison by converting backslashes and lowercase
      const normalizedPath = pathname.replace(/\\/g, '/').toLowerCase();
      
      const isAppAsset = isAppAssetList.some(pattern => {
        // Handle both absolute paths (/imgs/) and Windows paths (C:/imgs/)
        const cleanNormalized = normalizedPath.replace(/^[a-z]:\//, '');
        return cleanNormalized.startsWith(pattern) || normalizedPath.startsWith('/' + pattern);
      });

      if (isAppAsset) {
        // Strip drive letter and leading slashes for path joining
        // C:/imgs/... -> imgs/...
        // /imgs/... -> imgs/...
        let cleanPath = pathname.replace(/^[\/\\]+/, '');
        
        // Remove Windows drive letter if present
        if (/^[A-Z]:\//i.test(cleanPath)) {
          cleanPath = cleanPath.substring(3);
        }

        // Try unpacked location first (for images, fonts, sounds)
        const unpackedPath = path.join(unpackedBase, '.output', 'public', cleanPath);
        console.log(`[Electron Protocol] Trying unpacked: ${unpackedPath}`);

        fs.stat(unpackedPath, (err, stats) => {
          if (!err && stats.isFile()) {
            console.log(`[Electron Protocol] Serving unpacked: ${unpackedPath}`);
            callback({ path: unpackedPath });
          } else {
            // Try without 'public' subdirectory
            const altPath = path.join(unpackedBase, '.output', cleanPath);
            console.log(`[Electron Protocol] Trying alternative: ${altPath}`);

            fs.stat(altPath, (altErr, altStats) => {
              if (!altErr && altStats.isFile()) {
                console.log(`[Electron Protocol] Serving alternative: ${altPath}`);
                callback({ path: altPath });
              } else {
                // Fallback to ASAR (for JS, CSS)
                const asarPath = path.join(resourcesBase, 'app.asar', '.output', 'public', cleanPath);
                console.log(`[Electron Protocol] Trying ASAR: ${asarPath}`);

                fs.stat(asarPath, (asarErr, asarStats) => {
                  if (asarErr) {
                    console.error(`[Electron Protocol] File not found: ${cleanPath}`);
                    callback({ statusCode: 404 });
                  } else {
                    console.log(`[Electron Protocol] Serving ASAR: ${asarPath}`);
                    callback({ path: asarPath });
                  }
                });
              }
            });
          }
        });
      } else {
        // Non-app assets - pass through with platform-appropriate path format
        if (process.platform === 'win32') {
          const winPath = pathname.replace(/^[\/\\]+/, '').replace(/\//g, '\\');
          callback({ path: winPath });
        } else {
          callback({ path: pathname });
        }
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
