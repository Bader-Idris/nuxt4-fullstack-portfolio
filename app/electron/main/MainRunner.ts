import { app, BrowserWindow, ipcMain, type RenderProcessGoneDetails, Menu, Tray, session } from 'electron'
import path from 'node:path'
import { URL } from 'node:url'
import fs from 'node:fs'
import Constants from './utils/Constants'
import IPCs from './IPCs'
import menuTemplate from './utils/menu-template'

const exitApp = (mainWindow: BrowserWindow): void => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
  }
  mainWindow.destroy()
  app.exit()
}

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null // Ensure mainWindow is accessible globally

const createMainWindow = async (): Promise<BrowserWindow> => {
  mainWindow = new BrowserWindow({
    title: Constants.APP_NAME,
    show: false,
    // width: Constants.IS_DEV_ENV ? 1500 : 1200, // Different window size based on environment
    // height: 650,
    width: 1200,
    height: 800,
    useContentSize: true,
    // titleBarStyle: 'hidden',
    // frame: false, // disable default title bar || frame
    webPreferences: {
      ...Constants.DEFAULT_WEB_PREFERENCES,
      webviewTag: false,
    }
  })

  mainWindow.setMenu(null) // Disable default menu

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // Define user tasks for the taskbar context menu
  if (process.platform === 'win32') {
    const userTasks: Electron.Task[] = [
      {
        program: process.execPath, // The path to the Electron executable
        arguments: '', // Arguments passed to the executable
        title: 'New Window', // Title of the task
        description: 'Open a new window', // Description of the task
        iconPath: '',
        iconIndex: 0
      }
      // }
      // {
      //   program: process.execPath,
      //   args: ['--recently-closed'],
      //   title: 'Recently Closed Windows',
      //   description: 'Reopen recently closed windows'
      // }
      // }
      // {
      //   program: process.execPath,
      //   args: ['--recently-closed'],
      //   title: 'Recently Closed Windows',
      //   description: 'Reopen recently closed windows'
      // }
    ]

    // Safely attempt to set user tasks
    try {
      app.setUserTasks(userTasks)
    } catch (error) {
      console.error('Error setting user tasks:', error)
    }
  }

  mainWindow.on('close', (event: Event): void => {
    event.preventDefault()
    exitApp(mainWindow!)
  })

  // Open devTools in dev mode
  mainWindow.webContents.on('did-frame-finish-load', (): void => {
    if (Constants.IS_DEV_ENV) {
      mainWindow!.webContents.openDevTools()
    }
  })

  mainWindow.once('ready-to-show', (): void => {
    // mainWindow.setAlwaysOnTop(true)
    mainWindow!.show()
    mainWindow!.focus()

    // Send the app name to the renderer process
    // mainWindow.webContents.send('app-info', { appName: Constants.APP_NAME })
  })

  // Initialize IPC Communication
  IPCs.initialize()

  if (Constants.IS_DEV_ENV) {
    await mainWindow.loadURL(Constants.APP_INDEX_URL_DEV)
  } else {
    const appRoot = process.env.VITE_PUBLIC!
    console.log("[Electron Main] Loading file:", Constants.APP_INDEX_URL_PROD)
    console.log("[Electron Main] App root:", appRoot)
    console.log("[Electron Main] Resources path:", process.resourcesPath)
    console.log("[Electron Main] App path:", app.getAppPath())
    console.log("[Electron Main] EXE path:", process.execPath)

    // Determine the base directory for app assets
    // In production:
    // - process.resourcesPath points to resources/ directory next to the executable
    // - Unpacked files are in resources/app.asar.unpacked/
    const resourcesBase = process.resourcesPath || path.join(path.dirname(app.getAppPath()), 'resources')
    const unpackedBase = path.join(resourcesBase, 'app.asar.unpacked')
    
    console.log("[Electron Main] Resources base:", resourcesBase)
    console.log("[Electron Main] Unpacked base:", unpackedBase)

    // Set up file protocol interceptor BEFORE loading the file
    // This intercepts requests for app assets and serves them from the unpacked directory
    session.defaultSession.protocol.interceptFileProtocol('file', (request, callback) => {
      const parsedUrl = new URL(request.url)
      let pathname = decodeURIComponent(parsedUrl.pathname)

      // Handle Windows paths (e.g., /C:/path -> C:/path)
      const isWindowsPath = /^\/[A-Z]:\//i.test(pathname)
      if (isWindowsPath) {
        pathname = pathname.substring(1)
      }

      // Check if this is an app asset that should be served from unpacked resources
      const appAssetPrefixes = ['/imgs/', '/_nuxt/', '/fonts/', '/sounds/', '/favicon', '/builds/', '/__nuxt_content/']
      const isAppAsset = appAssetPrefixes.some(prefix => pathname.startsWith(prefix))

      if (isAppAsset) {
        // Files are unpacked to: resources/app.asar.unpacked/.output/public/
        const filePath = path.join(unpackedBase, '.output/public', pathname)
        
        console.log(`[Electron Protocol] Trying: ${filePath}`)
        
        // Check if file exists
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error(`[Electron Protocol] File not found: ${filePath}`, err.message)
            callback({ statusCode: 404 })
          } else {
            console.log(`[Electron Protocol] Serving: ${filePath}`)
            callback({ path: filePath })
          }
        })
      } else {
        // Default handling for other paths
        callback({ path: decodeURIComponent(parsedUrl.pathname) })
      }
    })

    // Load the main HTML file
    await mainWindow.loadFile(Constants.APP_INDEX_URL_PROD)
  }

  createTray()
  return mainWindow
}

