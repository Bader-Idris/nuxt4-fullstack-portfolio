/**
 * it seems that 'import' does NOT work here.
 * i.e.
 *  import { ipcRenderer, contextBridge } from 'electron'
 * causes
 *  SyntaxError: Cannot use import statement outside a module
 * and program may fail to start etc.
 * use 'require' instead.
 * 
 * NOTE that 'import' does not work, 'import type' DOES work.
 * probably typescript eliminates 'import type' on transpile.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer, IpcRendererEvent } = require('electron');

// --------- Expose some API to the Renderer process ---------
//
//  **** WARNING ****
//
//    following 'API' should be considered 'demonstration purpose only' and MUST NOT be used in production.
//    this kind of 'API' is considered 'bad practice' in security-wise.
//    consult electron official documents:
//      https://www.electronjs.org/docs/latest/tutorial/ipc
//      https://www.electronjs.org/docs/latest/tutorial/context-isolation#security-considerations
//
//  **** YOU HAVE BEEN WARNED ****
//
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // You can expose other APTs you need here.
  // ...
});
