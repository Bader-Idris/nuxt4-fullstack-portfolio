// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  srcDir: "./client",
  alias: {
    "@": "./client",
    "@server": "./server",
  },
  serverDir: "./server",
  nitro: {
    // experimental: {
    //   websocket: true
    // },
  },
  css: [
    "~/assets/css/fontawesome.min.css",
    "~/assets/css/normalize.css",
    "~/assets/scss/main.scss",
  ],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "~/assets/scss/index.scss" as *;`,
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        paths: {
          "@/*": ["./client/*"],
          "@server/*": ["./server/*"],
        },
      },
    },
  },
  modules: [
    // "@vite-pwa/nuxt",
    "@nuxtjs/i18n",
    "@nuxtjs/seo",
    "@pinia/nuxt",
    "@nuxtjs/device",
    "@nuxt/eslint",
    "@nuxt/content",
    "@vueuse/nuxt",
    "@nuxt/image",
    // "@nuxtjs/ionic", // todo: useless with ssr, causing many issues!
  ],
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
    lazy: true,
    // seo: true,
    langDir: "../client/i18n/locales/",
    locales: [
      {
        code: "en",
        iso: "en-US",
        dir: "ltr",
        name: "English",
        //       file: "en.json",
        // files: ["en/**.json"], // did not work, it can handle js,ts,json files
        // https://i18n.nuxtjs.org/docs/guide/lazy-load-translations#basic-usage
        // TODO: 🥊 to be able to fetch from nuxt server 🥊
        // file: "en/**/*",
        file: "en-US.json",
      },
      // { code: 'ar', iso: 'ar-EG', file: 'ar.json' },
      {
        code: "ar",
        iso: "ar-PS",
        dir: "rtl",
        file: "ar-PS.json",
        name: "العربية",
      },
      {
        code: "es",
        iso: "es-ES",
        file: "es-ES.json",
        name: "Español",
      },
    ],
    defaultLocale: "en",
    defaultDirection: "ltr",

    strategy: "prefix_except_default",
    // strategy: "no_prefix",
    // vueI18n: "~/i18n/i18n.config.ts", // using custom path, default
    baseUrl: process.env.DOMAIN_NAME, // todo: check out, https://v8.i18n.nuxtjs.org/options/routing#baseurl
  },
  pinia: {
    storesDirs: [
      "./client/stores/**",
      // "./custom-folder/stores/**",
    ],
  },
  // image: {
  // // Options
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
  app: {
    // add in pages instead! WHY: TODO: https://nuxt.com/docs/getting-started/seo-meta#defaults
    head: {
      charset: "utf-8",
      viewport:
        "viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=3.0, user-scalable=yes",
      // htmlAttrs: {
      //   dir: "ltr",
      // },
    },
  },
  site: {
    url: "https://baderidris.com",
    name: "Bader Idris - Full-Stack Developer Portfolio",
    defaultLocale: "en",
  },
  // ionic: {},
  routeRules: {
    // here we can separately define ssr or csr for specific routes, that's amazing!
    // https://nuxt.com/docs/guide/concepts/rendering#route-rules
  },
  // TODO: we might need to set vars as this for client-side:
  runtimeConfig: {
    public: {
      originUrl: process.env.DOMAIN_NAME,
    },
    mailUser: process.env.MAIL_USER,
    mailPass: process.env.MAIL_PASS,
    jwtSecret: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    originUrl: process.env.DOMAIN_NAME,
    mongoUri: process.env.MONGO_URI,
  },
  // content: {}, check content.config.ts
});
