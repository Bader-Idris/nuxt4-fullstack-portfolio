# Image Conversion & Optimization Guide

This document outlines the standard commands and scripts used to convert and optimize images in the portfolio. It covers raster-to-WebP conversion (for photos/illustrations) and rules for vector graphics (SVGs).

---

## 1. Converting Raster Images to WebP (e.g., Profile Picture)

For photos (such as `meTwentyFour.jpg`), we convert them to `.webp` using **Sharp** to keep the bundle small while maintaining high clarity.

To ensure the converted image appears sharp and is not degraded, we use a high-quality preset (`quality: 95` and maximum compression `effort: 6`).

### Node.js Script Implementation

Create a script (e.g., `scripts/convert-image.js` or run via `node` directly):

```javascript
const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../public/imgs/meTwentyFour.jpg');
const outputPath = path.join(__dirname, '../public/imgs/meTwentyFour.webp');

sharp(inputPath)
  .webp({ 
    quality: 95,      // Higher quality to prevent pixelation/blurriness
    effort: 6,        // Maximum compression CPU effort
    lossless: false   // Set to true only if lossless compression is strictly required
  })
  .toFile(outputPath)
  .then(() => console.log('WebP generated successfully with high resolution (quality: 95)'))
  .catch(err => console.error('Error generating WebP:', err));
```

To run this script:
```bash
node scripts/convert-image.js
```

### CLI Command (using `sharp-cli`)

If you have `sharp-cli` installed globally or locally:

```bash
npx sharp -i ./public/imgs/meTwentyFour.jpg -o ./public/imgs/meTwentyFour.webp webp --quality 95 --effort 6
```

---

## 2. Rules for Vector Graphics (SVGs)

Vector graphics (such as UI icons and folder icons under `public/imgs/svgs/`) **must remain in `.svg` format** rather than being converted to `.webp`.

### Why SVGs are Kept Native:
1. **Infinite Resolution**: SVGs are defined by math path coordinates, meaning the browser renders them dynamically at the perfect resolution of the client display (including Retina, 4K, and mobile screens).
2. **No Blurriness**: Converting SVGs to WebP rasterizes them into pixels, leading to blurriness, pixelation, and artifacts when scaled or viewed on high-DPI screens.
3. **Optimized Size**: SVG files for icons are usually under 1KB, which is already smaller than or equivalent to a raster WebP.

**Do not process or convert files inside `public/imgs/svgs/` to WebP.**
Use them directly in components:
```vue
<img src="/imgs/svgs/shell.svg" alt="shell" />
```

---

## 3. Pre-existing Asset Pipelines

We also have a global asset optimization script:
* **Location**: `scripts/compress.ts`
* **Purpose**: Automatically compresses models (`.glb`), optimizes textures, and converts fonts.
