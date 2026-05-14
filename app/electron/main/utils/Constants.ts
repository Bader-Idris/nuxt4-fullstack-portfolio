import path from "node:path";
import { name, version } from '../../../../package.json'

// APP_ROOT should be set by the entry point (index.ts)
// We provide a fallback just in case, but index.ts is the source of truth
if (!process.env.APP_ROOT) {
  process.env.APP_ROOT = path.join(__dirname, '../..') 
}

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, '.output/public')

process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

const APP_NAME = name.charAt(0).toUpperCase() + name.slice(1)
const APP_VERSION = version
const IS_DEV_ENV = process.env.NODE_ENV === 'development'
const IS_MAC = process.platform === 'darwin'

const DEFAULT_WEB_PREFERENCES = {
  nodeIntegration: false,
  contextIsolation: true,
  enableRemoteModule: false,
  preload: path.join(MAIN_DIST, 'preload', 'index.js'),
  // Allow loading resources from file:// protocol
  webSecurity: true,
  allowRunningInsecureContent: false,
}

const APP_INDEX_URL_DEV = `http://localhost:${process.env.PORT}`
const APP_INDEX_URL_PROD = path.join(process.env.VITE_PUBLIC!, 'index.html')
const APP_PROTOCOL = 'app'

export default {
  APP_NAME,
  APP_VERSION,
  IS_DEV_ENV,
  IS_MAC,
  DEFAULT_WEB_PREFERENCES,
  APP_INDEX_URL_DEV,
  APP_INDEX_URL_PROD,
  APP_PROTOCOL
}
