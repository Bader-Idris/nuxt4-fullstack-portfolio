# Ambient Occlusion (AO) Guide: Blender to Three.js

Ambient Occlusion adds depth and realism by darkening crevices and areas where light is naturally blocked. This guide covers **Baked AO Maps** (for performance) and **Screen-Space AO** (for dynamic depth).

---

## 1. Baked AO Maps (Best for Performance)

In PBR workflows, AO is a separate grayscale texture. Three.js `MeshStandardMaterial` uses this map to darken ambient/indirect light.

### A. The UV2 Requirement (Critical)

Three.js standard materials expect the `aoMap` to use the **second UV set (UV2)**.

- **Why?** This allows you to use tiled textures (bricks, wood) on UV1 while having a unique, non-overlapping AO map on UV2.
- **Blender Setup:**
  1. Create a second UV Map in the `Data` tab.
  2. Unwrap your model specifically for AO (non-overlapping).
  3. Ensure the `aoMap` is baked using this UV set.

### B. Blender Baking Workflow

1.  **Render Engine:** Switch to `Cycles`.
2.  **Bake Settings:** Select `Ambient Occlusion`.
3.  **Setup:** Create a new Image Texture node (not connected to anything) and select your second UV set.
4.  **Bake:** Click `Bake`. Save the resulting grayscale image.

### C. Three.js Implementation

When loading a GLB, you must ensure UV2 is present. If your exporter didn't handle it, you can copy UV1 to UV2 (though unique unwrapping is better).

```typescript
mesh.traverse((child) => {
  if (child.isMesh) {
    const geometry = child.geometry;
    // If no UV2 exists, copy UV1 (fallback)
    if (!geometry.attributes.uv2) {
      geometry.setAttribute("uv2", geometry.attributes.uv.clone());
    }

    child.material.aoMap = yourAOTexture;
    child.material.aoMapIntensity = 1.0; // Tweak for darkness
  }
});
```

---

## 2. Screen-Space Ambient Occlusion (SSAO)

SSAO is a post-processing effect that calculates occlusion in real-time based on the depth buffer. Best for scenes with dynamic objects where baking is impossible.

### A. Implementation (EffectComposer)

```typescript
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const ssaoPass = new SSAOPass(scene, camera, width, height);
ssaoPass.kernelRadius = 16;
ssaoPass.minDistance = 0.005;
ssaoPass.maxDistance = 0.1;
composer.addPass(ssaoPass);
```

### B. Performance Note

SSAO is **expensive** for mobile devices. For the locomotive project, **Baked AO Maps** are highly recommended over SSAO to maintain a high frame rate.

---

## 3. Best Practices (Professional Standard)

- **Don't Bake into Albedo:** In a professional PBR workflow, avoid multiplying AO directly into the base color (Albedo) texture. The engine should handle AO separately so it doesn't darken areas that are hit by direct sunlight.
- **Channel Packing:** To save memory, pack your AO into the **Red channel** of an "ORM" texture (Occlusion, Roughness, Metalness).
  - Red = Ambient Occlusion
  - Green = Roughness
  - Blue = Metalness
- **Denoising:** When baking in Blender, use at least 128-256 samples and enable Denoising for a smooth AO map.
- **Distance (Ray Distance):** In Blender's Bake settings, adjust the `Ray Distance`. A value too high will darken the whole model; too low will miss the crevices. Start with `0.1m` to `1.0m`.