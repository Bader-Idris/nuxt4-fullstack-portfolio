# info

It's important to check the [docs](https://github.com/ionic-team/capacitor-assets) if you're stuck!

```tree
assets/
├── icon-only.png
├── icon-foreground.png
├── icon-background.png
├── splash.png
└── splash-dark.png
```

Icon files should be at least 1024px x 1024px.
Splash screen files should be at least 2732px x 2732px.
The format can be jpg or png.

then run

```sh
$ bunx capacitor-assets generate --assetPath "./assets" --ios --android # it's the default path, but I love to be explicit, for future reference
# also has flags --ios, --android or --pwa.
```

## pwa requires you to have a manifest file, you can specify its place with this flag: --pwaManifestPath