import { defineNuxtConfig } from "nuxt/config";
import { definePerson } from "nuxt-schema-org/schema";
// for electron
import path, { dirname } from 'path';
import { fileURLToPath } from "url";
import glsl from "vite-plugin-glsl";
// import { writeFileSync } from 'node:fs'
// TODO: this crashes with: _nuxt/!~{00x}~-legacy.js:25:12: ERROR: Transforming destructuring to the configured target environment ("chrome64", "edge79", "es2020", "firefox67", "safari12" + 2 overrides) is not supported yet
// import legacy from '@vitejs/plugin-legacy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: process.env.NUXT_SSR !== "false",
  // read this for compatibility https://nitro.build/config#compatibilitydate
  compatibilityDate: "2026-05-14",
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  debug: process.env.IS_DEBUGGING !== "false",
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
    // appManifest: false,
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
    compressPublicAssets: {
      gzip: process.env.NUXT_GZIP !== 'false',
      // brotli: process.env.NUXT_BROTLI !== 'false'
      brotli: process.env.NUXT_GZIP !== 'false'
    },
    routeRules: {
      // this is critical for production version of electron, otherwise you'll lose index.html file
      ...((process.env.IS_ELECTRON === "true") && {
        "/": {
          prerender: true,
        },
      }),
      // Static assets and public files
      // "/_nuxt/**": {
      //   cache: {
      //     maxAge: 86400 * 30, // 30 days
      //     swr: true, // Investigate this one!
      //     staleMaxAge: 86400 * 7, // 1 week fallback
      //   },
      // },
      "/socket.io/**": {
        cache: false,
        prerender: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
      "/api/**": {
        cors: true,
        prerender: false,
        cache: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
        // TODO: create a middleware for cors, this only provides boolean value
      },
      "/contact/admin": {
        cache: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
      "/dashboard": {
        cache: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
      // '/projects/**': { redirect: '/:lang/projects/**' } // For i18n
    },
    // errorHandler: "./server/error-handler.ts", // does it work on prod properly??
    experimental: {
      websocket: true,
      // asyncContext: true,
    },
    externals: {
      // TODO: for code inside /server, but let's check if this could fix some bugs!
      inline: [],
      external: [
        'sharp',
        'ttf2woff2',
      ]
    },

    serveStatic: (process.env.NODE_ENV === "production" && process.env.NUXT_SSR !== "false" && process.env.IS_ELECTRON !== "true" && process.env.IS_CAPACITOR !== "true") ? false : true,
    // publicAssets: {
    //   baseURL: '_nuxt',
    //   dir: '.output/public/_nuxt',
    //   maxAge: 60 * 60 * 24 * 365, // 1 year (immutable hashed files)
    // },
  },

  css: ["~/assets/css/normalize.css", "~/assets/scss/main.scss"],
  vite: {
    optimizeDeps: {
      include: [
        '@tiptap/extension-code-block-lowlight',
        'lowlight',
        '@capacitor/core',
        '@capacitor/app',
        '@capacitor/status-bar',
        '@capacitor/app-launcher',
        '@capacitor/splash-screen',
        '@capacitor/toast',
        '@capacitor/network',
        '@capacitor/push-notifications',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@capacitor/keyboard',
        'capacitor-plugin-safe-area',
        '@capacitor/device',
        'vue3-toastify',
        '@capacitor/browser',
        'howler', // CJS
        'socket.io-client',
        '@rive-app/canvas', // CJS
        'gsap/all',
        '@capacitor/haptics',
        '@capacitor/local-notifications',
        'canvas-confetti',
        'sharp', // CJS
        '@unhead/schema-org/vue',
        'three/addons/loaders/GLTFLoader.js',
        'three/examples/jsm/loaders/DRACOLoader.js',
        'three/examples/jsm/loaders/GLTFLoader.js',
        'gsap',
        'three',
        'three/examples/jsm/controls/OrbitControls.js',
      ],
      exclude: ['@dimforge/rapier3d-compat']
    },
    plugins: [
            // legacy({
      //   targets: ['defaults', 'not IE 11'],
      //   // modernPolyfills: true,
      //   // renderLegacyChunks: true,
      // }),
      glsl({
        include: [
          '**/*.glsl',
          '**/*.vert',
          '**/*.frag',
          // '**/*.vs',
          // '**/*.fs',
        ],
        exclude: [],
        warnDuplicatedImports: true,
        defaultExtension: 'glsl',
      }) as any,
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "${path.join(__dirname, 'app/assets/scss/index.scss').replace(/\\/g, '/')}" as *;`,
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
    build: {
      sourcemap: 'hidden' // test if this hides: #14 7.356  WARN  
      // [plugin nuxt: components - loader]Sourcemap is likely to be incorrect: a plugin(nuxt: components- loader) was used to transform files,
      // but didn't generate a sourcemap for the transformation. Consult the plugin documentation for help (x25)
    }
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
    ...(process.env.IS_ELECTRON === "true" ? ["nuxt-electron"] : []),
    "@nuxtjs/device",
    "@nuxtjs/seo",
    "nuxt-skew-protection",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/image",
    "@nuxt/icon",
    "@nuxt/content",
    "nuxt-tiptap-editor",
    "@nuxt/eslint",
    "@nuxt/scripts",
    "@nuxt/eslint",
    "v-gsap-nuxt",
    // "@teages/nuxt-legacy", // Removed: using @vitejs/plugin-legacy directly in vite config
    // "@nuxtjs/ionic", // todo: useless with ssr, causing many issues!
  ],
  // skewProtection: {
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
  // },
  ...(process.env.IS_ELECTRON === "true" && {
    router: {
      options: {
        hashMode: true, // This helps with Electron file path issues
      },
    },
    app: {
      // TODO: check if it was a bun error or something!!
      baseURL: "./", // Needed for proper resource loading in Electron
      // buildAssetsDir: '/_nuxt/', // Ensures asset paths are correct
    },
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
                external: [
                  "node:sqlite",
                  "fsevents",
                  "sharp",
                ],
              },
              outDir: 'dist-electron/main',
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
                '~/': path.join(__dirname, 'app/'),
                "@/": path.join(__dirname, "app/"),
                '@server/': path.join(__dirname, 'server/'),
              },
            },
          },
        },
        {
          entry: 'app/electron/preload/index.ts',
          vite: {
            build: {
              outDir: 'dist-electron/preload'
            }
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
      disableDefaultOptions: process.env.NODE_ENV === 'development',
      // disableDefaultOptions: true,

      // Polyfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {},
    },
  }),
  tiptap: {
    prefix: 'Tiptap', //prefix for Tiptap imports, composables not included
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
  i18n: {
    langDir: "../app/i18n/locales/",
    locales: [
      {
        code: "en",
        iso: "en-US", // check if deprecated
        dir: "ltr",
        language: 'en-US',
        // files: ["en/**.json"], // did not work, it can handle js,ts,json files
        // https://i18n.nuxtjs.org/docs/guide/lazy-load-translations#basic-usage
        // TODO: 🥊 to be able to fetch from nuxt server 🥊
        file: "en-US.json",
        name: "English",
        isCatchallLocale: true // This one will be used as catchall locale
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
      "postcss-flexbugs-fixes": {},
      "postcss-preset-env": {
        autoprefixer: {
          grid: "autoplace",
          flexbox: "no-2009",
        },
        features: {
          "custom-properties": false,
          "nesting-rules": true,
        },
        stage: 3,
      },
      "postcss-pxtorem": {
        rootValue: 16,
        unitPrecision: 5,
        propList: ["*"],
        mediaQuery: false,
        minPixelValue: 0,
      },
      "postcss-focus": {},
      "postcss-custom-media": {},
      "postcss-nesting": {},
      "postcss-custom-properties": {
        preserve: false, // Set to false to replace variables with their values
      },
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
    },
  },
  ogImage: {
    // enabled: process.env.NUXT_SSR !== "false" && process.env.IS_ELECTRON !== "true",
    enabled: process.env.NUXT_SSR !== "false",
  },
  // ...(process.env.IS_ELECTRON === "false") && {
  sitemap: {
    enabled: process.env.IS_ELECTRON !== "true",
    // discoverImages: true,
  },
  // },
  // ...(process.env.NUXT_GZIP !== "false" && { // if we don't add the falsy value, it will be true
  site: {
    url: String(process.env.DOMAIN_NAME || "http://localhost:3000"),
    name: "Bader Idris", // ! Causes stupid duplicate head.title
    description: "Full Stack Developer specializing in Vue, Nuxt, Node, DevOps, GSAP, and Three.js. Crafting high-performance, interactive web experiences.",
    defaultLocale: "en",
    indexable: process.env.IS_ELECTRON !== "true"
  },
  ...((process.env.IS_ELECTRON === "false") && {
    schemaOrg: {
      identity: definePerson({
        name: "Bader Idris",
        image: "/imgs/meTwentyFour.jpg",
        description: "Full Stack Developer specializing in Vue, Nuxt, Node, DevOps, GSAP, and Three.js.",
        url: "https://baderidris.com",
        sameAs: [
            "https://github.com/bader-idris",
            "https://linkedin.com/in/bader-idrees",
            "https://www.facebook.com/Bader.Idris.developer",
        ],
        jobTitle: "Full Stack Developer",
        worksFor: {
          "@id": "https://baderidris.com/#organization",
          "@type": "Organization",
          name: "Bader Idris Portfolio",
          url: "https://baderidris.com"
        }
      }),
    },
  }),
  robots: {
    disallow: ["/contact/admin"],
    sitemap: [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/__sitemap__/en.xml",
      "/__sitemap__/ar.xml",
      "/__sitemap__/es.xml",
    ],
    robotsTxt: process.env.IS_ELECTRON !== "true"
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
      originUrl: process.env.DOMAIN_NAME || "http://localhost:3000",
      socketUrl: process.env.SOCKET_URL || "ws://localhost:3000",
      isCapacitor: process.env.IS_CAPACITOR === "true",
      // for web-push pkg
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      // check https://www.npmjs.com/package/@capgo/capacitor-social-login#Google
      // iOSClientId: 'YOUR_IOS_CLIENT_ID',        // Required for iOS  
      // iOSServerClientId: 'YOUR_WEB_CLIENT_ID',  // Required for iOS offline mode and server authorization (same as webClientId)

      // if not electron
      // ...(process.env.IS_ELECTRON === "false") && {
      i18n: {
        // ssr: process.env.NUXT_SSR !== "false",
        baseUrl: process.env.IS_ELECTRON === "true" ? "./" : process.env.DOMAIN_NAME,
        // baseUrl: process.env.DOMAIN_NAME, // check https://i18n.nuxtjs.org/docs/api/runtime-config#baseurl
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
        }
      }
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
  content: { // check out content.config.ts file
    experimental: { nativeSqlite: true },
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
        partytown: true,
        trigger: 'onNuxtReady'
      },
      googleTagManager: {
        id: process.env.GOOGLE_TAG_MANAGER_ID,
        partytown: true,
        trigger: 'onNuxtReady'
      }, // more robust with var for docker image building
      // ? check https://scripts.nuxt.com/scripts/tracking/google-tag-manager#loading-globally
      // googleAdsense: {
      //   client: process.env.GOOGLE_ADSENSE_ID || "", // AdSense Publisher ID
      //   autoAds: true, // Enable Auto Ads
      // },
      clarity: {
        id: process.env.CLARITY_ID,
        partytown: true,
        trigger: 'onNuxtReady',
      },
      // metaPixel: {
      //   id: process.env.META_PIXEL_ID,
      //   partytown: true,
      //   trigger: 'onNuxtReady',
      // }
      
    },
  },
});