# Advanced Grass Optimization & Texturing Guide

This guide explains how to increase grass intensity (density) and add UV textures to your Three.js grass system while keeping it mobile-optimized.

## 1. Increasing Intensity (Density)

Density is controlled in `app/composables/threeD/useGrass.ts`. There are two ways to increase intensity:

### A. Increase Clump Count
Increase the `subdivisions` parameter. This adds more "anchor points" across the terrain.
*   **Performance Impact:** High. This increases the total number of vertices in the buffer.
*   **Mobile Tip:** Keep this below `500` for mid-range mobile devices.

### B. Increase Blades Per Clump
In `useGrass.ts`, adjust the `bladesPerClump` variable.
```typescript
const bladesPerClump = 5; // Increase this for thicker clumps
```
*   **Performance Impact:** Moderate. It adds more triangles but keeps them grouped locally, which is better for cache locality.
*   **Benefit:** This creates a "lush" look without needing a massive grid of subdivisions.

---

## 2. Adding UV Textures

The current system already passes UV coordinates to the shader. Here is how to use them for actual textures.

### Step 1: Update the Composable (`useGrass.ts`)
Add a texture uniform to the material:
```typescript
const material = new THREE.ShaderMaterial({
  uniforms: {
    uGrassTexture: { value: grassTextureLoader.load('/path/to/grass.png') },
    // ... existing uniforms
  },
  // ...
});
```

### Step 2: Update the Fragment Shader (`fragment.glsl`)
Sample the texture using the varying `vUv`:
```glsl
uniform sampler2D uGrassTexture;
varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uGrassTexture, vUv);
  
  // Use texture color but keep our optimized lighting/interaction
  vec3 finalColor = texColor.rgb * grassColor; 
  
  // CRITICAL for performance: Use alpha testing instead of full transparency
  if (texColor.a < 0.5) discard;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
```

---

## 3. Mobile Performance Secrets

### A. Avoid Overdraw (The #1 Mobile Killer)
Mobile GPUs struggle with **Overdraw** (drawing pixels multiple times). 
*   **Problem:** Using a texture with large transparent areas (like a thin blade in a square PNG) causes the GPU to process many "invisible" pixels.
*   **Solution:** Make your grass texture fill as much of the UV square as possible. Use a "clump" texture rather than a single blade.

### B. Texture Compression
Use compressed texture formats like **KTX2** or **Basis Universal**. These stay compressed in GPU memory, reducing bandwidth and heat on mobile devices.

### C. Distance-Based Fading (LOD)
Instead of rendering all grass at once, add logic to the `vertex.glsl` to scale blades down based on distance from the camera:
```glsl
float distanceToCamera = length(cameraPosition - worldBasePos);
float distFade = clamp(1.0 - (distanceToCamera / 100.0), 0.0, 1.0);
height *= distFade; // Shrink far away grass
```

### D. Geometry Merging vs. Instancing
*   **Merging (Current):** Best for static grass. One single draw call for the whole world.
*   **Instancing:** Better if you have multiple distinct types of foliage (flowers, rocks, grass) sharing the same geometry.

## Summary Checklist for Mobile
1.  **Prefer Geometry over Transparency:** A high-poly triangle is often faster on mobile than a low-poly quad with a complex transparent texture.
2.  **Use Alpha Test (`discard`):** It is faster than Alpha Blending on many mobile architectures.
3.  **Keep Shaders Simple:** Avoid complex loops or many texture lookups in the Fragment shader. Move calculations to the Vertex shader whenever possible.
