import path from "node:path";
import { name, version } from '../../../../package.json'
// import { fileURLToPath } from 'url'

// process.env.APP_ROOT = path.join(import.meta.dirname, '..')
process.env.APP_ROOT = path.join(__dirname, '../../../..') // check out prod version, especially the ugly default nuxt config

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, '.output/public')

process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST


export default class Constants {
  // Display app name (uppercase first letter)
  static APP_NAME = name.charAt(0).toUpperCase() + name.slice(1)

  static APP_VERSION = version

  static IS_DEV_ENV = process.env.NODE_ENV === 'development'

  static IS_MAC = process.platform === 'darwin'

  static DEFAULT_WEB_PREFERENCES = {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    preload: path.join(MAIN_DIST, 'preload/index.js'),
  }

  static APP_INDEX_URL_DEV = `http://localhost:${process.env.PORT}`
  static APP_INDEX_URL_PROD = path.join(process.env.VITE_PUBLIC!, 'index.html')
}
