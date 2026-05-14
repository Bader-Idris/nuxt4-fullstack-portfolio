# Three.js Shadow Tuning Guide

This guide covers critical techniques for eliminating common shadow artifacts like **Shadow Acne**, **Peter Panning**, and **Rectangle Clipping** in WebGL projects.

---

## 1. Eliminating Shadow Acne

Shadow Acne appears as moiré patterns or "stripes" on surfaces that should be in light. It happens when a surface incorrectly shadows itself due to floating-point precision limits.

### A. Bias and NormalBias
*   **`shadow.bias`**: Shifts the depth comparison slightly. A small negative value (e.g., `-0.0005`) pushes shadows away from the light. Too much bias causes "Peter Panning" (shadows look detached from the feet).
*   **`shadow.normalBias`**: **(Recommended for GLB)** Shifts the shadow along the surface normal. It is extremely effective at fixing acne on curved surfaces (like locomotive boilers or character faces) without causing Peter Panning.

```typescript
light.shadow.bias = -0.0005;
light.shadow.normalBias = 0.05; // Use 0.02 to 0.1 for most models
```

### B. Material shadowSide
By default, Three.js uses the back-faces of geometry to render shadows. For curved or thin GLB meshes, this often causes acne.
*   **Fix:** Set `material.shadowSide = THREE.FrontSide` during model loading to ensure shadows are calculated from the visible surfaces.

---

## 2. Maximizing Depth Precision

Blurry shadows or "shimmering" are often caused by a shadow camera frustum that is too large.

### A. Tighten Near/Far Planes
The default `near` (0.5) and `far` (500) planes are often too wide. If your light is 100 units away from the target, set a tight range to utilize the full resolution of the depth buffer.

```typescript
light.shadow.camera.near = 50;
light.shadow.camera.far = 400; // Keep the range as small as possible
```

### B. Following the Target
If your object (like a train) moves across a large world, a static shadow camera will eventually clip it (the "rectangle cut" effect).
*   **Solution:** Update the light's position and its `target` position in your animation loop to follow the player/locomotive.

---

## 3. High-Performance Mobile Shadows

### A. MapSize vs. Radius
*   **`shadow.mapSize`**: Higher values (2048+) look crisper but consume significantly more VRAM and GPU power.
*   **`shadow.radius`**: If using `PCFShadowMap`, a higher radius (e.g., `2`) can soften edges without increasing texture resolution.

### B. Shadow Map Types
*   **`THREE.BasicShadowMap`**: Fastest, no filtering (jagged edges).
*   **`THREE.PCFShadowMap`**: Standard balance.
*   **`THREE.PCFSoftShadowMap`**: Best quality, but expensive for mobile GPUs.

---

## 4. Summary Checklist
1.  [ ] Use `normalBias` (0.05) for GLB/Curved meshes.
2.  [ ] Set `material.shadowSide = THREE.FrontSide` on loaded meshes.
3.  [ ] Tighten `shadow.camera.near` and `far` to the smallest possible range.
4.  [ ] Match `shadow.camera.left/right/top/bottom` to the target's size.
5.  [ ] Add `scene.add(light.target)` if moving the light dynamically.