// Create error window when the renderer crashes
const createErrorWindow = async (
  errorWindow: BrowserWindow,
  mainWindow: BrowserWindow,
  details?: RenderProcessGoneDetails
): Promise<BrowserWindow> => {
  if (!Constants.IS_DEV_ENV) {
    mainWindow?.hide()
  }

  errorWindow = new BrowserWindow({
    title: Constants.APP_NAME,
    show: false,
    resizable: Constants.IS_DEV_ENV,
    webPreferences: Constants.DEFAULT_WEB_PREFERENCES
  })

  errorWindow.setMenu(null)

  if (Constants.IS_DEV_ENV) {
    await errorWindow.loadURL(`${Constants.APP_INDEX_URL_DEV}#/error`)
  } else {
    await errorWindow.loadFile(Constants.APP_INDEX_URL_PROD, { hash: 'error' })
  }

  errorWindow.on('ready-to-show', (): void => {
    if (!Constants.IS_DEV_ENV && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy()
    }
    errorWindow.show()
    errorWindow.focus()
  })

  errorWindow.webContents.on('did-frame-finish-load', (): void => {
    if (Constants.IS_DEV_ENV) {
      errorWindow.webContents.openDevTools()
    }
  })

  return errorWindow
}

const createTray = () => {
  // Use absolute path for tray icon in production
  // In production, resources are unpacked to resources/app.asar.unpacked/
  const resourcesBase = process.resourcesPath || path.join(path.dirname(app.getAppPath()), 'resources')
  const unpackedBase = path.join(resourcesBase, 'app.asar.unpacked')
  
  const iconPath = Constants.IS_DEV_ENV
    ? path.join(process.env.APP_ROOT!, 'electronAssets/resources/icon.png')
    : path.join(unpackedBase, 'electronAssets/resources/icon.png')
  
  console.log('[Electron Tray] Icon path:', iconPath)
  tray = new Tray(iconPath)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        mainWindow ? mainWindow.show() : createMainWindow()
      }
    },
    {
      label: 'Maximize',
      click: () => {
        if (mainWindow) {
          mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
        }
      }
    },
    {
      label: 'Exit',
      click: () => {
        exitApp(mainWindow!)
      }
    }
  ])

  tray.setToolTip(Constants.APP_NAME)
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow?.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
}

export { createMainWindow, createErrorWindow, createTray }
