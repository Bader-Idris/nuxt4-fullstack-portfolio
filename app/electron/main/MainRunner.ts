import { app, BrowserWindow, ipcMain, RenderProcessGoneDetails, Menu, Tray } from 'electron'
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
    width: Constants.IS_DEV_ENV ? 1500 : 1200, // Different window size based on environment
    height: 650,
    useContentSize: true,
    // titleBarStyle: 'hidden',
    // frame: false, // disable default title bar || frame
    webPreferences: Constants.DEFAULT_WEB_PREFERENCES
  })

  mainWindow.setMenu(null) // Disable default menu

  const menu = Menu.buildFromTemplate(menuTemplate) // Set custom menu
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
  tray = new Tray('../../../buildAssets/resources/icon.png')
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
