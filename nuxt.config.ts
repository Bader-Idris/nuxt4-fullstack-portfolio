import { definePerson } from "nuxt-schema-org/schema";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: process.env.NUXT_SSR !== "false",
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  srcDir: "./client",
  alias: {
    "@": "./client",
    "@server": "./server",
  },
  serverDir: "./server",
  nitro: {
    compressPublicAssets: process.env.NUXT_GZIP !== "false",
    routeRules: {
      "/:slug(?!api/**).*": {
        cache: {
          maxAge: 28800,
          swr: true,
        },
        headers: {
          "Cache-Control": "public, max-age=28800",
          // ? I added the security headers in nginx
        },
      },
      "/api/**": {
        cors: true,
        prerender: false,
        // TODO: create a middleware for cors, this only provides boolean value
      },
      "/contact/admin": {
        cache: false,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    },
    // errorHandler: "./server/error-handler.ts", // does it work on prod properly??
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
    "@nuxtjs/device",
    "@nuxtjs/seo",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/image",
    "@nuxt/icon",
    "@nuxt/content",
    "@nuxt/eslint",
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
        // files: ["en/**.json"], // did not work, it can handle js,ts,json files
        // https://i18n.nuxtjs.org/docs/guide/lazy-load-translations#basic-usage
        // TODO: 🥊 to be able to fetch from nuxt server 🥊
        file: "en-US.json",
        name: "English",
      },
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
        dir: "ltr",
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
  image: {
    provider: "ipx",
    format: ["webp"],
  },
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
      // meta: [{}],
      link: [
        {
          rel: "icon",
          type: "image/x-icon",
          sizes: "48x48",
          href: "/favicon.ico",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16x16.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        {
          rel: "apple-touch-icon",
          type: "image/png",
          // sizes:
          href: "/apple-touch-icon.png",
        },
        {
          rel: "icon",
          type: "image/webp",
          sizes: "192x192",
          href: "/icon-192.webp",
        },
        {
          rel: "icon",
          type: "image/webp",
          sizes: "128x128",
          href: "/icon-128.webp",
        },
      ],
    },
  },
  site: {
    url: "https://baderidris.com",
    name: "Bader Idris - Full-Stack Developer Portfolio",
    defaultLocale: "en",
  },
  schemaOrg: {
    // or defineOrganization, TODO: check the docs: https://nuxtseo.com/docs/schema-org/guides/setup-identity#organization
    identity: definePerson({
      name: "Bader Idris",
      image: "/imgs/me_2024-03-13.jpg",
      description: "Full stack developer",
      url: "baderidris.com",
      sameAs: [
        "https://www.facebook.com/Bader.Idris.developer",
        "https://github.com/bader-idris",
      ],
    }),
  },
  robots: {
    disallow: ["/contact/admin"],
    sitemap: [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/__sitemap__/en-US.xml",
      "/__sitemap__/ar-PS.xml",
      "/__sitemap__/es-ES.xml",
    ],
  },
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
      originUrl: process.env.DOMAIN_NAME,
    },
    // ? secretly for server
    mailUser: process.env.MAIL_USER,
    mailPass: process.env.MAIL_PASS,
    mailFrom: "Bader Idris <contact@baderidris.com>",
    mailReplyTo: "Bader Idris <contact@baderidris.com>",
    jwtSecret: process.env.JWT_SECRET,
    jwtLifetime: process.env.JWT_LIFETIME || "1h",
    nodeEnv: process.env.NODE_ENV || "production",
    originUrl: process.env.DOMAIN_NAME,
    // mongoUri: process.env.MONGO_URI,
  },
  // content: {}, check content.config.ts
  imports: {
    // ? to have auto-import from third party packages, modules do it already in often
    // presets: [
    //   {
    //     from: "vue-i18n",
    //     imports: ["useI18n"],
    //   },
    // ],
  },
});