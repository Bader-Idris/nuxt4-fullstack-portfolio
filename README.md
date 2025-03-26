# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# bun, go to it's official site to get it on your machine, the
bun i
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# bun
bun run dev
```

## Production

Build the application for production:

```bash
# bun
bun run build
```

Locally preview production build:

```bash
# bun
bun run preview
```

heck out `b.dev.yml` file to get your full stack application up and running 

make sure to put your correct environment variables from `.env.example` in a new file named `.env`, then run `docker compose -f b.dev.yml up -d --build`

congratulations 🎉👏, you're running your own full stack production ready initial version project!

make sure to create another file for production with the instructions in the b.dev.yml file and its siblings ending in yml or yaml, and make sure to modify my domain name `baderidris.com` in these files to your own domain name!

## how to create android && ios apps

initially, you would add android directory in your project, use `bunx cap add android ios`

### how to add app icons easily

Modify the icons in /assets folder, as you want, then run `bunx capacitor-assets generate --assetPath "./assets" --ios --android`

> You can check their configs in the file `assets/requirements.md`

### How to build android app

You have to install [Android studio](https://developer.android.com/studio/install) on your machine, and add required environment variables for it!

> [!CAUTION]
> restart your shell subsession after adding the environment variables

some important env vars are: `ANDROID_HOME`, `CAPACITOR_ANDROID_STUDIO_PATH`

---
