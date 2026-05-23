import { BrowserWindow, Updater } from "electrobun/bun";
import Constants from "./utils/Constants";
import { createRPC } from "./IPCs";

let mainWindow: BrowserWindow | null = null;

async function getUrl(): Promise<string> {
  // Check if we are in dev mode
  if (Constants.IS_DEV_ENV) {
    try {
      const response = await fetch(Constants.DEV_SERVER_URL, { method: "HEAD" });
      if (response.ok) {
        return Constants.DEV_SERVER_URL;
      }
    } catch (e) {
      console.log("Nuxt dev server not reachable, falling back to production views.");
    }
  }
  
  // In production, we use the custom protocol
  return Constants.PROD_INDEX_URL;
}

const url = await getUrl();

// Create the main window
mainWindow = new BrowserWindow({
  title: Constants.APP_NAME,
  url,
  frame: {
    width: 1200,
    height: 800,
    x: 100,
    y: 100,
  },
  rpc: createRPC(() => mainWindow),
});

console.log(`${Constants.APP_NAME} started with Electrobun!`);
