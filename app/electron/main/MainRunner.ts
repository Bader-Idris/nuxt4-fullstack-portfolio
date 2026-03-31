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

      console.log(`[Electron Protocol] Raw pathname: ${pathname}`)

      // On Windows, URL.pathname comes as /C:/path/to/file
      // We need to handle this carefully for cross-platform builds
      if (process.platform === 'win32') {
        // Check if this is a Windows path with drive letter
        if (/^\/[A-Z]:\//i.test(pathname)) {
          pathname = pathname.substring(1) // Remove leading slash: /C:/... -> C:/...
          console.log(`[Electron Protocol] Windows path detected: ${pathname}`)
        }
      }

      // Check if this is an app asset (imgs, _nuxt, fonts, sounds, etc.)
      // Normalize for comparison by converting backslashes and lowercase
      const normalizedPath = pathname.replace(/\\/g, '/').toLowerCase()
      
      // App asset patterns - these should be served from our app resources
      const isAppAsset = [
        'imgs/', '_nuxt/', 'fonts/', 'sounds/', 
        'favicon', 'builds/', '__nuxt_content/'
      ].some(pattern => {
        // Handle both absolute paths (/imgs/) and Windows paths (C:/imgs/)
        const cleanNormalized = normalizedPath.replace(/^[a-z]:\//, '')
        return cleanNormalized.startsWith(pattern) || normalizedPath.startsWith('/' + pattern)
      })

      if (isAppAsset) {
        // Strip drive letter and leading slashes for path joining
        // C:/imgs/... -> imgs/...
        // /imgs/... -> imgs/...
        let cleanPath = pathname.replace(/^[\/\\]+/, '')
        
        // Remove Windows drive letter if present
        if (/^[A-Z]:\//i.test(cleanPath)) {
          cleanPath = cleanPath.substring(3)
        }

        // Files are unpacked to: resources/app.asar.unpacked/.output/public/
        const filePath = path.join(unpackedBase, '.output', 'public', cleanPath)

        console.log(`[Electron Protocol] Trying: ${filePath}`)

        // Check if file exists
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error(`[Electron Protocol] File not found: ${filePath}`, err.message)
            // Try alternative path without 'public' subdirectory
            const altFilePath = path.join(unpackedBase, '.output', cleanPath)
            console.log(`[Electron Protocol] Trying alternative: ${altFilePath}`)
            fs.stat(altFilePath, (altErr, altStats) => {
              if (altErr) {
                console.error(`[Electron Protocol] Alternative also not found: ${altFilePath}`, altErr.message)
                callback({ statusCode: 404 })
              } else {
                console.log(`[Electron Protocol] Serving alternative: ${altFilePath}`)
                callback({ path: altFilePath })
              }
            })
          } else {
            console.log(`[Electron Protocol] Serving: ${filePath}`)
            callback({ path: filePath })
          }
        })
      } else {
        // Non-app assets - pass through with platform-appropriate path format
        if (process.platform === 'win32') {
          const winPath = pathname.replace(/^[\/\\]+/, '').replace(/\//g, '\\')
          callback({ path: winPath })
        } else {
          callback({ path: pathname })
        }
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
    ? path.join(process.env.APP_ROOT!, 'electronAssets', 'resources', 'icon.png')
    : path.join(unpackedBase, 'electronAssets', 'resources', 'icon.png')

  console.log('[Electron Tray] Icon path:', iconPath)
  console.log('[Electron Tray] Icon exists:', fs.existsSync(iconPath))
  
  // Fallback for Windows if the icon path doesn't exist
  if (!fs.existsSync(iconPath) && !Constants.IS_DEV_ENV) {
    // Try alternative paths for Windows
    const appDir = path.dirname(process.execPath)
    const alternativePaths = [
      path.join(appDir, 'resources', 'app.asar.unpacked', 'electronAssets', 'resources', 'icon.png'),
      path.join(appDir, 'electronAssets', 'resources', 'icon.png'),
      path.join(appDir, 'resources', 'icon.png')
    ]
    
    for (const altPath of alternativePaths) {
      console.log('[Electron Tray] Trying alternative icon path:', altPath)
      if (fs.existsSync(altPath)) {
        tray = new Tray(altPath)
        console.log('[Electron Tray] Using alternative icon:', altPath)
        break
      }
    }
    
    if (!tray) {
      console.error('[Electron Tray] No icon found, creating tray without icon')
      tray = new Tray(null) // Creates tray with default icon
    }
  } else {
    tray = new Tray(iconPath)
  }
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
