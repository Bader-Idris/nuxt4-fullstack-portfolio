import { ipcMain, shell, dialog, IpcMainInvokeEvent, FileFilter } from 'electron'
import Constants from './utils/Constants'

/**
 * IPC Communications
 */
export default class IPCs {
  static initialize(): void {
    // Get application version
    ipcMain.handle('msgRequestGetVersion', () => {
      return Constants.APP_VERSION
    })

    // Handle external link opening
    ipcMain.handle('msgOpenExternalLink', async (event: IpcMainInvokeEvent, url: string) => {
      await shell.openExternal(url)
    })

    // Handle file opening with dialog
    ipcMain.handle('msgOpenFile', async (event: IpcMainInvokeEvent, filter: string) => {
      const filters: FileFilter[] = []
      if (filter === 'text') {
        filters.push({ name: 'Text', extensions: ['txt', 'json'] })
      } else if (filter === 'zip') {
        filters.push({ name: 'Zip', extensions: ['zip'] })
      }
      const dialogResult = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters
      })
      return dialogResult
    })

    // ipcMain.handle('window-control', (event, action) => {
    //   if (!mainWindow) return
    //   switch (action) {
    //     case 'minimize':
    //       mainWindow.minimize()
    //       break
    //     case 'maximize':
    //       mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
    //       break
    //     case 'close':
    //       mainWindow.close()
    //       break
    //   }
    // })
  }
}
