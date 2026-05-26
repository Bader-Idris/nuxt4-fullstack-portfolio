import type { ElectrobunConfig } from "electrobun";
import packageJson from "./package.json";

const config: ElectrobunConfig = {
  app: {
    name: packageJson.name,
    identifier: packageJson.appId,
    version: packageJson.version,
  },
  build: {
    useAsar: true,
    // We'll let Electrobun use its default 'artifacts' folder and move things in the helper script
    // to avoid interfering with internal build paths.
    bun: {
      entrypoint: "app/electrobun/main/index.ts",
    },
    // Nuxt builds to .output/public, we copy from there
    copy: {
      ".output/public": "views/mainview",
    },
    // Ignore Nuxt output in watch mode — HMR handles view rebuilds separately
    watchIgnore: [".output/**", "dist-electron/**"],
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
};

export default config;
