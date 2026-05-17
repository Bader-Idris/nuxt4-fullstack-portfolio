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
const { contextBridge, ipcRenderer } = require("electron");

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
  on(...args: [string, (event: any, ...args: any[]) => void]) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event: any, ...args: any[]) =>
      listener(event, ...args),
    );
  },
  off(...args: [string, ...any[]]) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: [string, ...any[]]) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: [string, ...any[]]) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // You can expose other APTs you need here.
  // ...
});