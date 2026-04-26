import * as THREE from "three";
import vertexWater from "@/components/three/shaders/water/vertex.glsl"
import fragmentWater from "@/components/three/shaders/water/fragment.glsl"

export interface WaterOptions {
  size?: number;
  elevation?: number;
  splatTexture: THREE.Texture;
  terrainSize: number;
}

export interface WaterInstance {
  mesh: THREE.Mesh;
  update: (elapsed: number, camera: THREE.Camera) => void;
  dispose: () => void;
}

/**
 * useWater composable
 * Advanced water surface inspired by afl_ext (MIT License).
 * Features high-quality waves, scattering, and reflection.
 * Optimized for WebGL/Three.js integration.
 */
export function useWater(
  scene: THREE.Scene,
  options: WaterOptions
): WaterInstance | null {
  if (import.meta.server) return null;

  const {
    size = 500,
    elevation = -0.3,
    splatTexture,
    terrainSize,
  } = options;

  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  geometry.rotateX(-Math.PI * 0.5);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // depthTest: true, // Default
    uniforms: {
      uTime: { value: 0 },
      uSplatTexture: { value: splatTexture },
      uTerrainSize: { value: terrainSize },
      uWaterColor: { value: new THREE.Color("#5bc2b9") },
      uDeepWaterColor: { value: new THREE.Color("#13375f") },
      uShoreColor: { value: new THREE.Color("#ffffff") },
      uCameraPosition: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(-0.5, 0.15, -0.5).normalize() },
    },
    vertexShader: vertexWater,
    fragmentShader: fragmentWater,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = elevation;
  mesh.receiveShadow = true;
  
  /**
   * IMPORTANT: Fixing transparency issue where smoke becomes invisible.
   * By setting renderOrder to 0 (default) and ensuring smoke has a higher order,
   * or by setting water to a negative order to render it first as the "background".
   * Since water is mostly at the bottom of the scene, rendering it first is safe.
   */
  mesh.renderOrder = -1; 

  scene.add(mesh);

  return {
    mesh,
    update(elapsed: number, camera: THREE.Camera) {
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uCameraPosition.value.copy(camera.position);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      scene.remove(mesh);
    },
  };
}
