# Capacitor Mobile App Setup Guide

This guide provides professional, step-by-step instructions for setting up the mobile version of your portfolio app using Capacitor 7/8, including social authentication with Google and Facebook.

## 1. Initial Repository Setup

If you are starting from scratch, ensure you have the required tools:

- **Node.js 20+** (Required for Capacitor 7/8)
- **pnpm** (preferred) or **npm**
- **Android Studio** (for Android)
- **Xcode 16+** (for iOS, requires a Mac)

### Installation Steps

```bash
# Install dependencies
pnpm install

# Create the environment file for Capacitor
cp .env.capacitor.example .env.capacitor
# Edit .env.capacitor with your production values (DOMAIN_NAME, Google Client IDs, etc.)

# Generate the static production build of your Nuxt app
# Nuxt 4/5 uses pnpm generate which creates .output/public
pnpm generate
```

## 2. Adding Mobile Platforms

Capacitor turns your static Nuxt build into a native mobile app.

```bash
# Add Android platform
npx cap add android

# Add iOS platform
npx cap add ios
```

## 3. Professional Social Login Configuration

We use `@capgo/capacitor-social-login` for a native experience.

### A. Google Cloud Console Setup

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project.
3.  **Create OAuth Client ID (Web Application)**:
    - This is your `webClientId`. You need this even for mobile apps to verify tokens on the server.
    - Add your production domain (`https://baderidris.com`) to "Authorized JavaScript origins".
4.  **Create OAuth Client ID (Android)**:
    - Package Name: `com.baderidris.portfolio` (match `capacitor.config.ts`)
    - SHA-1 Certificate Fingerprint: You must get this from your debug and release keystores using `keytool`.
      - **Debug Key (Local Development)**:
        ```bash
        keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
        ```
      - **Release Key (Production)**:
        ```bash
        keytool -list -v -keystore your-release-key.jks -alias your-alias
        ```

### Troubleshooting: `UNREGISTERED_ON_API_CONSOLE`

If you see this error in Android logs:

1.  **SHA-1 Mismatch**: The SHA-1 in the Google Console doesn't match the key used to build the app. Run the `keytool` command above on the exact machine/key you are using.
2.  **Package Name Mismatch**: Ensure `appId` in `capacitor.config.ts` is exactly `com.baderidris.portfolio`.
3.  **Missing Android Client ID**: You must have an "Android" type Client ID in the Google Console, even if you are using the "Web" Client ID in your code.
4.  **Google Services JSON**: Ensure you haven't forgotten to place `google-services.json` in `android/app/` if you are using Firebase (though `@capgo/capacitor-social-login` typically bridges via the Web Client ID).

### B. Facebook (Meta) for Developers Setup

1.  Go to [Meta for Developers](https://developers.facebook.com/).
2.  Create a new App (Type: Consumer or Business).
3.  Add "Facebook Login" product.
4.  **Android Settings**:
    - Add Package Name and Class Name (`com.baderidris.portfolio.MainActivity`).
    - Add Key Hashes (generated from your SHA-1).
5.  **iOS Settings**:
    - Add Bundle ID.

## 4. Production Domain & Capacitor Configuration

For production, we configure Capacitor to use your production domain as the internal hostname. This ensures that session cookies are shared seamlessly between the mobile WebView and your server without CORS hacks.

### `capacitor.config.ts` Configuration

The app is configured to read `DOMAIN_NAME` from your `.env` file:

```typescript
const domain =
  process.env.DOMAIN_NAME?.replace("https://", "") || "baderidris.com";

const config: CapacitorConfig = {
  // ...
  server: {
    hostname: domain,
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  // ...
};
```

### Syncing the App

Every time you change your frontend code or `capacitor.config.ts`, you must sync:

```bash
# Generate assets with the correct environment variables
npx nuxi generate --dotenv .env.capacitor

# Sync the assets to native projects
npx cap sync
```

## 5. Professional Production Checklist

- **SHA-1 Keys**: Ensure you have added both your **Debug** and **Release** SHA-1 keys to Google and Facebook consoles. If you don't add the Release key (from the `.jks` key you use to sign the APK), login will fail in production.
- **Server CORS**: Your server's CORS settings must allow `https://baderidris.com` and `capacitor://localhost`.
- **App Icon & Splash**: Use `@capacitor/assets` to generate professional icons.
  ```bash
  npx @capacitor/assets generate --android --ios
  ```

## 6. Building for Release

### Android

1.  Open Android Studio: `npx cap open android`
2.  Go to `Build` > `Generate Signed Bundle / APK`.
3.  Follow the wizard to create a keystore and sign your app.

### iOS

1.  Open Xcode: `npx cap open ios`
2.  Configure your "Signing & Capabilities".
3.  Set the "Archive" destination to "Any iOS Device".
4.  Go to `Product` > `Archive` to build for the App Store.