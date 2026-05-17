# Production TLS Testing Guide

This guide explains how to test the production build with TLS (HTTPS) locally before deploying to the live domain `baderidris.com`.

## 1. Why Test TLS Locally?

- **Mixed Content Errors:** Ensure no assets (like 3D models or textures) are being loaded over HTTP when the site is HTTPS.
- **Service Workers / PWA:** Many modern web features (and some compression-aware loaders) require a secure context.
- **Protocol-specific Bugs:** Some `fetch` and `promise` issues only appear under HTTP/2 or HTTPS.

## 2. Local TLS Simulation with Docker

To simulate the production environment with TLS, you can use a local proxy or self-signed certificates.

### Option A: Using `mkcert` (Recommended)

1. Install `mkcert` (e.g., `brew install mkcert` or `sudo apt install mkcert`).
2. Generate certificates for localhost:
   ```bash
   mkcert -install
   mkcert localhost
   ```
3. Update your `compose.prod.test.yaml` to mount these certificates into an Nginx container.

### Option B: Node.js HTTPS Server

You can run the built `.output` using a simple HTTPS wrapper:

```javascript
// test-https.mjs
import https from "https";
import fs from "fs";
import { handler } from "./.output/server/index.mjs";

const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

https.createServer(options, handler).listen(443, () => {
  console.log("Production preview running at https://localhost");
});
```

## 3. Verifying Asset Compression under TLS

Once running under HTTPS, open Chrome DevTools (F12) and check the **Network Tab**:

1.  **Protocol Column:** Ensure it says `h2` (HTTP/2).
2.  **GLB Files:** Filter by `.glb`. You should see requests for `-compressed.glb`.
3.  **Textures:** Filter by `.ktx2`. Ensure the browser is receiving them correctly.
4.  **Content-Type:** Verify that `.ktx2` files are served with `image/ktx2` and `.woff2` with `font/woff2`.

## 4. Nuxt Production Testing Command

Run the following to build and preview locally:

```bash
# 1. Build for production
bun run build

# 2. Preview (Nuxt default is HTTP)
bun run preview
```

To test with TLS, use a tool like `cloudflared` or `localtunnel` for a quick secure tunnel, or use the Nginx Docker setup.

## 5. Dockerized Production Robustness

The system is designed to be "fail-safe":

- **Asset Loading:** Loaders in components handle missing assets gracefully using non-blocking promises.
- **App Manifest Errors (500/ENOENT):** If you see errors for `/_nuxt/builds/meta/*.json`, verify `experimental.appManifest` settings in `nuxt.config.ts`.
- **Caching Logic:** We have configured `routeRules` to prevent caching of build-specific metadata, ensuring clients always fetch the latest routing information.

## 6. Pre-Nginx Checklist for baderidris.com

- [ ] Verify `public/fonts/` contains `.woff2` files and CSS references are updated.
- [ ] Ensure the Docker container has necessary libraries installed for SSR.
- [ ] Test the `/api` routes under HTTPS to ensure no CORS or redirect loops.