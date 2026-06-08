import { defineNuxtConfig } from "nuxt/config";
import { definePerson } from "nuxt-schema-org/schema";
// for electron
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import glsl from "vite-plugin-glsl";
// import { writeFileSync } from 'node:fs'
// TODO: this crashes with: _nuxt/!~{00x}~-legacy.js:25:12: ERROR: Transforming destructuring to the configured target environment ("chrome64", "edge79", "es2020", "firefox67", "safari12" + 2 overrides) is not supported yet
// import legacy from '@vitejs/plugin-legacy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isElectron = process.env.IS_ELECTRON === "true";
const isElectrobun = process.env.IS_ELECTROBUN === "true";
const isCapacitor = process.env.IS_CAPACITOR === "true";
const isDesktop = isElectron || isElectrobun;
const isSSR = process.env.NUXT_SSR !== "false" && !isDesktop && !isCapacitor;
const isDebug = process.env.IS_DEBUGGING !== "false";
const isBun = process.env.IS_BUN === "true" || process.env.NITRO_PRESET === "bun";
const isDeno = process.env.IS_DENO === "true" || process.env.NITRO_PRESET === "deno_server";

// Unified Site URL for SEO and i18n consistency
const siteUrl = process.env.DOMAIN_NAME;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: isSSR,
  // read this for compatibility https://nitro.build/config#compatibilitydate
  compatibilityDate: "2026-05-28",
  devtools: {
    enabled: isDebug,

    timeline: {
      enabled: true,
    },
  },
  debug: isDebug,
  srcDir: path.join(__dirname, "./app"),
  alias: {
    "@": path.join(__dirname, "./app"),
    // "~": path.join(__dirname, "./app"),
    "@server": path.join(__dirname, "./server"),
  },
  serverDir: path.join(__dirname, "./server"),
  future: {
    compatibilityVersion: 5,
  },
  experimental: {
    normalizeComponentNames: true,
    appManifest: false,
  },
  nitro: {
    // // Fix for Windows path resolution in prerenderer
    // TODO: test on windows!!
    // ...(process.platform === 'win32' && {
    //   esbuild: {
    //     options: {
    //       target: 'node20',
    //     },
    //   },
    // }),

    // ...(process.env.IS_ELECTRON === "true" && {
    // hooks: {
    //   'prerender:generate'(route) {
    //     if (route.route === '/index.html') {
    //       route.skip = true
    //     }
    //   },
    // },

    // hooks: {
    //   'prerender:generate'(route, nitro) {
    //     // This hook triggers when the 200.html is generated.
    //     if (route?.route === '/200.html') {
    //       // Create a redirect in index.html to your default locale or entry point.
    //       // The following example redirects to the 'en' locale. Change if needed.
    //       const redirectHtml = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/en"></head></html>`
    //       const outputPath = path.join(nitro.options.output.publicDir, 'index.html')
    //       writeFileSync(outputPath, redirectHtml)
    //     }
    //   },
    // },
    // }),

    // Force Nitro to bundle everything it can instead of copying to node_modules.
    // noExternals: true would bundle ALL deps — too aggressive for native modules.
    // Instead we use externals to whitelist only what MUST stay external.
    noExternals: false, // default, keep it

    externals: {
      // These stay external (native binaries / too dynamic to inline):
      external: [
        'sharp',
        '@prisma/client',
        'prisma',
        'pg',
        'pg-native',
        'mongoose',
        'firebase-admin',
        'nodemailer',
        'socket.io',
        'socket.io-client',
        'ioredis',
        'apn',
        'web-push',
        '@socket.io/redis-streams-adapter',
        // 'bcryptjs', // Moved to inline for Deno/Bun compatibility
        'jsonwebtoken',
        'rate-limiter-flexible',
        // 'ttf2woff2',
        'better-sqlite3',
      ],
      // Force everything else to be inlined/bundled into chunks:
      inline: [
        // inline your own server code
        /^~/,
        /^@\//,
        // inline smaller pure-JS deps that Nitro was unnecessarily externalizing
        'howler',
        'highlight.js',
        'canvas-confetti',
        'particles.js',
        'vue3-toastify',
        // if using deno/bun, 'ofetch', 'defu', 'ufo', 'ipx'
        ...(isBun || isDeno ? [
          'ofetch',
          'defu',
          'ufo',
          'ipx',
          'bcryptjs',
          'unenv',
          'destr',
          'scule',
          'klona',
          'std-env',
          'ohash',
        ] : []),
      ],
    },

    minify: true, // ← shrinks chunks/ from 53MB further (~30-40%)

    compressPublicAssets: {
      gzip: process.env.NUXT_GZIP !== "false",
      // brotli: process.env.NUXT_BROTLI !== 'false'
      brotli: process.env.NUXT_GZIP !== "false",
    },

    routeRules: {
      // Backend & Real-time routes - strictly no prerendering, no SSR, no cache
      "/api/**": {
        cors: true,
        ssr: false,
        prerender: false,
        cache: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
      "/socket.io/**": {
        ssr: false,
        prerender: false,
        cache: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },

      // Headers for builds to prevent caching issues
      '/_nuxt/builds/**': {
        headers: {
          'Cache-Control': 'no-store',
        },
      },

      // SEO Redirects
      "/about/personal": {
        redirect: { to: "/about/hobbies/bio", statusCode: 301 }
      },

      // Dynamic/Protected pages - SSR false for web (handled by client/middleware), prerendered for Electron
      "/contact/admin": {
        ssr: false,
        prerender: isElectron,
        cache: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
      "/dashboard": {
        ssr: false,
        prerender: isElectron,
        cache: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
        // "/auth/callback": {},
        // "/user/forgot-password": {},
        // "/user/reset-password": {},
        // "/user/unsubscribe": {},
        // "/user/verify-email": {},
      },
      "/blog/create": {
        ssr: false,
        prerender: isElectron,
      },
      "/blog/edit/**": {
        ssr: false,
        prerender: false,
      },

      // Additional Electron-specific prerendering for main navigation pages
      // This is critical for production Electron as it uses hashMode and local file loading
      ...(isElectron && {
        "/": { prerender: true },
        "/blog": { prerender: true },
        "/projects": { prerender: true },
      }),
    },

    // errorHandler: "./server/error-handler.ts", // does it work on prod properly??
    experimental: {
      websocket: true,
      asyncContext: true,
    },

    serveStatic: process.env.NODE_ENV === "production" && isSSR ? false : true,
    ...(!isDesktop && {
      publicAssets: [
        {
          // Feed prior build manifests so skew protection works across deploys.
          // Nitro precomputes static asset routes at build time — files added
          // after build are invisible to the router without this.
          dir: '../public/_nuxt/builds',
          baseURL: '/_nuxt/builds',
          maxAge: 0, // never cache manifests
        },
      ],
    }),
  },

  css: ["~/assets/css/normalize.css", "~/assets/scss/main.scss"],
  vite: {
    define: {
      // Build-time constant — Rollup will dead-code-eliminate any branch
      // guarded by `import.meta.env.IS_CAPACITOR` when building for SSR/web.
      "import.meta.env.IS_CAPACITOR": JSON.stringify(isCapacitor),
    },
    optimizeDeps: {
      include: [
        '@capacitor/app',
        '@capacitor/app-launcher',
        '@capacitor/browser',
        '@capacitor/core',
        '@capacitor/device',
        '@capacitor/haptics',
        '@capacitor/keyboard',
        '@capacitor/local-notifications',
        '@capacitor/network',
        '@capacitor/push-notifications',
        '@capacitor/splash-screen',
        '@capacitor/status-bar',
        '@capacitor/toast',
        '@capgo/capacitor-social-login',
        '@rive-app/canvas', // CJS
        '@tiptap/extension-code-block-lowlight',
        '@unhead/schema-org',
        '@unhead/schema-org/vue',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'canvas-confetti',
        'capacitor-plugin-safe-area',
        'electrobun/view',
        'gsap',
        'gsap/all',
        'highlight.js',
        'howler', // CJS
        'lowlight',
        'prosemirror-commands',
        'prosemirror-dropcursor',
        'prosemirror-gapcursor',
        'prosemirror-history',
        'prosemirror-inputrules',
        'prosemirror-keymap',
        'prosemirror-model',
        'prosemirror-schema-list',
        'prosemirror-state',
        'prosemirror-transform',
        'prosemirror-view',
        'sharp', // CJS
        'socket.io-client',
        'three',
        'three/addons/loaders/GLTFLoader.js',
        'three/examples/jsm/controls/OrbitControls.js',
        'three/examples/jsm/loaders/DRACOLoader.js',
        'three/examples/jsm/loaders/GLTFLoader.js',
        'vue3-toastify',
        'zod',
      ],
      exclude: ["@dimforge/rapier3d-compat"],
    },
    plugins: [
      // legacy({
      //   targets: ['defaults', 'not IE 11'],
      //   // modernPolyfills: true,
      //   // renderLegacyChunks: true,
      // }),
      glsl({
        include: [
          "**/*.glsl",
          "**/*.vert",
          "**/*.frag",
          // '**/*.vs',
          // '**/*.fs',
        ],
        exclude: [],
        warnDuplicatedImports: true,
        defaultExtension: "glsl",
      }) as any,
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "${path.join(__dirname, "app/assets/scss/index.scss").replace(/\\/g, "/")}" as *;`,
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
    build: {
      sourcemap: "hidden", // test if this hides: #14 7.356  WARN
      // [plugin nuxt: components - loader]Sourcemap is likely to be incorrect: a plugin(nuxt: components- loader) was used to transform files,
      // but didn't generate a sourcemap for the transformation. Consult the plugin documentation for help (x25)
      
      // check if this is the crash cuase!
      // rollupOptions: {
      //   output: {
      //     manualChunks(id) {
      //       if (id.includes('node_modules')) {
      //         if (id.includes('three')) return 'vendor-three';
      //         if (id.includes('gsap')) return 'vendor-gsap';
      //         if (id.includes('highlight.js')) return 'vendor-highlight';
      //         if (id.includes('@rive-app')) return 'vendor-rive';
      //         if (id.includes('lowlight') || id.includes('highlight')) return 'vendor-highlight';
      //         return 'vendor'; // all other node_modules
      //       }
      //     }
      //   }
      // }
      chunkSizeWarningLimit: 1000, // kB
    },
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        paths: {
          "@/*": ["./app/*"],
          "@server/*": ["./server/*"],
        },
      },
    },
  },
  // components: { // TODO: is it a good solution for the warning on building process
  //   global: true,
  //   dirs: ['~/components']
  // },
  modules: [
    // "@vite-pwa/nuxt", // TODO: test if they fixed the security bug of not handling status codes anymore!!
    ...(isElectron ? ["nuxt-electron"] : []),
    "@nuxtjs/device",
    "@nuxt/fonts",
    "@nuxtjs/seo",
    "nuxt-skew-protection",
    "nuxt-ai-ready",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/image",
    "@nuxt/icon",
    "@nuxt/content",
    "nuxt-tiptap-editor",
    // "@nuxt/eslint", // Removed: replaced by oxlint + oxfmt
    "@nuxt/scripts",
    // "@nuxt/eslint", // Removed: duplicate entry, replaced by oxlint + oxfmt
    "v-gsap-nuxt",
    // "@teages/nuxt-legacy", // Removed: using @vitejs/plugin-legacy directly in vite config
    // "@nuxtjs/ionic", // todo: useless with ssr, causing many issues!
  ],
  skewProtection: {
    //   // Persistent storage for build assets ensures Googlebot and users on old tabs don't hit 404/500s.
    //   // Using Redis as the backend for cross-deployment persistence in Docker/Cluster environments.
    //   storage: process.env.REDIS_URL ? {
    //     driver: 'redis',
    //     options: {
    //       url: process.env.REDIS_URL,
    //     }
    //   } : {
    //     driver: 'fs',
    //   },
  
    retentionDays: 45, // Keep versions for 45 days
    maxNumberOfVersions: 15, // Keep maximum 15 versions
    // https://nuxtseo.com/docs/skew-protection/guides/storage-configuration#redis
    // storage: {
    //   driver: 'redis',
    
    //   // host: process.env.REDIS_HOST || 'localhost',
    //   // port: Number(process.env.REDIS_PORT) || 6379,
    //   // password: process.env.REDIS_PASSWORD,
    //   redisUrl: process.env.REDIS_URL,
    //   db: 0,
    //   base: 'skew-protection'
    // }
  },
  ...(isDesktop && {
    router: {
      options: {
        hashMode: true, // This helps with Electron and Electrobun file path issues
      },
    },
    app: {
      // TODO: check if it was a bun error or something!!
      baseURL: "./", // Needed for proper resource loading in Electron/Electrobun
      // buildAssetsDir: '/_nuxt/', // Ensures asset paths are correct
    },
  }),
  ...(isElectron && {
    electron: {
      build: [
        {
          // Main-Process entry file of the Electron App.

          entry: "app/electron/main/index.ts",
          vite: {
            build: {
              //
              //  example 'externalize' node.js modules.
              //
              //  suppose you want to use node:sqlite.
              //  you write your repository class and import the class into main.ts like:
              //    import { SomethingRepository } from '~/repositories/SomethingRepository.ts';
              //
              //  in the repository class,
              //  you might import node:sqlite like:
              //    import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';
              //
              //  now build fails:
              //    app/repositories/SomethingRepository.ts (1:9): "DatabaseSync" is not exported by "__vite-browser-external", imported by "app/repositories/SomethingRepository.ts".
              //
              //  one of the solutions is 'externalize' such modules.
              //
              rollupOptions: {
                external: ["node:sqlite", "fsevents", "sharp"],
              },
              outDir: "dist-electron/main",
            },
            //
            //  typescript eliminates 'import type', but output 'import' as is,
            //  e.g.
            //    import type SomeInterface from '~/InterfaceFolder/SomeInterface'
            //  is eliminated, where as
            //    import SomeEnum from '~/EnumFolder/SomeEnum',
            //    import SomeFunc from '~/FuncFolder/SomeFunc'
            //  appear in javascript.
            //
            //  rollup does not know how to resolve those paths.
            //    [vite]: Rollup failed to resolve import "~/EnumFolder/SomeEnum" from "/home/user/projects/nuxt4-electron-minimum-sample/app/electron/main.ts".
            //  so we tell rollup that ~/ means {__dirname}/app/
            //
            //  NOTE that path.join(__dirname, 'app') does NOT work.
            //  beware trailing '/'
            //
            resolve: {
              alias: {
                "~/": path.join(__dirname, "app/"),
                "@/": path.join(__dirname, "app/"),
                "@server/": path.join(__dirname, "server/"),
              },
            },
          },
        },
        {
          entry: "app/electron/preload/index.ts",
          vite: {
            build: {
              outDir: "dist-electron/preload",
            },
          },
          onstart(options: any) {
            // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete,
            // instead of restarting the entire Electron App.
            options.reload();
          },
        },
      ],

      //  it seems that
      //  - npm run dev requires disableDefaultOptions: true
      //    c.f. https://github.com/caoxiemeihao/nuxt-electron/issues/86 etc
      //  - npm run electron:build requires disableDefaultOptions: false
      //    otherwise built program does not work(in my experience) Mia said
      //    heres at: https://github.com/mia-san/nuxt4-electron-minimum-sample.git
      //
      //  so we need to switch disableDefaultOptions.
      //
      //  following assumes
      //    process.env.NODE_ENV === 'development' on npm run dev
      //    process.env.NODE_ENV === 'production' on npm run electron:build
      //
      disableDefaultOptions: process.env.NODE_ENV === "development",
      // disableDefaultOptions: true,

      // Polyfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {},
    },
  }),
  tiptap: {
    prefix: "Tiptap", //prefix for Tiptap imports, composables not included
  },
  // pwa: {
  //   // official source: https://github.com/vite-pwa/nuxt/blob/main/playground/nuxt.config.ts
  //   strategies: sw ? "injectManifest" : "generateSW",
  //   srcDir: sw ? "service-worker" : undefined,
  //   filename: sw ? "sw.ts" : undefined,
  //   registerType: "autoUpdate", // the default 'prompt' will appear a dir asking for updating the cache by our client
  //   manifest: {
  //     // or manifest: false to use your manual file
  //     // the plugin uses: [workbox-build node](https://developer.chrome.com/docs/workbox/modules/workbox-build)
  //     name: "My Portfolio",
  //     short_name: "Portfolio",
  //     description: "Bader Idris Portfolio, full stack developer",
  //     theme_color: "#CCCCCC",
  //     background_color: "#CCCCCC",
  //     // check these two recommended websites for generating favicon
  //     // https://vite-pwa-org.netlify.app/assets-generator/
  //     // https://favicon.inbrowser.app/tools/favicon-generator
  //     icons: [
  //       {
  //         src: "/icon-48.webp",
  //         sizes: "48x48",
  //         type: "image/webp",
  //         purpose: "any",
  //       },
  //       {
  //         src: "/icon-72.webp",
  //         sizes: "72x72",
  //         type: "image/webp",
  //         purpose: "any",
  //       },
  //       {
  //         src: "/icon-96.webp",
  //         sizes: "96x96",
  //         type: "image/webp",
  //         purpose: "any",
  //       },
  //       {
  //         src: "/icon-128.webp",
  //         sizes: "128x128",
  //         type: "image/webp",
  //         purpose: "any",
  //       },
  //       {
  //         src: "/icon-192.webp",
  //         sizes: "192x192",
  //         type: "image/webp",
  //         purpose: "any",
  //       },
  //       {
  //         src: "/icon-256.webp",
  //         sizes: "256x256",
  //         type: "image/webp",
  //         purpose: "any",
  //       },
  //       {
  //         src: "/icon-512.webp",
  //         sizes: "512x512",
  //         type: "image/webp",
  //         purpose: "any",
  //       },
  //       {
  //         src: "/pwa-maskable-192x192.png",
  //         sizes: "192x192",
  //         type: "image/png",
  //         purpose: "maskable",
  //       },
  //       {
  //         src: "/pwa-maskable-512x512.png",
  //         sizes: "512x512",
  //         type: "image/png",
  //         purpose: "maskable",
  //       },
  //     ],
  //   },
  //   // includeAssets: [
  //   //   "**/*.{png,wav,svg,jpg,jpeg,webp,css,js,woff2,woff,ttf,eot}",
  //   // ],
  //   includeAssets: [
  //     "favicon.ico",
  //     "apple-touch-icon.png",
  //     "pwa-maskable-*.png",
  //     "icon-*.webp",
  //   ],
  //   // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],

  //   injectRegister: "script-defer", // if null, you must do the manual service worker
  //   workbox: {
  //     // https://vite-pwa-org.netlify.app/guide/service-worker-precache.html#precache-manifest
  //     globPatterns: [
  //       "**/*.{css,js,html,ico,png,wav,svg,jpg,jpeg,webp,woff2,woff,ttf,eot}",
  //       // "**/_payload.json",
  //     ],
  //     // cleanupOutdatedCaches: true // todo: wasn't commented in vue 3 project
  //   },
  //   injectManifest: {
  //     globPatterns: [
  //       "**/*.{css,js,html,ico,png,wav,svg,jpg,jpeg,webp,woff2,woff,ttf,eot}",
  //     ],
  //   },
  //   client: {
  //     installPrompt: true,
  //   },
  //   devOptions: {
  //     enabled: true,
  //   },
  // },
  ...(!isDesktop && !isCapacitor && {
    icon: {
      // Prevent massive server-side bundling of icons
      // By scanning for used icons and bundling them for the client
      clientBundle: {
        scan: true,
        includeCustomCollections: true,
      },
    },
  }),
  i18n: {
    debug: isDebug,
    // Force baseUrl here for build-time SEO tag generation
    baseUrl: isElectron ? "./" : siteUrl,
    langDir: "../app/i18n/locales/",
    locales: [
      {
        code: "en",
        iso: "en-US", // check if deprecated
        dir: "ltr",
        language: "en-US",
        // files: ["en/**.json"], // did not work, it can handle js,ts,json files
        // https://i18n.nuxtjs.org/docs/guide/lazy-load-translations#basic-usage
        // TODO: 🥊 to be able to fetch from nuxt server 🥊
        file: "en-US.json",
        name: "English",
        isCatchallLocale: true, // This one will be used as catchall locale
      },
      {
        code: "ar",
        iso: "ar-PS",
        dir: "rtl",
        language: "ar-PS",
        file: "ar-PS.json",
        name: "العربية",
      },
      {
        code: "es",
        iso: "es-ES",
        dir: "ltr",
        language: "es-ES",
        file: "es-ES.json",
        name: "Español",
      },
    ],
    defaultLocale: "en",
    defaultDirection: "ltr",
    strategy: "prefix_except_default",
    // vueI18n: "~/i18n/i18n.config.ts", // using custom path, default
  },
  pinia: {
    storesDirs: [
      "./app/stores/**",
      // "./custom-folder/stores/**",
    ],
  },
  // image: {
  //   provider: "ipx",
  //   format: ["webp", "jpeg", "png", "svg"],
  //   dir: "./public",
  // },
  postcss: {
    plugins: {
      "postcss-nesting": {}, // enabled for automated prefixing support
      // https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting#readme
      "postcss-custom-properties": {
        preserve: false,
      },
      "postcss-custom-media": {}, // simular to scss resuable media queries
      "autoprefixer": {}, // added for robust automated prefixing
      // this supports newly released features in older browsers
      "postcss-preset-env": {
        autoprefixer: {
          grid: "autoplace",
          flexbox: "no-2009",
        },
        features: {
          "custom-properties": {
            preserve: true,
          },
          "nesting-rules": true,
          "custom-media-queries": true,
          "color-function": true,
          "oklab-function": true,
          "color-mix": true,
          "relative-color-syntax": true,
        },
        stage: 2, // 0:Aspirational(Experimental), 1:Experimental, 2:Allowable (Default), 3:Embraced, 4:Standardized
      },
      "postcss-pxtorem": {
        rootValue: 16,
        unitPrecision: 5,
        propList: ["*"],
        mediaQuery: false,
        minPixelValue: 0,
      },
      "postcss-focus": {},
    },
  },
  // buildDir: "./dist", // Useful to change for electron/capacitor builds
  app: {
    // rootId: "app", the one in the index.html
    // add in pages instead! WHY: TODO: https://nuxt.com/docs/getting-started/seo-meta#defaults
    head: {
      charset: "utf-8",
      viewport:
        "viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=3.0, user-scalable=yes",
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "anonymous",
        },
      ],
    },
  },
  hooks: {
    // ai ready: https://nuxtseo.com/docs/ai-ready/guides/llms-txt#hook
    // "ai-ready:llms-txt": (payload) => {
    //   payload.sections.push({
    //     title: 'Custom APIs',
    //     links: [{ title: 'Search', href: '/projects/train', description: 'Search endpoint' }]
    //   })
    //   payload.notes.push('Custom note')
    // },
    // to customize: https://nuxtseo.com/docs/ai-ready/guides/llms-txt#customizing-page-processing
    // "ai-ready:page:markdown": (ctx) => {
    //   // ctx: { route, markdown, title, description }
    //   ctx.markdown = `# ${ctx.title}\n\n${ctx.markdown}`
    // }
  },
  fonts: {
    devtools: isDebug,
    families: [
      { name: "Fira Code", weights: [400, 600, 700], global: true,
        src: [
          { url: '/fonts/fira-code-v27-latin-400.woff2', format: 'woff2' },
          { url: '/fonts/fira-code-v27-latin-600.woff2', format: 'woff2' },
          { url: '/fonts/fira-code-v27-latin-700.woff2', format: 'woff2' }
        ]
      },
      { name: "Cascadia Code", weights: [400, 700], global: true,
        src: [
          { url: '/fonts/cascadia-code/CascadiaCode-Regular.woff2', format: 'woff2' },
          { url: '/fonts/cascadia-code/CascadiaCode-Bold.woff2', format: 'woff2' }
        ]
      },
      { name: "IBM Plex Sans Arabic", weights: [400, 700], global: true,
        src: [
          { url: '/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Regular.woff2', format: 'woff2' },
          { url: '/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Bold.woff2', format: 'woff2' }
        ]
      }
    ],
    defaults: {
      fallbacks: {
        monospace: ['monospace'],
        'sans-serif': ['IBM Plex Sans Arabic', 'sans-serif']
      }
    },
    experimental: {
      processCSSVariables: true
    }
  },
  ogImage: {
    // https://nuxtseo.com/docs/og-image/api/config
    enabled: isSSR,
    debug: isDebug,
    defaults: {
      // https://nuxtseo.com/docs/og-image/guides/jpegs#best-practices
      extension: 'png',
      width: 1200,
      height: 600,
      emojis: 'noto',
      cacheMaxAgeSeconds: 60 * 60 * 24 * 3
    },
    // crashes docker building!
    // security: {
    //   strict: true,
    //   secret: process.env.NUXT_SECRET
    // },
    buildCache: true,
    // runtimeCacheStorage make it redis with our uri
    runtimeCacheStorage: 'redis',
    // https://nuxtseo.com/docs/og-image/guides/runtime-cache#quick-start

    fontSubsets: ['latin'],
    // Using IBM Plex Sans Arabic as it's more stable for OG images
    // fonts: [
    //   'Inter:400',
    //   'Inter:700',
    //   'IBM+Plex+Sans+Arabic:400',
    //   'IBM+Plex+Sans+Arabic:700',
    // ],
  },

  robots: {
    // https://nuxtseo.com/docs/robots/guides/robots-txt#parsed-robotstxt
    disallow: ["/contact/admin"],
    // The sitemap module automatically detects and generates sitemaps based on the site.url
    robotsTxt: isSSR,
    // https://nuxtseo.com/docs/robots/guides/ai-directives#programmatic-configuration
  },
  // https://nuxtseo.com/docs/schema-org/guides/setup-identity#when-should-i-use-person
  // this is important: https://unhead.unjs.io/docs/nuxt/schema-org/guides/core-concepts/nodes
  schemaOrg: {
    enabled: isSSR,
    reactive: true,
    // https://nuxtseo.com/docs/schema-org/guides/setup-identity#when-should-i-use-localbusiness
    // or even OnlineStore with: defineOrganization; read line above!
    identity: {
      type: "Person",
      name: "Bader Idris",
      image: "/imgs/meTwentyFour.jpg",
      description:
        "Full Stack Developer specializing in Vue, Nuxt, Nest.js, DevOps, GSAP, and Three.js.",
      url: "https://baderidris.com",
      sameAs: [
        "https://github.com/bader-idris",
        "https://linkedin.com/in/bader-idrees",
        "https://www.facebook.com/Bader.Idris.developer",
        "https://twitter.com/bader_idri8628"
      ],
      jobTitle: "Full Stack Developer",
      worksFor: {
        "@id": "https://baderidris.com/#organization",
        "@type": "Organization",
        name: "Bader Idris Portfolio",
        url: "https://baderidris.com",
      },
      logo: "/logo.svg",
    },
  },

  ...(!isDesktop) && {
    site: {
      // These automatically respect NUXT_SITE_URL and NUXT_SITE_NAME environment variables
      url: process.env.NUXT_SITE_URL || "https://baderidris.com",
      name: process.env.NUXT_SITE_NAME || "Bader Idris",
      description:
        "Full Stack Developer specializing in Vue, Nuxt, Node, DevOps, GSAP, and Three.js. Crafting high-performance, interactive web experiences.",
      defaultLocale: "en",
      indexable: isSSR,
    },
    sitemap: {
      enabled: isSSR,
      // in debugging with devtools, you can view raw sitemaps here:
      // url: /__sitemap__/debug.json
      // prerendered file: .output/public/__sitemap__/debug.json
  
      // we can customize UI:
      // https://nuxtseo.com/docs/sitemap/advanced/customising-ui#changing-the-columns
      xslColumns: [
        { label: 'URL', width: '50%' },
        { label: 'Last Modified', select: 'sitemap:lastmod', width: '25%' },
        { "label": "Last Updated", "width": "15%", "select": "concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)),concat(' ', substring(sitemap:lastmod,20,6)))" },
        { label: 'Hreflangs', select: 'count(xhtml:link)', width: '5%' },
        { "label": "Images", "width": "5%", "select": "count(image:image)" },
      ],
      xslTips: process.env.IS_DEBUGGING !== "false",
      debug: isDebug,
      credits: false,
      discoverImages: true, // default
      // strictNuxtContentPaths: true,
      // https://nuxtseo.com/docs/sitemap/api/config#autoi18n
      autoI18n: true,// make sure it uses my strategy: prefix_except_default
      // sitemaps: {
      //   // we can add chunks for big posts: https://nuxtseo.com/docs/sitemap/api/config#chunks
      //   posts: {
      //     sources: ['/api/v1/blog'],
      //     chunks: true, // Enable chunking
      //     chunkSize: 2500 // Use 2500 URLs per chunk
      //   },
      //   pages: {
      //     exclude: [
      //       '/api/v1/blog',
      //     ]
      //   },
      // },
      sitemaps: true,// we can do {} || boolean; https://nuxtseo.com/docs/sitemap/guides/multi-sitemaps#enabling-multiple-sitemaps
      // modify the chunk size if you need
      defaultSitemapsChunkSize: 2000, // default 1000
      // urls: async () => {
      // // avoid for large sites: https://nuxtseo.com/docs/sitemap/guides/dynamic-urls
      // // replace it with: sources: []
      //   const baseUrl = process.env.NUXT_SITE_URL || "https://baderidris.com";
      //   const staticRoutes = ["/", "/about", "/contact", "/projects", "/projects/train"];
  
      //   const routes = staticRoutes.map((route) => ({
      //     loc: `${baseUrl}${route}`,
      //     lastmod: new Date().toISOString(),
      //   }));
  
      //   try {
      //     // Dynamic blog posts from PostgreSQL
      //     // check this too: https://nuxtseo.com/docs/sitemap/advanced/loc-data#dynamic-lastmod-from-apis
      //     const response = await fetch(`${process.env.DOMAIN_NAME || 'http://localhost:3000'}/api/v1/blog?publishedOnly=true`);
      //     const result = await response.json();
      //     if (result && result.data) {
      //       result.data.forEach((post: any) => {
      //         routes.push({
      //           loc: `/blog/${post.slug}`,
      //           lastmod: post.updatedAt,
      //         });
      //       });
      //     }
      //   } catch (e) {
      //     console.warn('Sitemap dynamic fetch failed (expected during early build):', e.message);
      //   }
      
      //   return routes;
      // },
      exclude: [
        "/auth/callback",
        "/user/forgot-password",
        "/user/reset-password",
        "/user/unsubscribe",
        "/user/verify-email",
      ],
      // how could this image/video embedding be useful: https://nuxtseo.com/docs/sitemap/advanced/images-videos#sitemap-images
    },
    aiReady: {
      // https://nuxtseo.com/docs/ai-ready/api/config#enabled
      enabled: isSSR,
      debug: isDebug,
      contentSignal: isSSR ? {
        aiTrain: false,
        search: true,
        aiInput: true
      } : false,
      database: {
        type: 'sqlite',
      },
      // llmsTxt: {
      //   sections: [
      //     {
      //       title: 'API Reference',
      //       links: [
      //         { title: 'REST API', href: '/docs/api', description: 'API documentation' }
      //       ]
      //     }
      //   ],
      //   notes: '[open-source github repo](https://github.com/Bader-Idris/nuxt4-fullstack-portfolio)'
      // }
    },
  },

  // }),
  // ionic: {},
  // routeRules: {
  //   // here we can separately define ssr or csr for specific routes, that's amazing!
  //   // https://nuxt.com/docs/guide/concepts/rendering#route-rules
  //   // "/": { prerender: true },
  //   "/api/**": { cors: true }, // where to put in be
  // },
  runtimeConfig: {
    // ? publicly for client
    public: {
      // Expose desktop/electron flags so client plugins/middleware can
      // guard Electron-specific behaviour (e.g. skip ServiceWorker, skip
      // SSR-only redirects) without needing process.env access at runtime.
      isElectron: isElectron,
      isDesktop: isDesktop,
      isSSR: isSSR,
      siteUrl: siteUrl,
      originUrl: (isElectron || isCapacitor) ? (siteUrl || "http://localhost:3000") : siteUrl,
      socketUrl: process.env.SOCKET_URL || "ws://localhost:3000",
      isCapacitor: process.env.IS_CAPACITOR === "true",
      // for web-push pkg
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      facebookAppId: process.env.FACEBOOK_CLIENT_ID,
      // check https://www.npmjs.com/package/@capgo/capacitor-social-login#Google
      // iOSClientId: 'YOUR_IOS_CLIENT_ID',        // Required for iOS
      // iOSServerClientId: 'YOUR_WEB_CLIENT_ID',  // Required for iOS offline mode and server authorization (same as webClientId)

      // @ts-nocheck Doesn't work, how to silence public {} for this!
      ...(!isDesktop && !isCapacitor) && {
        i18n: {
          // ssr: process.env.NUXT_SSR !== "false",
          // check https://i18n.nuxtjs.org/docs/api/runtime-config#baseurl
          baseUrl: siteUrl,
          // critical to fix ugly warning: in env var file:
          // NUXT_PUBLIC_I18N_BASE_URL=https://baderidris.com
        },
      },
      scripts: {
        googleTagManager: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_GOOGLE_TAG_MANAGER_ID=<your-id>
          id: process.env.GOOGLE_TAG_MANAGER_ID,
        },
        googleAnalytics: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID=<your-id>
          id: process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID,
        },
        clarity: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_CLARITY_ID=<your-id>
          id: process.env.CLARITY_ID,
        },
      },
      // }
    },
    mailHost: process.env.MAIL_HOST,
    mailUser: process.env.MAIL_USER,
    mailPass: process.env.MAIL_PASS,
    mailFrom: "Bader Idris <contact@baderidris.com>",
    mailReplyTo: "Bader Idris <contact@baderidris.com>",
    jwtSecret: process.env.JWT_SECRET,
    jwtLifetime: process.env.JWT_LIFETIME || "1h",
    nodeEnv: process.env.NODE_ENV || "production",
    originUrl: process.env.DOMAIN_NAME || "http://localhost:3000",
    // mongoUri: process.env.MONGO_URI,
    // check https://console.cloud.google.com/auth/clients
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    facebookClientId: process.env.FACEBOOK_CLIENT_ID,
    facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    // for web-push pkg
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    contactEmail: process.env.CONTACT_EMAIL,
    redisUrl: process.env.REDIS_URL,
    fcmServiceAccount: process.env.FCM_SERVICE_ACCOUNT,
    firebaseRefreshToken: process.env.FIREBASE_REFRESH_TOKEN,
    firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL,
    apnKey: process.env.APN_KEY,
    apnKeyId: process.env.APN_KEY_ID,
    apnTeamId: process.env.APN_TEAM_ID,
    apnBundleId: process.env.APN_BUNDLE_ID,
  },
  content: {
    // check out content.config.ts file
    // Using better-sqlite3 instead of Node.js 22's native node:sqlite.
    // node:sqlite leaks into the Electron renderer bundle via Vite's lack of
    // tree-shaking in dev mode, causing "Dynamic require of 'tty'" errors on
    // /blog and /projects. better-sqlite3 is a stable native addon that stays
    // server-side via Nitro externals and works correctly in all environments.
    // experimental: { nativeSqlite: false },
    //   database: {
    //     type: "postgres",
    //     url: String(process.env.PSQL_URL),
    //   },
    // experimental: {
    //   // enable awesome search, see: https://content.nuxt.com/get-started/configuration#search
    //   search: {
    //     indexed: true,
    //   },
    // },
  },
  imports: {
    // ? to have auto-import from third party packages, modules do it already in often
    // presets: [
    //   {
    //     from: "vue-i18n",
    //     imports: ["useI18n"],
    //   },
    // ],
  },
  scripts: {
    registry: {
      googleAnalytics: {
        id: process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID,
        // have to install nuxtjs/partytown for this option,
        // but it stops promise crashes due to these 3rd parties
        partytown: false, // read this: https://scripts.nuxt.com/docs/guides/first-party#partytown-web-worker
        trigger: "onNuxtReady",
        proxy: false,
      },
      googleTagManager: {
        id: process.env.GOOGLE_TAG_MANAGER_ID,
        partytown: false, // same as googleAnalytics
        trigger: "onNuxtReady",
        proxy: false,
      }, // more robust with var for docker image building
      // ? check https://scripts.nuxt.com/scripts/tracking/google-tag-manager#loading-globally
      // googleAdsense: {
      //   client: process.env.GOOGLE_ADSENSE_ID || "", // AdSense Publisher ID
      //   autoAds: true, // Enable Auto Ads
      // },
      clarity: {
        id: process.env.CLARITY_ID,
        partytown: true,
        trigger: "manual", // Controlled manually in app.vue for privacy
      },
      // metaPixel: {
      //   id: process.env.META_PIXEL_ID,
      //   partytown: true,
      //   trigger: 'onNuxtReady',
      // }
    },
  },
});