import { ipcMain, shell, dialog, type IpcMainInvokeEvent, type FileFilter, BrowserWindow, app } from 'electron'
import Constants from './utils/Constants'

/**
 * IPC Communications
 */
export function initializeIPCs(): void {
  // Get application version
  ipcMain.handle('msgRequestGetVersion', () => {
    return Constants.APP_VERSION
  })

  // Get application name
  ipcMain.handle('msgRequestGetAppName', () => {
    return Constants.APP_NAME
  })

  // Handle external link opening
  ipcMain.handle('msgOpenExternalLink', async (_event: IpcMainInvokeEvent, url: string) => {
    await shell.openExternal(url)
  })

  // Handle file opening with dialog
  ipcMain.handle('msgOpenFile', async (_event: IpcMainInvokeEvent, filter: string) => {
    const filters: FileFilter[] = []
    if (filter === 'text') {
      filters.push({ name: 'Text', extensions: ['txt', 'json'] })
    } else if (filter === 'zip') {
      filters.push({ name: 'Zip', extensions: ['zip'] })
    }
    
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (!focusedWindow) return null

    const dialogResult = await dialog.showOpenDialog(focusedWindow, {
      properties: ['openFile'],
      filters
    })
    return dialogResult
  })

  // Window controls
  ipcMain.handle('window-control', (event, action) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return

    switch (action) {
      case 'minimize':
        window.minimize()
        break
      case 'maximize':
        if (window.isMaximized()) {
          window.unmaximize()
        } else {
          window.maximize()
        }
        break
      case 'close':
        window.close()
        break
      case 'hide':
        window.hide()
        break
      case 'show':
        window.show()
        break
    }
  })

  // App controls
  ipcMain.handle('app-control', (_event, action) => {
    switch (action) {
      case 'quit':
        app.quit()
        break
      case 'relaunch':
        app.relaunch()
        app.exit()
        break
    }
  })
}
