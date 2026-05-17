import * as THREE from "three";

export interface SkyOptions {
  sunDirection?: THREE.Vector3;
  sphereRadius?: number;
  sphereSegments?: { width: number; height: number };
}

export interface SkyInstance {
  mesh: THREE.Mesh;
  sunDirUniform: { value: THREE.Vector3 };
  update: (camera: THREE.Camera) => void;
  dispose: () => void;
}

/**
 * useSky composable for Nuxt 4
 * Provides a GLSL-based sky sphere for Three.js scenes.
 * Purpose: Decouples sky logic from components, ensures SSR safety,
 * and provides a clean interface for sky updates and disposal.
 */
export function useSky(
  scene: THREE.Scene,
  options: SkyOptions = {},
): SkyInstance | null {
  // Ensure we only run on the client to avoid hydration errors and Three.js SSR issues
  if (import.meta.server) return null;

  const {
    sunDirection = new THREE.Vector3(-0.5, 0.15, -0.5).normalize(),
    sphereRadius = 1000,
    sphereSegments = { width: 32, height: 15 },
  } = options;

  const skyGeo = new THREE.SphereGeometry(
    sphereRadius,
    sphereSegments.width,
    sphereSegments.height,
  );

  const uSunDir = { value: sunDirection.clone() };

  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uSunDir: uSunDir,
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      varying vec3 vPosition;

      void main() {
        vec3 rd = normalize(vPosition);
        float elev = rd.y;

        // Base sky gradient
        vec3 zenith = vec3(0.18, 0.22, 0.55); // #2e388c
        vec3 midSky = vec3(0.72, 0.42, 0.35); // #b86b59
        vec3 horizon = vec3(0.95, 0.60, 0.25); // #f29940
        vec3 belowHorizon = vec3(0.45, 0.32, 0.20); // #735233

        float upper = smoothstep(0.0, 0.6, elev);
        float lower = smoothstep(0.0, 0.25, elev);

        vec3 col = mix(horizon, midSky, lower);
        col = mix(col, zenith, upper);
        col = mix(belowHorizon, col, smoothstep(-0.15, 0.05, elev));

        // Sun
        float sunDot = max(dot(rd, normalize(uSunDir)), 0.0);
        float sunDisk = smoothstep(0.9985, 0.9995, sunDot);
        col += vec3(1.0, 0.87, 0.45) * 3.5 * sunDisk; // #ffdd73

        float sunGlow = pow(sunDot, 64.0) * 0.4;
        col += vec3(1.0, 0.75, 0.35) * sunGlow; // #ffbf59

        // Horizon haze
        float haze = exp(abs(elev) * -4.5);
        col += vec3(0.85, 0.55, 0.25) * haze * 0.2; // #d98c40

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const skyMesh = new THREE.Mesh(skyGeo, skyMaterial);
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -1;
  scene.add(skyMesh);

  return {
    mesh: skyMesh,
    sunDirUniform: uSunDir,
    update(camera: THREE.Camera) {
      skyMesh.position.copy(camera.position);
    },
    dispose() {
      skyGeo.dispose();
      skyMaterial.dispose();
      scene.remove(skyMesh);
    },
  };
}