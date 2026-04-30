import * as THREE from "three";
import vertexSlabs from "@/components/three/shaders/slabs/vertex.glsl"
import fragmentSlabs from "@/components/three/shaders/slabs/fragment.glsl"
import slabsTextureUrl from "@/assets/three/resources/textures/slabs.png";

export interface SlabsOptions {
  size?: number;
  subdivisions?: number;
  splatTexture: THREE.Texture;
  terrainSize: number;
  slabColorLow?: string;
  slabColorHigh?: string;
  tiling?: number;
}

export interface SlabsInstance {
  mesh: THREE.Mesh;
  update: (elapsed: number) => void;
  dispose: () => void;
}

/**
 * useSlabs composable
 * Adds a slab layer to the terrain based on the splat map's red channel.
 */
export function useSlabs(
  scene: THREE.Scene,
  options: SlabsOptions
): SlabsInstance | null {
  if (import.meta.server) return null;

  const {
    size = 512,
    subdivisions = 256,
    splatTexture,
    terrainSize,
    slabColorLow = "#a87762",
    slabColorHigh = "#ffcf8b",
    tiling = 80,
  } = options;

  const textureLoader = new THREE.TextureLoader();
  const slabsTexture = textureLoader.load(slabsTextureUrl);
  slabsTexture.wrapS = THREE.RepeatWrapping;
  slabsTexture.wrapT = THREE.RepeatWrapping;

  const geometry = new THREE.PlaneGeometry(size, size, subdivisions, subdivisions);
  geometry.rotateX(-Math.PI * 0.5);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uSplatTexture: { value: splatTexture },
      uSlabsTexture: { value: slabsTexture },
      uTerrainSize: { value: terrainSize },
      uSlabColorLow: { value: new THREE.Color(slabColorLow) },
      uSlabColorHigh: { value: new THREE.Color(slabColorHigh) },
      uTiling: { value: tiling },
    },
    vertexShader: vertexSlabs,
    fragmentShader: fragmentSlabs,
    // Use polygon offset to prevent z-fighting with the terrain mesh
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  /**
   * IMPORTANT: Fixing transparency issue where smoke becomes invisible.
   * By setting slabs to a negative order to render it first as the "background".
   * This matches the approach used in useWater.ts.
   */
  mesh.renderOrder = -1;
  scene.add(mesh);

  return {
    mesh,
    update(elapsed: number) {
      // Any animations could go here
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      scene.remove(mesh);
    },
  };
}
