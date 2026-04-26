import * as THREE from "three";
import vertexGrass from "@/components/three/shaders/grass/vertex.glsl"
import fragmentGrass from "@/components/three/shaders/grass/fragment.glsl"

export interface GrassOptions {
  subdivisions?: number;
  size?: number;
  splatTexture: THREE.Texture;
  terrainSize: number;
  grassColor?: string;
}

export interface GrassInstance {
  mesh: THREE.Mesh;
  update: (elapsed: number) => void;
  dispose: () => void;
}

/**
 * useGrass composable
 * Provides a highly optimized, instanced grass system.
 * Inspired by Bruno Simon's 2025 portfolio.
 */
export function useGrass(
  scene: THREE.Scene,
  options: GrassOptions
): GrassInstance | null {
  if (import.meta.server) return null;

  const {
    // UPDATED: subdivisions set to match a density of 50 blades per unit area (size * size)
    // Formula: subdivisions = size * sqrt(density)
    size = 500,
    subdivisions = Math.floor(size * 7.07), // sqrt(50) ≈ 7.07
    splatTexture,
    terrainSize,
    grassColor = "#729f24", // More vibrant green
  } = options;

  // UPDATED: Total count calculated from subdivisions (count = density * size * size)
  const count = subdivisions * subdivisions;
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(count * 3 * 3); // 3 vertices per blade, 3 coords per vertex
  const anchors = new Float32Array(count * 3 * 2); // 3 vertices per blade, 2 coords (XZ) per anchor
  const heightRandomness = new Float32Array(count * 3);
  const vertexIndex = new Float32Array(count * 3); // 0, 1, 2 for each triangle

  for (let i = 0; i < count; i++) {
    const gridX = (i % subdivisions) / subdivisions - 0.5;
    const gridZ = Math.floor(i / subdivisions) / subdivisions - 0.5;
    const jitter = 1.0 / subdivisions;
    
    const x = (gridX + (Math.random() - 0.5) * jitter) * size;
    const z = (gridZ + (Math.random() - 0.5) * jitter) * size;
    const hRand = Math.random();

    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      
      positions[idx * 3 + 0] = 0;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = 0;

      anchors[idx * 2 + 0] = x;
      anchors[idx * 2 + 1] = z;

      heightRandomness[idx] = hRand;
      vertexIndex[idx] = j;
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAnchor", new THREE.BufferAttribute(anchors, 2));
  geometry.setAttribute("aHeightRandomness", new THREE.BufferAttribute(heightRandomness, 1));
  geometry.setAttribute("aVertexIndex", new THREE.BufferAttribute(vertexIndex, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSplatTexture: { value: splatTexture },
      uTerrainSize: { value: terrainSize },
      uGrassColorDark: { value: new THREE.Color("#2d4c1e") },
      uGrassColorLight: { value: new THREE.Color(grassColor) },
      uShadowColor: { value: new THREE.Color("#1a2c12") },
      // UPDATED: Reduced width and height for smaller, denser grass
      uBladeWidth: { value: 0.1 }, 
      uBladeHeight: { value: 0.26 }, // Reduced to ~1/3 of previous 0.8
      uWindSpeed: { value: 1.5 },
      uWindAmplitude: { value: 1.2 },
      uWindWaveTiling: { value: 0.8 },
      uWindWaveStrength: { value: -0.5 },
      uWindBaseTiling: { value: 0.3 },
      uWindBaseStrength: { value: 0.8 },
      uNormalStrength: { value: 0.3 },
      uTerrainNormalScale: { value: 1.0 },
    },
    vertexShader: vertexGrass,
    fragmentShader: fragmentGrass,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  return {
    mesh,
    update(elapsed: number) {
      material.uniforms.uTime.value = elapsed;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      scene.remove(mesh);
    },
  };
}
