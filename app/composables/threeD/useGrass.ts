import * as THREE from "three";
import vertexGrass from "@/components/three/shaders/grass/vertex.glsl"
import fragmentGrass from "@/components/three/shaders/grass/fragment.glsl"

export interface GrassOptions {
  subdivisions?: number;
  size?: number;
  splatTexture: THREE.Texture;
  interactionTexture: THREE.Texture;
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
 */
export function useGrass(
  scene: THREE.Scene,
  options: GrassOptions
): GrassInstance | null {
  if (import.meta.server) return null;

  const {
    size = 500,
    subdivisions = 300, 
    splatTexture,
    interactionTexture,
    terrainSize,
    grassColor = "#729f24",
  } = options;

  const count = subdivisions * subdivisions;
  const bladesPerClump = 3; 
  const totalCount = count * bladesPerClump;
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(totalCount * 3 * 3);
  const anchors = new Float32Array(totalCount * 3 * 2);
  const heightRandomness = new Float32Array(totalCount * 3);
  const vertexIndex = new Float32Array(totalCount * 3);

  for (let i = 0; i < count; i++) {
    const gridX = (i % subdivisions) / subdivisions - 0.5;
    const gridZ = Math.floor(i / subdivisions) / subdivisions - 0.5;
    const jitter = 1.0 / subdivisions;
    
    const clumpX = (gridX + (Math.random() - 0.5) * jitter) * size;
    const clumpZ = (gridZ + (Math.random() - 0.5) * jitter) * size;
    const clumpRand = Math.random();

    for (let b = 0; b < bladesPerClump; b++) {
      const bladeIdx = i * bladesPerClump + b;
      const angle = (b / bladesPerClump) * Math.PI * 2 + Math.random() * 0.5;
      const radius = Math.random() * 0.2;
      
      const x = clumpX + Math.cos(angle) * radius;
      const z = clumpZ + Math.sin(angle) * radius;
      const hRand = clumpRand * 0.5 + Math.random() * 0.5;

      for (let j = 0; j < 3; j++) {
        const idx = bladeIdx * 3 + j;
        
        positions[idx * 3 + 0] = 0;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = 0;

        anchors[idx * 2 + 0] = x;
        anchors[idx * 2 + 1] = z;

        heightRandomness[idx] = hRand;
        vertexIndex[idx] = j;
      }
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
      uInteractionTexture: { value: interactionTexture },
      uTerrainSize: { value: terrainSize },
      uGrassColorDark: { value: new THREE.Color("#2d4c1e") },
      uGrassColorLight: { value: new THREE.Color(grassColor) },
      uShadowColor: { value: new THREE.Color("#1a2c12") },
      uHighlightColor: { value: new THREE.Color("#e1e552") },
      uBladeWidth: { value: 0.12 }, 
      uBladeHeight: { value: 0.35 }, 
      uWindSpeed: { value: 1.5 },
      uWindAmplitude: { value: 1.0 },
      uWindWaveTiling: { value: 0.8 },
      uWindWaveStrength: { value: -0.5 },
      uWindBaseTiling: { value: 0.3 },
      uWindBaseStrength: { value: 0.8 },
      uNormalStrength: { value: 0.3 },
      uTerrainNormalScale: { value: 1.0 },
      uCameraPosition: { value: new THREE.Vector3() },
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
    update(elapsed: number, cameraPos?: THREE.Vector3) {
      material.uniforms.uTime.value = elapsed;
      if (cameraPos) material.uniforms.uCameraPosition.value.copy(cameraPos);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      scene.remove(mesh);
    },
  };
}
