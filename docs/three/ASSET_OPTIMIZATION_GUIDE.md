# Asset Optimization Guide

This guide explains how to use the automated compression pipeline to optimize 3D models, textures, and fonts for production.

## 1. Automated Optimization Script

The project includes a specialized script at `scripts/compress.ts` that handles the heavy lifting of asset optimization. It is automatically triggered during the build process but can also be run manually.

### How to Run
```bash
# Run the full optimization suite
bun compress
```

### What it does:
1.  **3D Models (`.glb`)**: 
    *   Scans for all GLB files (excluding those already compressed).
    *   Applies **Draco Mesh Compression** to reduce geometry size.
    *   Attempts **KTX2 (UASTC)** texture encoding for GPU acceleration.
    *   Outputs optimized files as `[name]-compressed.glb`.
2.  **Textures (`.png`, `.jpg`)**:
    *   Converts standalone textures to **KTX2** format.
    *   Uses specialized high-quality settings for `terrain.png` (UASTC + Mipmaps).
    *   Converts UI-specific images to **WebP** via Sharp.
3.  **Fonts (`.ttf`)**:
    *   Converts TTF fonts to **WOFF2**.
    *   Purges legacy formats (`.eot`, `.svg`, `.woff`, `.ttf`) to keep the build lean.
    *   **Automatically updates CSS** files to point to the new WOFF2 files.

---

## 2. Integration with Build Pipeline

Optimization is integrated into the following `package.json` scripts:
- `bun run build`
- `bun run generate`
- `bun run build:electron`

This ensures that production bundles always contain the smallest, most efficient assets without affecting your original files in development.

---

## 3. GPU Texture Compression (KTX2)

### Why KTX2?
Standard formats like PNG/JPG are decompressed in VRAM. A 1024x1024 PNG can take up 4MB of GPU memory regardless of its file size on disk. **KTX2 (Basis Universal)** stays compressed even inside the GPU memory, reducing VRAM usage by up to 6-8x.

### Prerequisites for KTX2 Encoding
The script uses `gltf-transform` and `toktx`. To enable KTX2 compression during the script execution, ensure you have the KTX-Software binaries installed on your system:
- **Ubuntu/Debian**: `sudo apt install ktx-tools`
- **MacOS**: `brew install ktx-software`

If these are missing, the script will safely skip KTX2 encoding and stick to Draco/WebP optimization.

---

## 4. Using Optimized Assets in Code

### Three.js Loaders
The `Terrain` class in `app/composables/threeD/useTerrain.ts` is already configured to handle these optimized assets.

```typescript
// It automatically detects production environment:
const targetGlb = isProd ? glbUrl.replace('.glb', '-compressed.glb') : glbUrl;

// It uses KTX2Loader for GPU textures:
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('/assets/three/basis/');
loader.setKTX2Loader(ktx2Loader);
```

### Font CSS
You don't need to manually update your CSS. The script transforms:
```css
/* From this */
src: url('font.ttf') format('truetype'), url('font.woff2') format('woff2');
/* To this */
src: url('font.woff2') format('woff2');
```

---

## 5. Summary Checklist for New Assets
1.  Place your high-quality `.glb` or `.png` in the `public/` directory.
2.  Run `bun run build`.
3.  The system will generate the `-compressed.glb` version.
4.  Commit **both** the original (for dev) and the compressed version (for prod).
