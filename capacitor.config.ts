/// <reference types="@capacitor/background-runner" />

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: "com.baderidris.portfolio",
  appName: "Portfolio",
  webDir: "./.output/public",
  loggingBehavior: "production",
  // server: {
  //   hostname: 'localhost', // Default hostname used by Capacitor
  //   androidScheme: 'https', // Ensures HTTPS for Android WebView
  //   iosScheme: 'capacitor', // Ensures iOS uses 'capacitor' scheme
  //   cleartext: true // Allows HTTP (non-secure) communication in dev mode. Disable in production!
  // },
  plugins: {
    // docs: https://github.com/capacitor-community/sqlite
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      iosIsEncryption: true,
      iosKeychainPrefix: "vue-sqlite-portfolio",
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: "Biometric login for capacitor sqlite",
        androidIsEncryption: true,
        androidBiometric: {
          biometricAuth: false,
          biometricTitle: "Biometric login for capacitor sqlite",
          biometricSubTitle: "Log in using your biometric",
        },
        electronIsEncryption: true,
        electronWindowsLocation: "C:\\ProgramData\\CapacitorDatabases",
        electronMacLocation: "/Volumes/Development_Lacie/Development/Databases",
        electronLinuxLocation: "Databases",
      },
    },
    LocalNotifications: {
      // https://capacitorjs.com/docs/apis/local-notifications
      smallIcon: "icon.png", // Reference to Android's `android/app/src/main/res/drawable/` folder (Required) and simple monochrome icon
      iconColor: "#88888849", // Color of the small icon (Android)
      sound: "default", // android defaults 👆/src/raw
      // vibrate: true // not existing
    },
    PushNotifications: {
      // https://capacitorjs.com/docs/apis/push-notifications
      presentationOptions: ["badge", "sound", "alert"],
      /* what does these do?
        ionic g service service/fcm
        ionic g page page/details
        simon Grimm, added both after setting the push apis with firebase

      */
    },

    SplashScreen: {
      // need to use it with this package, @capacitor/assets check it at
      // https://capacitorjs.com/docs/guides/splash-screens-and-icons

      // TODO: bun i --save-dev cordova-plugin-lottie-splashscreen
      /* create lottie file then
        get a lottie file from the https://lottiefiles.com
        Found this example https://lottiefiles.com/free-animation/splash-screen-8Zo2RyAnUd
        ? these are animated splash screens

        launchautohide: true,
        launchshowduration: 0,
        ! outside splashScreen, and outside plugins, create
        cordova: {
          preferences: {
          TODO: good set of cordova into cap is: ionicframework.com/docs/native/lottie-splash-screen
            ? here we can add what's set for the pkg we installed
            only sync to apply changes, npx cap sync, and when changing dist codes use: ionic build && npx cap sync
            ! sometimes you'll find stupid conflics, it's better to use manual code for ios; the androind solution requires deleting the androind/app/src/main/res/splash dir
            ! and remove <item name="android:background">@drawable/splash</item> from styles.xml file
            ! our new configs will be in the xml/config.xml file
            ? just watch Simon, here: https://www.youtube.com/watch?v=JfX7pBq1YG4

            LottieFullScreen: true,
            LottieHideAfterAnimationEnd: true,
            LottieAnimationLocationLight: "@/assets/lottieAnimationFile.json", // the installed file from lottie website, in native apps, it'll be in public dir
          }
        }

      */
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 3000,
      backgroundColor: "#FFFFFF00",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,

      // for lottie instead of above settings:
      // launchautohide: true,
      // launchshowduration: 0
    },
    // cordova: {
    //   // we'll override splash screen with our own lottie file
    //   preferences: {
    //     LottieFullScreen: true,
    //     LottieHideAfterAnimationEnd: true,
    //     LottieAnimationLocationLight: '@/assets/lottieAnimationFile.json'
    //   }
    // },

    // ! these two old packages are causing crash in building android app
    // barcode-scanner
    // inappbrowser

    // BackgroundRunner: {
    // useful with long-running tasks, and able to wake the app
    // and can wake it for push/local notifications!
    // https://capacitorjs.com/docs/apis/background-runner
    // TODO: this package, only by installing it, requires adding some lines to android/ios configs
    // TODO: or it'll crash the building process, especially in Android. flatDir bug
    // android/app/build.gradle
    // },
    // BarcodeScanner: {
    // not only barcode but also QR code ⏹️
    // https://capacitorjs.com/docs/apis/barcode-scanner
    // },
    ActionSheet: {
      // the card that comes from the bottom of the screen.
      // check out https://ionicframework.com/docs/api/action-sheet
    },
    App: {
      // handles app state, isOpen, isClosed, to interact with foreground/background services
      // as fetching data in background processing
      // https://capacitorjs.com/docs/apis/app
    },
    AppLauncher: {
      // useful with preloaded content to be used in Fb or payment services, to ease UX
      // https://capacitorjs.com/docs/apis/app-launcher
    },
    Browser: {
      // used in my AppLink comp, handles in-app browsers, useful with oAuth
      // https://capacitorjs.com/docs/apis/browser
      // TODO: check deep linking to get users via outer links, to our installed app on their devices
      // https://capacitorjs.com/docs/guides/deep-links#deep-link-routing-using-the-capacitor-app-api
      // if not installed, it'll use our web app!
    },
    Camera: {
      // https://capacitorjs.com/docs/apis/camera
    },
    Clipboard: {
      // can handle copied images to clipboard
      // https://capacitorjs.com/docs/apis/clipboard
    },
    // CapacitorCookies: {
    // enabled: true // defaults to false
    // },
    // Device: {
    // useful with device info as getBatteryInfo(), getLanguageCode(), platform
    // https://capacitorjs.com/docs/apis/device
    // I use it in main.ts
    // },
    // Dialog: {
    // for alerts, confirmations, and input prompts
    // https://capacitorjs.com/docs/apis/dialog
    // },
    // Filesystem: {
    // big topic, https://capacitorjs.com/docs/apis/filesystem
    // },
    // Geolocation: {
    // speed can be tracked along side with GPS data
    // https://capacitorjs.com/docs/apis/geolocation
    // },
    // GoogleMaps: {
    //   https://capacitorjs.com/docs/apis/google-maps
    // }
    // Haptics: {
    // very useful for game interactions and teaching lessons
    // can get progress info and vibration patterns
    // https://capacitorjs.com/docs/apis/haptics
    // },
    CapacitorHttp: {
      // ! very important, post method gets converted to options of not set
      // to handle http on mobiles
      // https://capacitorjs.com/docs/apis/http
      enabled: true, // defaults to false
    },
    // InAppBrowser: {
    // useful with payment gateways or terms and conditions
    // appears more powerful than browser plugin
    // https://capacitorjs.com/docs/apis/inappbrowser
    // },
    Keyboard: {
      // Can show/hide user keyboard through it
      // https://capacitorjs.com/docs/apis/keyboard
      // TODO: check how to do language switching, Duolingo uses it
    },
    // Motion: {
    // implemented using Web APIs. try it with buttons
    // https://capacitorjs.com/docs/apis/motion
    // },
    // Network: {
    // checking net status and connectivity
    // https://capacitorjs.com/docs/apis/network
    // },
    // Preferences: {
    // used on behalf of local storage on mobiles, because localStorage could be cleaned via OSs
    // for complex tasks, use Sqlite instead
    // https://capacitorjs.com/docs/apis/preferences
    // },
    // ScreenOrientation: {
    // https://capacitorjs.com/docs/apis/screen-orientation
    // },
    // ScreenReader: {
    // simple TTS on mobiles
    // https://capacitorjs.com/docs/apis/screen-reader
    // },
    Share: {
      // some android files require it to be cached in. check
      // https://capacitorjs.com/docs/apis/share
    },
    StatusBar: {
      style: "DARK", // Default style (optional)
      backgroundColor: "#01080E", // Default background color (optional)
      overlay: true, // Whether the status bar should overlay the webview (optional)
      // can hide top status bar, but not fully implemented as native
      // is there any workaround?
      // https://capacitorjs.com/docs/apis/status-bar
    },
    // TextZoom: {
    // I believe using em instead of px is better than this, but try them
    // https://capacitorjs.com/docs/apis/text-zoom
    // },
    // Toast: {
    // I think it's useless
    // }
  },
};

export default config
