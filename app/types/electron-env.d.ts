/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * ├─┬ dist-electron
     * │ ├─┬ main
     * │ │ └── index.js
     * │ ├─┬ preload
     * │ │ └── index.js
     * │
     * ```
     */
    APP_ROOT: string;
    /** /dist/ or /public/ */
    VITE_PUBLIC: string;

    VITE_DEV_SERVER_URL?: string;
  }
}

// Used in Renderer process, expose in `preload.ts`
//  **** see WARNING in preload.ts ****
interface Window {
  ipcRenderer: import("electron").IpcRenderer;
}