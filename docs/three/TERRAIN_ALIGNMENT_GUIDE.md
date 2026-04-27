# Terrain & Areas Alignment Guide (Blender to Three.js)

This guide ensures 100% alignment between your **Terrain Geometry**, **Areas GLB**, and **Splat Map (terrain.png)**.

## 1. Blender Scene Setup
Before exporting or baking, ensure your scene scales match Three.js expectations.

*   **Units:** Set `Unit System` to `Metric` and `Unit Scale` to `1.0`.
*   **Terrain Bounds:** If your terrain is `500x500` in Three.js, it must be exactly `500m x 500m` in Blender.
*   **World Origin:** The center of your terrain must be at `(0, 0, 0)`.
    *   *Fix:* Select Terrain -> `Object` -> `Set Origin` -> `Origin to Geometry`.
    *   *Fix:* Set Location to `(0, 0, 0)`.
    *   *CRITICAL:* Apply all transforms (`Ctrl+A` -> `All Transforms`).

## 2. Baking the Splat Map (terrain.png)
The shift "to the left" usually happens because the baking camera is not perfectly centered or its scale is wrong.

### A. The Baking Camera
1.  Create a **Camera** and name it `Baking_Camera`.
2.  Set Location to `(0, 100, 0)` (Height doesn't matter as long as it's above).
3.  Set Rotation to `(0, 0, 0)` (Looking straight down in Blender 4.x) or `(0, 0, 0)` with the camera selected, then Alt+R to clear rotation and rotate X by 0 if using top-down orthographic defaults.
    *   **Standard Top-Down:** Rotation X: `0°`, Y: `0°`, Z: `0°` if you are in Top View (Numpad 7). 
    *   **Check:** Press `Numpad 0` to look through the camera. It should see the terrain perfectly centered.
4.  **Camera Settings (Green Icon):**
    *   Type: `Orthographic`.
    *   **Orthographic Scale:** This must match your terrain size exactly (e.g., `500.0`).
5.  **Output Settings:**
    *   Resolution: Use a square (e.g., `2048 x 2048` or `4096 x 4096`).

## 3. Exporting Geometry
When exporting `terrain.glb` and `areas.glb`:

1.  Select the objects you want to export.
2.  `File` -> `Export` -> `glTF 2.0 (.glb)`.
3.  **Include:** `Selected Objects`.
4.  **Transform:** `+Y Up` (Standard for Three.js).
5.  **Geometry:** Apply Modifiers (unless you handle them in Three.js).

## 4. Three.js Implementation Checklist

### A. Terrain Size Sync
Ensure the `uTerrainSize` uniform matches the Blender Orthographic Scale.
*   *Reference:* `app/composables/threeD/useTerrain.ts` (Lines 11, 74, 105)
```typescript
this.size = 500 // Must match Blender Ortho Scale
```

### B. UV Mapping Formula
The shader calculates UVs based on world position. If the terrain is centered at `(0,0,0)`, the formula in your shaders must be:

*   *Reference:* `app/components/three/shaders/grass/vertex.glsl` (Line 92)
*   *Reference:* `app/composables/threeD/useTerrain.ts` (Line 105)

```glsl
// Correct formula for centered plane
vec2 splatUv = vec2(
    position.x / uTerrainSize + 0.5, 
    0.5 - position.z / uTerrainSize
);
```
*   **Why `0.5`?** World `0` is UV `0.5`.
*   **Why `- position.z`?** In Three.js, `-Z` is "Forward" (Top of the texture).

## 5. Troubleshooting Alignment
If you still see a shift:
1.  **Object Origin:** In Blender, select your Area objects. Is the orange dot at `(0,0,0)`? It should be, even if the mesh is far away. This ensures their relative position is preserved.
2.  **Parenting:** Ensure objects aren't parented to a shifted Empty during export.
3.  **Visual Debug:** In `useTerrain.ts`, temporarily set `diffuseColor.rgb = vec3(vTerrainData.r, vTerrainData.g, 0.0);` to see exactly where the splat map is landing.

## Summary of Reference Lines
*   **Terrain Logic:** `app/composables/threeD/useTerrain.ts`
*   **Grass UVs:** `app/components/three/shaders/grass/vertex.glsl`
*   **Water UVs:** `app/composables/threeD/useWater.ts`
*   **Locomotive Position:** `app/components/three/Locomotive.vue` (L615: `placeLocomotiveOnTrack()`)
