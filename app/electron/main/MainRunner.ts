import {
  app,
  BrowserWindow,
  type RenderProcessGoneDetails,
  Menu,
  Tray,
  session,
} from "electron";
import path from "node:path";
import { URL } from "node:url";
import fs from "node:fs";
import Constants, { MAIN_DIST } from "./utils/Constants";
import { initializeIPCs } from "./IPCs";
import menuTemplate from "./utils/menu-template";

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const exitApp = (mw: BrowserWindow): void => {
  isQuitting = true;
  if (mw && !mw.isDestroyed()) {
    mw.hide();
  }
  if (mw && !mw.isDestroyed()) {
    mw.destroy();
  }
  app.exit();
};

const createMainWindow = async (): Promise<BrowserWindow> => {
  mainWindow = new BrowserWindow({
    title: Constants.APP_NAME,
    show: false,
    width: 1200,
    height: 800,
    useContentSize: true,
    webPreferences: {
      ...Constants.DEFAULT_WEB_PREFERENCES,
      preload: path.join(MAIN_DIST, "preload", "index.js"),
      webviewTag: false,
    },
  });

  mainWindow.setMenu(null); // Disable default menu

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Define user tasks for the taskbar context menu
  if (process.platform === "win32") {
    const userTasks: Electron.Task[] = [
      {
        program: process.execPath,
        arguments: "",
        title: "New Window",
        description: "Open a new window",
        iconPath: process.execPath,
        iconIndex: 0,
      },
    ];

    try {
      app.setUserTasks(userTasks);
    } catch (error) {
      console.error("Error setting user tasks:", error);
    }
  }

  mainWindow.on("close", (event: any): void => {
    if (tray && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Open devTools in dev mode
  mainWindow.webContents.on("did-frame-finish-load", (): void => {
    if (Constants.IS_DEV_ENV) {
      mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.once("ready-to-show", (): void => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Initialize IPC Communication
  initializeIPCs();

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(`http://localhost:${process.env.PORT}`);
  } else {
    console.log("[Electron Main] Loading file:", Constants.APP_INDEX_URL_PROD);
    console.log("[Electron Main] Resources path:", process.resourcesPath);
    console.log("[Electron Main] App path:", app.getAppPath());

    // Determine the base directory for unpacked assets
    const resourcesBase =
      process.resourcesPath ||
      path.join(path.dirname(app.getAppPath()), "resources");
    const unpackedBase = path.join(resourcesBase, "app.asar.unpacked");

    console.log("[Electron Main] Resources base:", resourcesBase);
    console.log("[Electron Main] Unpacked base:", unpackedBase);

    // Dynamically build the list of app assets from the public directory
    const appAssetPatterns = [
      "_nuxt/",
      "builds/",
      "__nuxt_content/",
      "favicon",
    ];
    try {
      const publicDir = process.env.VITE_PUBLIC;
      if (publicDir && fs.existsSync(publicDir)) {
        const items = fs.readdirSync(publicDir);
        items.forEach((item) => {
          try {
            if (publicDir) {
              const isDir = fs
                .statSync(path.join(publicDir, item))
                .isDirectory();
              appAssetPatterns.push(isDir ? `${item}/` : item);
            }
          } catch {
            /* ignore */
          }
        });
      }
    } catch (e) {
      console.error("[Electron Main] Failed to read public assets:", e);
    }
    const isAppAssetList = [
      ...new Set(appAssetPatterns.map((p) => p.toLowerCase())),
    ];

    // Set up file protocol interceptor
    session.defaultSession.protocol.interceptFileProtocol(
      "file",
      (request, callback) => {
        const parsedUrl = new URL(request.url);
        let pathname = decodeURIComponent(parsedUrl.pathname);

        console.log(`[Electron Protocol] Raw pathname: ${pathname}`);

        if (process.platform === "win32") {
          if (/^\/[A-Z]:\//i.test(pathname)) {
            pathname = pathname.substring(1);
            console.log(
              `[Electron Protocol] Windows path detected: ${pathname}`,
            );
          }
        }

        const normalizedPath = pathname.replace(/\\/g, "/").toLowerCase();
        const isAppAsset = isAppAssetList.some((pattern) => {
          const cleanNormalized = normalizedPath.replace(/^[a-z]:\//, "");
          return (
            cleanNormalized.startsWith(pattern) ||
            normalizedPath.startsWith("/" + pattern)
          );
        });

        if (isAppAsset) {
          let cleanPath = pathname.replace(/^[/\\]+/, "");
          if (/^[A-Z]:\//i.test(cleanPath)) {
            cleanPath = cleanPath.substring(3);
          }

          // Try unpacked location first
          const unpackedPath = path.join(
            unpackedBase,
            ".output",
            "public",
            cleanPath,
          );
          console.log(`[Electron Protocol] Trying unpacked: ${unpackedPath}`);

          fs.stat(unpackedPath, (err, stats) => {
            if (!err && stats.isFile()) {
              console.log(
                `[Electron Protocol] Serving unpacked: ${unpackedPath}`,
              );
              callback({ path: unpackedPath });
            } else {
              const altPath = path.join(unpackedBase, ".output", cleanPath);
              console.log(`[Electron Protocol] Trying alternative: ${altPath}`);

              fs.stat(altPath, (_altErr, altStats) => {
                if (!_altErr && altStats.isFile()) {
                  console.log(
                    `[Electron Protocol] Serving alternative: ${altPath}`,
                  );
                  callback({ path: altPath });
                } else {
                  // Fallback to ASAR
                  const asarPath = path.join(
                    resourcesBase,
                    "app.asar",
                    ".output",
                    "public",
                    cleanPath,
                  );
                  console.log(`[Electron Protocol] Trying ASAR: ${asarPath}`);

                  fs.stat(asarPath, (asarErr, _asarStats) => {
                    if (asarErr) {
                      console.error(
                        `[Electron Protocol] File not found: ${cleanPath}`,
                      );
                      callback({ statusCode: 404 });
                    } else {
                      console.log(
                        `[Electron Protocol] Serving ASAR: ${asarPath}`,
                      );
                      callback({ path: asarPath });
                    }
                  });
                }
              });
            }
          });
        } else {
          if (process.platform === "win32") {
            const winPath = pathname
              .replace(/^[/\\]+/, "")
              .replace(/\//g, "\\");
            callback({ path: winPath });
          } else {
            callback({ path: pathname });
          }
        }
      },
    );

    await mainWindow.loadFile(Constants.APP_INDEX_URL_PROD);
  }

  // Only create tray on supported OSes (excluding Linux as requested)
  if (process.platform !== "linux") {
    createTray();
  }

  return mainWindow;
};

const createErrorWindow = async (
  errorWindow: BrowserWindow | null,
  mw: BrowserWindow | null,
  _details?: RenderProcessGoneDetails,
): Promise<BrowserWindow> => {
  if (!Constants.IS_DEV_ENV) {
    mw?.hide();
  }

  errorWindow = new BrowserWindow({
    title: Constants.APP_NAME,
    show: false,
    resizable: Constants.IS_DEV_ENV,
    webPreferences: {
      ...Constants.DEFAULT_WEB_PREFERENCES,
      preload: path.join(MAIN_DIST, "preload", "index.js"),
    },
  });

  errorWindow.setMenu(null);

  if (process.env.VITE_DEV_SERVER_URL) {
    await errorWindow.loadURL(`${Constants.APP_INDEX_URL_DEV}#/error`);
  } else {
    await errorWindow.loadFile(Constants.APP_INDEX_URL_PROD, { hash: "error" });
  }

  errorWindow.on("ready-to-show", (): void => {
    if (!Constants.IS_DEV_ENV && mw && !mw.isDestroyed()) {
      mw.destroy();
    }
    errorWindow?.show();
    errorWindow?.focus();
  });

  errorWindow.webContents.on("did-frame-finish-load", (): void => {
    if (Constants.IS_DEV_ENV) {
      errorWindow?.webContents.openDevTools();
    }
  });

  return errorWindow;
};

const createTray = () => {
  const resourcesBase =
    process.resourcesPath ||
    path.join(path.dirname(app.getAppPath()), "resources");
  const unpackedBase = path.join(resourcesBase, "app.asar.unpacked");

  const iconPath = Constants.IS_DEV_ENV
    ? path.join(
        process.env.APP_ROOT!,
        "electronAssets",
        "resources",
        "icon.png",
      )
    : path.join(unpackedBase, "electronAssets", "resources", "icon.png");

  console.log("[Electron Tray] Icon path:", iconPath);

  if (!fs.existsSync(iconPath)) {
    console.warn("[Electron Tray] Icon not found at:", iconPath);
    // Try some fallbacks
    const possiblePaths = [
      path.join(app.getAppPath(), "electronAssets/resources/icon.png"),
      path.join(process.resourcesPath, "icon.png"),
    ];
    let found = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        tray = new Tray(p);
        found = true;
        break;
      }
    }
    if (!found) {
      console.error("[Electron Tray] No tray icon found");
      return;
    }
  } else {
    tray = new Tray(iconPath);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createMainWindow();
        }
      },
    },
    {
      label: "Maximize",
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
          } else {
            mainWindow.maximize();
          }
        }
      },
    },
    { type: "separator" },
    {
      label: "Exit",
      click: () => {
        isQuitting = true;
        if (mainWindow) {
          exitApp(mainWindow);
        } else {
          app.quit();
        }
      },
    },
  ]);

  if (tray) {
    tray.setToolTip(Constants.APP_NAME);
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    });
  }
};

export { createMainWindow, createErrorWindow, createTray };