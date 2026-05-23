import { BrowserView, type RPCSchema } from "electrobun/bun";
import Constants from "./utils/Constants";
import { exec } from "child_process";

// Define the RPC Schema
export type AppRPCSchema = {
  bun: RPCSchema<{
    requests: {
      msgRequestGetVersion: {
        params: {};
        response: string;
      };
      msgRequestGetAppName: {
        params: {};
        response: string;
      };
      msgOpenExternalLink: {
        params: { url: string };
        response: void;
      };
      windowControl: {
        params: { action: "minimize" | "maximize" | "close" | "hide" | "show" };
        response: void;
      };
      appControl: {
        params: { action: "quit" | "relaunch" };
        response: void;
      };
    };
    messages: {};
  }>;
  webview: RPCSchema<{
    requests: {};
    messages: {};
  }>;
};

export function createRPC(mainWindowGetter: () => any) {
  return BrowserView.defineRPC<AppRPCSchema>({
    maxRequestTime: 5000,
    handlers: {
      requests: {
        msgRequestGetVersion: () => {
          return Constants.APP_VERSION;
        },
        msgRequestGetAppName: () => {
          return Constants.APP_NAME;
        },
        msgOpenExternalLink: ({ url }) => {
          console.log(`Opening external link: ${url}`);
          // Support multiple platforms for opening links
          const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
          exec(`${command} ${url}`);
        },
        windowControl: ({ action }) => {
          const win = mainWindowGetter();
          if (!win) return;

          switch (action) {
            case "minimize":
              if (typeof win.minimize === "function") win.minimize(); 
              break;
            case "maximize":
              if (typeof win.maximize === "function") win.maximize();
              break;
            case "close":
              if (typeof win.close === "function") win.close();
              break;
          }
        },
        appControl: ({ action }) => {
          switch (action) {
            case "quit":
              process.exit(0);
              break;
          }
        },
      },
      messages: {},
    },
  });
}
