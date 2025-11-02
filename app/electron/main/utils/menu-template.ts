const isMac = process.platform === 'darwin'

/**
 * learn about contextual menus as setting them for specific elements and their events
 * an example:
 * const { remote } = require('electron')
 * const menu = remote.Menu.buildFromTemplate([
 *   {label: 'Cut', role: 'cut'},
 *   {label: 'Copy', role: 'copy'},
 *   {label: 'Paste', role: 'paste'},
 * ])
 * window.addEventListener('contextmenu', (event) => {
 *   event.preventDefault()
 *   menu.popup({window: BrowserWindow.getFocusedWindow()})
 * })
 */

const menuTemplate: Electron.MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        accelerator: isMac ? 'Command+N' : 'Ctrl+N',
        click: (_, focusedWindow) => focusedWindow.webContents.send('new-file')
      },
      {
        label: 'Open',
        accelerator: isMac ? 'Command+O' : 'Ctrl+O',
        click: (_, focusedWindow) => focusedWindow.webContents.send('open-file')
      },
      {
        label: 'Save',
        accelerator: isMac ? 'Command+S' : 'Ctrl+S',
        click: (_, focusedWindow) => focusedWindow.webContents.send('save-file')
      },
      {
        label: 'Save As',
        accelerator: isMac ? 'Command+Shift+S' : 'Ctrl+Shift+S',
        click: (_, focusedWindow) => focusedWindow.webContents.send('save-file-as')
      },
      {
        label: 'Close',
        accelerator: isMac ? 'Command+W' : 'Ctrl+W',
        role: 'close'
      },
      {
        type: 'separator'
      },
      {
        label: 'Exit',
        accelerator: isMac ? 'Command+Q' : 'Ctrl+Q',
        role: 'quit'
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: isMac ? 'Command+Z' : 'Ctrl+Z',
        role: 'undo'
      },
      {
        label: 'Redo',
        accelerator: isMac ? 'Command+Shift+Z' : 'Ctrl+Shift+Z',
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: isMac ? 'Command+X' : 'Ctrl+X',
        role: 'cut'
      },
      {
        label: 'Copy',
        accelerator: isMac ? 'Command+C' : 'Ctrl+C',
        role: 'copy'
      },
      {
        label: 'Paste',
        accelerator: isMac ? 'Command+V' : 'Ctrl+V',
        role: 'paste'
      },
      {
        label: 'Select All',
        accelerator: isMac ? 'Command+A' : 'Ctrl+A',
        role: 'selectall'
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Toggle Full Screen',
        accelerator: isMac ? 'Command+Shift+F' : 'F11',
        click: (_, focusedWindow) => focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: isMac ? 'Command+Shift+I' : 'Ctrl+Shift+I',
        click: (_, focusedWindow) => focusedWindow.webContents.toggleDevTools()
      },
      {
        type: 'separator'
      },
      {
        label: 'Reload',
        accelerator: isMac ? 'Command+R' : 'Ctrl+R',
        role: 'reload'
      }
    ]
  }
]

export default menuTemplate
