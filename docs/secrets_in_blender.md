# secret1

Found how Bruno professionally handled grass/water/slabs/sand!

he uses node wrangler to click: `ctrl+shift+LMB` after setting each one separately in `shading`, then start painting on terrain in `texture painting`, then saving that standalone image with `alt+s`, now it's beautiful!

and for `terrain.png`, he renders it for coloring the project!

## Optimization Secrets

To keep the project smooth:

1.  **Run `bun compress`**: This handles Draco compression and WOFF2 font conversion.
2.  **GPU Textures**: Use KTX2/UASTC for the terrain splat map to save VRAM.
3.  **Font Purging**: The compression script automatically removes legacy font formats and updates the CSS to use only WOFF2.