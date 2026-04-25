import * as THREE from "three";

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
    subdivisions = 300, // 90,000 blades for a lush feel
    size = 500,
    splatTexture,
    terrainSize,
    grassColor = "#729f24", // More vibrant green
  } = options;

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
      uGrassColor: { value: new THREE.Color(grassColor) },
      uBladeWidth: { value: 0.2 },
      uBladeHeight: { value: 0.7 },
    },
    vertexShader: `
      uniform float uTime;
      uniform sampler2D uSplatTexture;
      uniform float uTerrainSize;
      uniform float uBladeWidth;
      uniform float uBladeHeight;

      attribute vec2 aAnchor;
      attribute float aHeightRandomness;
      attribute float aVertexIndex;

      varying vec2 vUv;
      varying float vGrassMask;
      varying float vRandom;

      // Simple 2D Noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        vRandom = aHeightRandomness;
        
        // 1. Terrain Data
        vec2 terrainUv = vec2(aAnchor.x / uTerrainSize + 0.5, 0.5 - aAnchor.y / uTerrainSize);
        vec4 terrainData = texture2D(uSplatTexture, terrainUv);
        float depth = terrainData.b;
        float grassMask = terrainData.g;
        vGrassMask = grassMask;

        // 2. Base Position
        // Terrain elevation is b * -1.5
        float elevation = depth * -1.5;
        vec3 basePosition = vec3(aAnchor.x, elevation, aAnchor.y);

        // 3. Blade Shape
        float height = uBladeHeight * (0.6 + aHeightRandomness * 0.4) * grassMask;
        
        // Push below ground if no grass here or underwater
        if (grassMask < 0.05 || depth > 0.18) {
          height = 0.0;
        }

        vec3 vPos = vec3(0.0);
        float tipness = 0.0;

        if (aVertexIndex == 0.0) { // Tip
          vPos = vec3(0.0, height, 0.0);
          tipness = 1.0;
        } else if (aVertexIndex == 1.0) { // Bottom Left
          vPos = vec3(-uBladeWidth * 0.5, 0.0, 0.0);
        } else { // Bottom Right
          vPos = vec3(uBladeWidth * 0.5, 0.0, 0.0);
        }

        // 4. Billboarding (Face Camera)
        vec3 worldBasePos = (modelMatrix * vec4(basePosition, 1.0)).xyz;
        vec3 cameraPos = cameraPosition;
        float angle = atan(worldBasePos.x - cameraPos.x, worldBasePos.z - cameraPos.z);
        
        float c = cos(angle);
        float s = sin(angle);
        mat2 rot = mat2(c, s, -s, c);
        vPos.xz = rot * vPos.xz;

        // 5. Wind (Multiple octaves for richness)
        float windTime = uTime * 0.6;
        float wind = noise(worldBasePos.xz * 0.1 + windTime);
        wind += noise(worldBasePos.xz * 0.5 + windTime * 1.5) * 0.5;
        
        float windStrength = wind * tipness * height * 0.4;
        vPos.x += windStrength;
        vPos.z += windStrength * 0.5;

        vUv = vec2(aVertexIndex / 2.0, tipness);
        
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(basePosition + vPos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uGrassColor;
      varying vec2 vUv;
      varying float vGrassMask;
      varying float vRandom;

      void main() {
        if (vGrassMask < 0.05) discard;
        
        // Color variation per blade
        vec3 color = uGrassColor;
        color = mix(color, color * 1.2, vRandom); // Some brighter blades
        color = mix(color * 0.7, color, vUv.y);   // Darker at bottom
        
        // Simple top-lighting
        color *= (0.8 + vUv.y * 0.4);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
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
