/* eslint-disable no-template-curly-in-string */

// TODO: check this out https://www.electron.build/configuration.html
const path = require("path");
// import path, { dirname } from 'path'
const dotenv = require("dotenv");
// import * as dotenv from "dotenv";
// import dotenv from "dotenv";
const packageJson = require("../../package.json");
// import packageJson from "../../package.json";
// import packageJson from '../../package.json' assert { type: 'json' };

// import { fileURLToPath } from "url";
// import { dirname } from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "./envs/.env"),
  debug: true,
});

// // Print the App ID for debugging purposes, as requested.
// const appxAppId = 'BaderIdrisPortfolio'
// console.log('--- Electron Builder App ID ---')
// console.log('Original appId from package.json:', packageJson.appId)
// console.log('Using new appId for AppX build:', appxAppId)
// console.log('This is to fix the AppX build error due to invalid characters in the default appId.')
// console.log('---------------------------------')

// Get formatted current date
function getLocalTimestamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is zero-based
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}_${hours}_${minutes}`;
}

const windowsTargets = [
  { target: "nsis", arch: "x64" },
  { target: "msi", arch: "x64" }, // Professional MSI installer
  // { target: 'appx', arch: 'x64' },
  // { target: 'zip', arch: 'x64' }, // not worthy!
  { target: "portable", arch: "x64" },
];

const linuxTargets = [
  // { target: "snap", arch: "x64" }, full of bugs in electron-builder with snap v9!
  { target: "deb", arch: "x64" },
  { target: "rpm", arch: "x64" },
  { target: "AppImage", arch: "x64" },
];

const baseConfig = {
  /*
    configuration.win should be one of these:
    object { additionalCertificateFile?, appId?, artifactName?, asar?, asarUnpack?, azureSignOptions?, certificateFile?,
    certificatePassword?, certificateSha1?, certificateSubjectName?, compression?, cscKeyPassword?, cscLink?, defaultArch?,
    detectUpdateChannel?, disableDefaultIgnoredFiles?, electronLanguages?, electronUpdaterCompatibility?, executableName?,
    extraFiles?, extraResources?, fileAssociations?, files?, forceCodeSigning?, generateUpdatesFilesForAllChannels?, icon?,
    legalTrademarks?, protocols?, publish?, publisherName?, releaseInfo?, requestedExecutionLevel?, rfc3161TimeStampServer?,
    sign?, signAndEditExecutable?, signDlls?, signExts?, signingHashAlgorithms?, signtoolOptions?, target?, timeStampServer?,
    verifyUpdateCodeSignature? } | null
  */

  productName: packageJson.name,
  // afterSign: './createMD5List.js',
  appId: packageJson.appId,
  asar: true, // set true for securing the source code and some performances
  // Performance optimizations for faster builds
  concurrency: {
    jobs: 4, // Limit to prevent OOM while keeping it fast
  },
  afterPack: async (context) => {
    // Only apply to Linux
    if (context.electronPlatformName !== "linux") return;

    const fs = require("fs");
    const path = require("path");
    const sandboxPath = path.join(context.appOutDir, "chrome-sandbox");

    if (fs.existsSync(sandboxPath)) {
      try {
        fs.unlinkSync(sandboxPath);
        console.log(
          "--- [AfterPack] Removed chrome-sandbox to force namespace sandboxing ---",
        );
      } catch (e) {
        console.error("--- [AfterPack] Failed to remove chrome-sandbox:", e);
      }
    }
  },
  // Skip rebuilding native modules for cross-platform builds
  // This is required when building Windows apps from Linux/macOS
  npmRebuild: false,
  nodeGypRebuild: false,
  // ? read https://sharp.pixelplumbing.com/install/#electron
  asarUnpack: [
    "**/node_modules/sharp/**/*",
    "**/node_modules/@img/**/*",
    // Unpack image and SVG files for direct file access
    // ".output/public/imgs/**/*.{png,jpg,jpeg,webp,svg,gif,ico}",
    // ".output/public/fonts/**/*",
    // ".output/public/sounds/**/*",
    // Unpack electronAssets/resources for tray icon / app indicator access
    "electronAssets/resources/**/*",
  ],
  // extends: null,
  compression: "maximum",
  // Fixed: use target OS macro (${os}), not the host platform (resolves to win/mac/linux)
  artifactName:
    "${productName}_${version}_" +
    getLocalTimestamp() +
    "_${os}_${arch}.${ext}", // ! can't read them with template strings!
  directories: {
    output: "./release/${version}",
  },
  // Set homepage to baderidris.com instead of GitHub URL using extraMetadata
  extraMetadata: {
    homepage: "https://baderidris.com",
  },
  mac: {
    bundleVersion: "1.0",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    notarize: process.env.MAC_NOTARIZE === "true", // ! Enables notarization conditionally
    icon: "electronAssets/resources/icon.icns",
    type: "distribution",
    identity: process.env.MAC_CODE_SIGN_IDENTITY || null, // ! For macOS signing
    target: [{ target: "dmg", arch: ["x64", "arm64", "universal"] }],
  },
  dmg: {
    contents: [
      { x: 410, y: 150, type: "link", path: "/Applications" },
      { x: 130, y: 150, type: "file" },
    ],
    sign: false,
  },
  win: {
    icon: "electronAssets/resources/icon.ico",
    publish: [
      {
        provider: "github", // must be github | s3 | spaces | generic | custom | keygen | snapStore | bitbucket
        owner: "Bader-Idris",
        repo: "Bader-Idris",
        private: true,
      },
    ],
    // forceCodeSigning: true, // to fill the build if code signing failed or is invalid
    forceCodeSigning: false,
    // "rfc3161TimeStampServer": "http://timestamp.comodoca.com/rfc3161",
    // timeStampServer: 'http://timestamp.comodoca.com',

    // Use correct property names for electron-builder Windows configuration
    // For cross-platform builds from Linux/macOS, use WIN_* variables
    // Certificate can be:
    // 1. Path to .pfx file (relative or absolute)
    // 2. Base64-encoded certificate content (prefix with "base64:")
    cscLink:
      process.env.WIN_CSC_LINK ||
      (function () {
        const certPath = path.join(__dirname, "envs", "Cert.pfx");
        // Only use default path if file exists, otherwise let electron-builder skip signing
        try {
          return require("fs").existsSync(certPath) ? certPath : undefined;
        } catch {
          return undefined;
        }
      })(),
    cscKeyPassword: process.env.WIN_CSC_KEY_PASSWORD || undefined,
    // signingHashAlgorithms: ['sha256'], // used from gemini web not cli, invalid config!
    // publisherName: 'Bader-Idris',

    // For compatibility with older Windows SDKs and avoid "A required function is not present" error,
    // we'll handle timestamp at the appx level if needed
    target: windowsTargets,
  },
  nsis: {
    oneClick: false, // Assisted installer for professional experience
    perMachine: true, // Install per machine to Program Files (requires admin)
    allowElevation: true, // Allow requesting elevation if needed
    selectPerMachineByDefault: true, // Default to per-machine installation
    allowToChangeInstallationDirectory: true, // Allow users to modify installation site
    deleteAppDataOnUninstall: false, // Preserve user data on uninstall
    createDesktopShortcut: "always", // Always recreate desktop shortcut even on reinstall
    createStartMenuShortcut: true, // Create start menu shortcut
    shortcutName: "Bader Idris Portfolio", // Custom shortcut name
    uninstallDisplayName: "Bader Idris Portfolio", // Professional uninstall display name
    license: "LICENSE", // Include license in installer
    // Branding and visual customization
    installerIcon: "electronAssets/resources/icon.ico", // Custom installer icon
    uninstallerIcon: "electronAssets/resources/icon.ico", // Custom uninstaller icon
    // installerSidebar: 'electronAssets/resources/installerSidebar.bmp', // Uncomment when sidebar image is ready (164x314px recommended)
    // installerHeader: 'electronAssets/resources/installerHeader.bmp',   // Uncomment when header image is ready (150x57px recommended)
    // Language settings
    displayLanguageSelector: false, // Auto-detect OS language
    // Additional professional settings
    menuCategory: true, // Use company name for start menu folder
    runAfterFinish: true, // Run application after installation
    // Advanced options
    packElevateHelper: true, // Pack elevate helper for elevation
    useZip: false, // Use 7z for compression instead of zip
    // Custom NSIS script for advanced features
    include: "electronAssets/builder/customNSIS.nsh", // Include custom NSIS script with registry functions
    installerLanguages: "en_US", // Set installer language
  },
  msi: {
    // MSI-specific configuration for professional Windows installation
    upgradeCode: "A3C81A20-2152-4B60-B31B-2C618E641234", // Unique GUID for upgrade tracking
    // Advanced MSI options
    oneClick: false, // Traditional installer behavior
    perMachine: true, // Install per machine by default
    // User experience options
    runAfterFinish: true, // Run application after install
    createDesktopShortcut: true, // Create desktop shortcut
    createStartMenuShortcut: true, // Create start menu shortcut
    // Additional professional options
    menuCategory: true, // Use company name for start menu folder
    shortcutName: "Bader Idris Portfolio", // Custom shortcut name for MSI
    // Enhanced branding options
    // Note: MSI branding is more limited than NSIS but we can use these options for better appearance
    // Additional WiX arguments for advanced customization (requires WiX files in the project)
    // additionalWixArgs: [
    //   '-dWixUILicenseRtf=build/license.rtf',  // Custom license file in RTF format
    // ],
  },
  // appx: {
  //   applicationId: appxAppId,
  //   displayName: 'Bader Idris Portfolio',
  //   publisherDisplayName: packageJson.author.split(' <')[0],
  //   publisher: `CN=${packageJson.author.split(' <')[0]}`
  // },
  linux: {
    executableName: "portfolio", // Allow opening via "portfolio" command in terminal
    executableArgs: ["--no-sandbox", "--disable-setuid-sandbox"], // "--disable-dev-shm-usage" // hides loges, but doesn't solve unabilty to open uncompressed version!
    icon: "electronAssets/resources/icon.png", // Explicitly point to PNG for app indicator support
    category: "Utility",
    target: linuxTargets,
    maintainer: "Bader Idris <contact@baderidris.com>",
    desktop: {
      entry: {
        Name: "Bader Idris Portfolio",
        Comment: "Full Stack Developer Portfolio",
        Categories: "Utility;Development;",
      },
    },
  },
  deb: {
    maintainer: "Bader Idris <contact@baderidris.com>",
    vendor: "Bader Idris",
    priority: "optional",
    packageCategory: "utils",
    depends: [
      "libgtk-3-0",
      "libnotify4",
      "libnss3",
      "libxss1",
      "xdg-utils",
      "libatspi2.0-0", // Accessibility support
      "libappindicator3-1", // For app indicator support (older Ubuntu/Debian)
      "libayatana-appindicator3-1", // For app indicator support (newer Ubuntu/Debian)
      "libxtst6", // X11 Testing support
      "libgbm1", // Essential for WebGL/GPU acceleration
      "libasound2", // Essential for audio support
      "libnspr4", // Essential dependency
      "libsecret-1-0", // Essential for secure storage
      "libatk1.0-0", // Accessibility support
      "libatk-bridge2.0-0", // Accessibility support
      "libcups2", // Printing support
      "libdrm2", // DRM support
      "libx11-xcb1",
      "libxcb-dri3-0",
      "libxcomposite1",
      "libxdamage1",
      "libxfixes3",
      "libxrandr2",
    ],
    // https://www.electron.build/electron-builder.interface.deboptions
    synopsis: "Bader's portfolio application",
    description:
      packageJson.description ||
      "A multi-platform portfolio application built with Nuxt 4, Vue 3, Electron, and Capacitor for mobile.",
  },
  rpm: {
    depends: [
      "libgtk-3-0",
      "libnotify4",
      "libnss3",
      "libxss1",
      "xdg-utils",
      "libatspi2.0-0",
      "libappindicator3-1",
      "libayatana-appindicator3-1",
      "libxtst6",
      "libgbm1",
      "libasound2",
      "libnspr4",
      "libsecret-1-0",
      "libatk1.0-0",
      "libatk-bridge2.0-0",
      "libcups2",
      "libdrm2",
    ],
  },
  // ! MIGRATION: replaced legacy `snap` key with `snapcraft` key (electron-builder v26+).
  // The old `snap` key is deprecated in v26 and will not receive new features.
  // The new `snapcraft` key requires an explicit `base` field and nests per-core
  // options cleanly under a matching sub-key (e.g. `core22: { ... }`).
  // This structure is also fully forward-compatible with v27.
  // docs: https://www.electron.build/docs/snap
  snapcraft: {
    // `base` is required by the new snapcraft key.
    // core22 = Ubuntu 22.04 LTS — stable choice; use core24 (beta) only if you need
    // Ubuntu 24.04 / Electron 28+ / Wayland first-class support.
    base: "core22",

    // All per-core runtime options live under the matching base sub-key.
    // electron-builder merges this into the generated snapcraft.yaml automatically.
    core22: {
      grade: "stable", // "stable" | "devel" — controls Snap Store channel eligibility
      confinement: "strict", // "strict" | "devmode" | "classic"

      // ! REMOVED: `useTemplateApp: true` — it is automatically forced false whenever
      // stagePackages differs from the built-in defaults, so keeping it true alongside
      // a custom stagePackages list creates a validation conflict that crashes the build.
      // electron-builder will use the full snapcraft path (not the pre-built template)
      // whenever stagePackages is customised, which is correct here.

      stagePackages: [
        "libnss3",
        "libnspr4",
        "libatk1.0-0",
        "libatk-bridge2.0-0",
        "libcups2",
        "libdrm2",
        "libgtk-3-0",
        "libnotify4",
        "libxss1",
        "libasound2",
        "libgbm1",
        "libsecret-1-0",
        "libayatana-appindicator3-1",
      ],

      summary: "Bader's portfolio using Nuxt 4 + Vue 3 + Electron + Capacitor",
      description:
        packageJson.description ||
        "A multi-platform portfolio application built with Nuxt 4, Vue 3, Electron, and Capacitor for mobile. Visit [Bader's Portfolio](https://baderidris.com) for more information.",
    },
  },
  files: [
    "dist-electron/**/*",
    ".output/**/*",
    "electronAssets/resources/**/*",
    "!dist-electron/main/index.dev.js",
    "!dist",
    "!electronAssets/builder/envs", // important security to hide our certs from third parties, or in the app bundle
    "!docs/**/*",
    "!tests/**/*",
    "!release/**/*",
    "!node_modules/**/*",
    "!android/**/*",
    "!ios/**/*",
    "!.agents/**/*",
    "!.claude/**/*",
    "!.antigravitycli/**/*",
    "!.gemini/**/*",
    "!.github/**/*",
  ],

  // check https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json
};
baseConfig.copyright = `ⓒ ${new Date().getFullYear()} ${packageJson.author}`;

// TODO: check this useful notifier repo: https://github.com/mikaelbr/node-notifier
/* TODO: check these for electron inspiration:
  https://github.com/Nexus-Mods/Vortex
  https://github.com/Nexus-Mods/Vortex/blob/master/download-codesigntool.ps1

  https://github.com/Nexus-Mods/Vortex/blob/master/createMD5List.js
  https://github.com/Nexus-Mods/Vortex/blob/master/sign.js
  https://github.com/Nexus-Mods/Vortex/blob/master/download-codesigntool.ps1
  https://github.com/Nexus-Mods/Vortex/blob/master/test-codesigntool.ps1
  https://github.com/Nexus-Mods/Vortex/blob/master/download-buildpatchtool.ps1
  https://github.com/Nexus-Mods/Vortex/blob/master/package.json
  https://github.com/Nexus-Mods/Vortex/blob/master/bootstrap.ps1
  https://github.com/Nexus-Mods/Vortex/blob/master/README_OLD.md
  https://github.com/Nexus-Mods/Vortex/blob/master/BuildSubprojects.json

*/

// Notarization script for macOS (if enabled)
if (process.env.MAC_NOTARIZE === "true") {
  baseConfig.afterSign = "./electronAssets/builder/notarize.ts";
}

module.exports = {
  ...baseConfig,
};

// export default {
//   ...baseConfig,
// };