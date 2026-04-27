import * as THREE from "three";
import { ref } from "vue";
import particleVertexShader from "../../components/three/shaders/smoke/particleVertex.glsl";
import particleFragmentShader from "../../components/three/shaders/smoke/particleFragment.glsl";

export const useChimneySteam = () => {
  // --- PARTICLE COUNT ---
  // Higher = denser, more realistic coal smoke (try 200+ for thick smoke)
  const PARTICLE_COUNT = 400;
  // --- LIFETIME ---
  // How long each particle lives before respawning (seconds)
  const SMOKE_LIFETIME = 3.0;
  const SMOKE_BEND_SMOOTHING = 3.2;

  let smokeParticles: THREE.Points | null = null;
  let smokeMaterial: THREE.ShaderMaterial | null = null;
  let smokePositions: Float32Array;
  let smokeBirths: Float32Array;
  let smokeLifespans: Float32Array;
  let smokeVelocities: Float32Array;
  let smokeSeeds: Float32Array;

  const smokeBendAngle = { value: 0 };
  const smokeLifeSpeed = ref(1);

  const SMOKE_BEND_ANGLE_BY_GEAR = {
    backward: -45,
    idle: 0,
    medium: 60,
    high: 80,
  };

  const SMOKE_LIFE_SPEED_BY_GEAR = {
    backward: 1,
    idle: 0.2,
    medium: 1,
    high: 1.6,
  };

  const init = (chimneyMesh: THREE.Object3D, resolution: THREE.Vector2) => {
    // Initialize particle data arrays
    smokePositions = new Float32Array(PARTICLE_COUNT * 3);
    smokeBirths = new Float32Array(PARTICLE_COUNT);
    smokeLifespans = new Float32Array(PARTICLE_COUNT);
    smokeVelocities = new Float32Array(PARTICLE_COUNT * 3);
    smokeSeeds = new Float32Array(PARTICLE_COUNT);

    // Initialize particles with staggered birth times for continuous smoke column
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // --- LIFETIME (duration before respawn) ---
      // Smoke height control:
      // longer lifespan = particles survive longer and rise higher.
      smokeBirths[i] = -Math.random() * SMOKE_LIFETIME * 2; // Negative = some already alive at start
      smokeLifespans[i] = SMOKE_LIFETIME + Math.random() * 2.0; // 3.0-5.0s duration

      // --- INITIAL POSITION (local space, relative to chimney emitter) ---
      // X: wider horizontal spread for a thick smoke plume
      smokePositions[i * 3] = (Math.random() - 0.5) * 0.25;
      // Y: start at emitter base
      smokePositions[i * 3 + 1] = Math.random() * 0.2;
      // Z: wider depth spread for a thick smoke plume
      smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.25;

      // --- VELOCITY (speed & direction) ---
      // X: wider lateral drift for thick, spreading smoke
      smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
      // Main smoke height control:
      // higher Y velocity = taller plume because particles climb farther before fading.
      smokeVelocities[i * 3 + 1] = 0.8 + Math.random() * 0.25;
      // Z: wider depth drift
      smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

      // Random seed for unique noise-driven motion per particle
      smokeSeeds[i] = Math.random();
    }

    // Create particle geometry
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(smokePositions, 3)
    );
    particleGeo.setAttribute(
      "aBirth",
      new THREE.BufferAttribute(smokeBirths, 1)
    );
    particleGeo.setAttribute(
      "aLifespan",
      new THREE.BufferAttribute(smokeLifespans, 1)
    );
    particleGeo.setAttribute(
      "aVelocity",
      new THREE.BufferAttribute(smokeVelocities, 3)
    );
    particleGeo.setAttribute(
      "aSeed",
      new THREE.BufferAttribute(smokeSeeds, 1)
    );

    // Create shader material for particles (puff shape computed in GLSL)
    smokeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindBendAngle: { value: 0 },
        uLifeSpeed: { value: 1 },
        // --- PARTICLE SIZE ---
        // Base radius of the smoke puffs.
        // Small (0.05) = wispy steam, Large (0.3) = heavy coal clouds.
        uParticleSize: { value: 0.15 },
        // --- SMOKE COLOR ---
        // Warm gray: rgb(217, 209, 204)
        uColor: { value: new THREE.Color(0.85, 0.82, 0.8) },
        uResolution: { value: resolution.clone() },
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    });

    // Create points
    smokeParticles = new THREE.Points(particleGeo, smokeMaterial);
    smokeParticles.position.set(0, 0.12, 0);
    smokeParticles.frustumCulled = false;
    chimneyMesh.add(smokeParticles);
  };

  const update = (elapsed: number, delta: number, locomotiveSpeed: number, camDist: number = 0) => {
    if (!smokeMaterial || !smokeParticles) return;

    smokeMaterial.uniforms.uTime.value = elapsed;
    
    // CPU OPTIMIZATION: If very far away, skip most of the update logic
    // We still update uTime but skip the expensive loop and attribute updates
    const isVeryFar = camDist > 150;
    const isFar = camDist > 80;

    // Drive smoke bend by actual locomotive speed (heavy mass simulation)
    // Forward (negative speed) tilts right, Backward (positive) tilts left
    let targetBendDeg = 0;
    if (locomotiveSpeed < 0) {
      // Mapping forward speed (-6.8 max) to 80 degrees tilt
      targetBendDeg = THREE.MathUtils.mapLinear(
        locomotiveSpeed,
        0,
        -6.8,
        0,
        80
      );
    } else {
      // Mapping backward speed (2.4 max) to -45 degrees tilt
      targetBendDeg = THREE.MathUtils.mapLinear(
        locomotiveSpeed,
        0,
        2.4,
        0,
        -45
      );
    }

    const targetBendRad = THREE.MathUtils.degToRad(targetBendDeg);
    const lerpT = Math.min(delta * SMOKE_BEND_SMOOTHING, 1);
    smokeBendAngle.value = THREE.MathUtils.lerp(
      smokeBendAngle.value,
      targetBendRad,
      lerpT
    );
    smokeMaterial.uniforms.uWindBendAngle.value = smokeBendAngle.value;

    // Drive smoke life speed (intensity) by speed as well
    const lifeSpeedTarget =
      locomotiveSpeed < -3.5
        ? THREE.MathUtils.mapLinear(locomotiveSpeed, -3.5, -6.8, 1.0, 1.1)
        : 1.0;

    // Lerp the life speed as well for extra smoothness when stopping
    const currentLifeSpeed = smokeMaterial.uniforms.uLifeSpeed.value;
    smokeMaterial.uniforms.uLifeSpeed.value = THREE.MathUtils.lerp(
      currentLifeSpeed,
      lifeSpeedTarget,
      lerpT
    );

    if (isVeryFar) return;

    // Respawn dead particles - THROTTLE: only every few frames if far
    // Or just process a subset? Simple approach: full update but skip if very far.
    const positions = smokeParticles.geometry.attributes.position.array as Float32Array;
    
    // If far, we only process half of the particles per frame to save CPU
    const stride = isFar ? 2 : 1;
    const offset = Math.floor(elapsed * 60) % stride;

    for (let i = offset; i < PARTICLE_COUNT; i += stride) {
      const age = elapsed - smokeBirths[i];
      if (age > smokeLifespans[i]) {
        // --- RESPAWN TIMING ---
        smokeBirths[i] = elapsed + Math.random() * 1.5;
        smokeLifespans[i] = SMOKE_LIFETIME + Math.random() * 2.0;

        // --- RESPAWN POSITION (local space) ---
        positions[i * 3] = (Math.random() - 0.5) * 0.25;
        positions[i * 3 + 1] = Math.random() * 0.2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.25;

        // --- RESPAWN VELOCITY ---
        smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
        smokeVelocities[i * 3 + 1] = 0.8 + Math.random() * 0.25;
        smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

        smokeSeeds[i] = Math.random();
      }
    }

    smokeParticles.geometry.attributes.position.needsUpdate = true;
    smokeParticles.geometry.attributes.aBirth.needsUpdate = true;
    smokeParticles.geometry.attributes.aLifespan.needsUpdate = true;
    smokeParticles.geometry.attributes.aVelocity.needsUpdate = true;
    smokeParticles.geometry.attributes.aSeed.needsUpdate = true;
  };

  const updateResolution = (resolution: THREE.Vector2) => {
    if (smokeMaterial) {
      smokeMaterial.uniforms.uResolution.value.copy(resolution);
    }
  };

  const dispose = () => {
    if (smokeMaterial) {
      smokeMaterial.dispose();
    }
    if (smokeParticles) {
      smokeParticles.geometry.dispose();
      if (smokeParticles.parent) {
        smokeParticles.parent.remove(smokeParticles);
      }
    }
  };

  return {
    init,
    update,
    updateResolution,
    dispose,
    smokeBendAngle,
    smokeLifeSpeed,
    SMOKE_BEND_ANGLE_BY_GEAR,
    SMOKE_LIFE_SPEED_BY_GEAR,
  };
};
