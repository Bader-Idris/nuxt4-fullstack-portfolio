import { app, shell, BrowserWindow } from "electron";
const isMac = process.platform === "darwin";

const menuTemplate: Electron.MenuItemConstructorOptions[] = [
  // { role: 'appMenu' }
  ...(isMac
    ? ([
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ] as Electron.MenuItemConstructorOptions[])
    : []),
  // { role: 'fileMenu' }
  {
    label: "File",
    submenu: [
      {
        label: "New Window",
        accelerator: isMac ? "Cmd+N" : "Ctrl+N",
        click: (_menuItem, focusedWindow) => {
          if (focusedWindow instanceof BrowserWindow) {
            focusedWindow.webContents.send("new-file");
          }
        },
      },
      {
        label: "Open...",
        accelerator: isMac ? "Cmd+O" : "Ctrl+O",
        click: (_menuItem, focusedWindow) => {
          if (focusedWindow instanceof BrowserWindow) {
            focusedWindow.webContents.send("open-file");
          }
        },
      },
      { type: "separator" },
      {
        label: "Save",
        accelerator: isMac ? "Cmd+S" : "Ctrl+S",
        click: (_menuItem, focusedWindow) => {
          if (focusedWindow instanceof BrowserWindow) {
            focusedWindow.webContents.send("save-file");
          }
        },
      },
      {
        label: "Save As...",
        accelerator: isMac ? "Cmd+Shift+S" : "Ctrl+Shift+S",
        click: (_menuItem, focusedWindow) => {
          if (focusedWindow instanceof BrowserWindow) {
            focusedWindow.webContents.send("save-file-as");
          }
        },
      },
      { type: "separator" },
      isMac ? { role: "close" } : { role: "quit" },
    ],
  },
  // { role: 'editMenu' }
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...((isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
          ]
        : [
            { role: "delete" },
            { type: "separator" },
            { role: "selectAll" },
          ]) as Electron.MenuItemConstructorOptions[]),
    ],
  },
  // { role: 'viewMenu' }
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  // { role: 'windowMenu' }
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...((isMac
        ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ]
        : [{ role: "close" }]) as Electron.MenuItemConstructorOptions[]),
    ],
  },
  {
    role: "help",
    submenu: [
      {
        label: "Learn More",
        click: async () => {
          await shell.openExternal("https://baderidris.com");
        },
      },
    ],
  },
];

export default menuTemplate;