<template>
  <div ref="containerRef" :class="{ 'is-fullscreen': modelFullscreen }">
    <canvas ref="canvasRef" />

    <div class="controls-container">
      <button
        class="control-btn"
        :class="{ active: physicsMode }"
        :aria-label="physicsMode ? 'Disable physics' : 'Enable physics'"
        @click="togglePhysics"
      >
        <Icon name="mdi:train" size="24" />
        <span class="btn-text">{{
          physicsMode ? "Physics ON" : "Physics OFF"
        }}</span>
      </button>
      <button
        class="control-btn"
        :class="{ active: showBlocks }"
        :aria-label="showBlocks ? 'Hide blocks' : 'Show blocks'"
        :disabled="!physicsMode"
        @click="toggleBlocks"
      >
        <Icon name="mdi:cube-outline" size="24" />
        <span class="btn-text">{{
          showBlocks ? "Blocks ON" : "Blocks OFF"
        }}</span>
      </button>
      <button
        class="control-btn"
        :class="{ active: wheelSpinMode, warning: wheelSpinMode }"
        :aria-label="wheelSpinMode ? 'Stop wheel spin' : 'Spin wheels only'"
        @click="toggleWheelSpin"
      >
        <Icon
          :name="wheelSpinMode ? 'mdi:stop' : 'mdi:speedometer'"
          size="24"
        />
        <span class="btn-text">{{
          wheelSpinMode ? "STOP SPIN" : "WHEEL SPIN"
        }}</span>
      </button>
      <button
        v-if="physicsMode"
        class="control-btn primary"
        :aria-label="`Change train gear. Current gear ${currentGear.label}`"
        :disabled="wheelSpinMode"
        @click="cycleGear"
      >
        <Icon name="mdi:car-shift-pattern" size="24" />
        <span class="btn-text"
          >GEAR: {{ currentGear.label.toUpperCase() }}</span
        >
      </button>

      <!-- Speed Display Overlay -->
      <div v-if="physicsMode || wheelSpinMode" class="speed-display">
        <div class="speed-value">{{ wheelSpeed.toFixed(1) }}</div>
        <div class="speed-label">RPM</div>
        <div v-if="wheelSpinMode" class="speed-mode">WHEEL SPIN</div>
        <div v-else-if="physicsMode" class="speed-mode">
          GEAR {{ currentGear.label.toUpperCase() }}
        </div>
      </div>

    </div>
    <button
      class="fullscreen-btn"
      :aria-label="modelFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
      @click="toggleFullscreen"
    >
      <Icon
        :name="
          modelFullscreen
            ? 'material-symbols-light:fullscreen-exit'
            : 'material-symbols:fullscreen'
        "
        size="28"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
// import { ShaderMaterial, Points } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { useFullscreen } from "@vueuse/core";
import { useSound } from "@/composables/useSound";
import { useTerrain } from "@/composables/threeD/useTerrain";
import { useTrainPhysics } from "@/composables/threeD/useTrainPhysics";
import { useSky } from "@/composables/threeD/useSky";
// import { useSmokeParticles } from "@/composables/threeD/useSmokeParticles";

import particleVertexShader from "./shaders/smoke/particleVertex.glsl";
import particleFragmentShader from "./shaders/smoke/particleFragment.glsl";

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const { playSound, playWithVariation, getSound, useContinuous } = useSound();

// Resolution tracking for shaders
const sizes = {
  width: 0,
  height: 0,
  pixelRatio: 1,
  resolution: new THREE.Vector2(0, 0),
};

// Fullscreen state - synced with parent via v-model
const modelFullscreen = defineModel<boolean>("fullscreen", { default: false });

// Physics mode state
const physicsMode = ref(false);
const showBlocks = ref(true);
const wheelSpinMode = ref(false);
const wheelSpeed = ref(0);
const locomotiveSpeed = ref(0);
const smokeLifeSpeed = ref(1);
const motionTweens = {
  speed: null as any,
  rpm: null as any,
  bend: null as any,
  lifeSpeed: null as any,
};
const wheelSpinGSAPRef = { ref: [] as any[] };
const gearPhases = [
  { key: "idle", label: "idle", speed: 0, rpm: 0 },
  { key: "medium", label: "medium", speed: -3.5, rpm: 90 },
  { key: "high", label: "high", speed: -6.8, rpm: 160 },
  { key: "idle", label: "idle", speed: 0, rpm: 0 },
  { key: "backward", label: "backward", speed: 2.4, rpm: 45 },
] as const;
const currentGearIndex = ref(0);
const currentGear = computed(() => gearPhases[currentGearIndex.value]);
const MAX_GEAR_ABS_SPEED =
  Math.max(...gearPhases.map((phase) => Math.abs(phase.speed))) || 1;

// VueUse useFullscreen bound to containerRef
const { toggle } = useFullscreen(containerRef, { autoExit: true });

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let locomotive: THREE.Group;
let animationId: number;
let skyMesh: THREE.Mesh | null = null;
let skyInstance: ReturnType<typeof useSky> | null = null;
// let smokeInstance: ReturnType<typeof useSmokeParticles> | null = null;

let smokeParticles: THREE.Points | null = null;
let smokeMaterial: THREE.ShaderMaterial | null = null;
let smokePositions: Float32Array;
let smokeBirths: Float32Array;
let smokeLifespans: Float32Array;
let smokeVelocities: Float32Array;
let smokeSeeds: Float32Array;
let resizeObserver: ResizeObserver | null = null;
let physicsBlocksGroup: THREE.Group | null = null;
let physicsBlocks: THREE.Object3D[] = [];
let trainPhysicsBody: any = null;
let terrain: any = null;
const { Terrain } = useTerrain();
const trainBodyOffset = new THREE.Vector3();
const trainBodyHalfExtents = new THREE.Vector3(1.2, 0.7, 0.6);
const trainFocusPoint = new THREE.Vector3();
const trainStartPosition = new THREE.Vector3(20, 0, 0);

const GROUND_Y = 0;
const TRACK_CENTER_Z = 0;
const BLOCKS_START_X = 9;
const STONE_COUNT = 26;
const CAMERA_OFFSET = new THREE.Vector3(3.5, 2.2, 5);
const CAMERA_FOLLOW_MIN_DISTANCE = 2.2;
const CAMERA_FOLLOW_MAX_DISTANCE = 8.5;
const CAMERA_FOLLOW_TIGHTNESS = 0.16;
const lastTrainFocusPoint = new THREE.Vector3();
const cameraFollowState = { initialized: false };

// Physics engine instance
const trainPhysics = useTrainPhysics();
// --- PARTICLE COUNT ---
// Higher = denser, more realistic coal smoke (try 200+ for thick smoke)
const PARTICLE_COUNT = 400;
// --- LIFETIME ---
// How long each particle lives before respawning (seconds)
// Lower = shorter smoke column
const SMOKE_LIFETIME = 3.0;
const SMOKE_BEND_ANGLE_BY_GEAR: Record<
  (typeof gearPhases)[number]["key"],
  number
> = {
  backward: -45,
  idle: 0,
  medium: 60,
  high: 80,
};
const SMOKE_LIFE_SPEED_BY_GEAR: Record<
  (typeof gearPhases)[number]["key"],
  number
> = {
  backward: 1,
  idle: 0.2,
  medium: 1,
  high: 1.6,
};
const smokeBendAngle = { value: 0 };
const SMOKE_BEND_SMOOTHING = 3.2;

const ticker = {
  elapsed: 0,
  delta: 1 / 60,
  maxDelta: 1 / 30,
  update(elapsedMs: number) {
    const elapsedSeconds = elapsedMs / 1000;
    this.delta = Math.min(elapsedSeconds - this.elapsed, this.maxDelta);
    this.elapsed = elapsedSeconds;
  },
};

const updateTrainFocusPoint = () => {
  if (!locomotive) return;
  trainFocusPoint.copy(locomotive.position).add(trainBodyOffset);
};

const syncCameraToTrain = (followMotion: boolean = false) => {
  if (!controls || !camera || !locomotive) return;

  updateTrainFocusPoint();

  if (followMotion) {
    if (!cameraFollowState.initialized) {
      controls.target.copy(trainFocusPoint);
      lastTrainFocusPoint.copy(trainFocusPoint);
      cameraFollowState.initialized = true;
      return;
    }

    const focusDelta = trainFocusPoint.clone().sub(lastTrainFocusPoint);
    controls.target.add(focusDelta);
    camera.position.add(focusDelta);
    controls.target.lerp(trainFocusPoint, CAMERA_FOLLOW_TIGHTNESS);

    const cameraToTarget = camera.position.clone().sub(controls.target);
    const distance = cameraToTarget.length();
    if (distance > CAMERA_FOLLOW_MAX_DISTANCE) {
      cameraToTarget.setLength(CAMERA_FOLLOW_MAX_DISTANCE);
      camera.position.copy(controls.target).add(cameraToTarget);
    } else if (distance < CAMERA_FOLLOW_MIN_DISTANCE) {
      cameraToTarget.setLength(CAMERA_FOLLOW_MIN_DISTANCE);
      camera.position.copy(controls.target).add(cameraToTarget);
    }

    lastTrainFocusPoint.copy(trainFocusPoint);
    return;
  }

  controls.target.copy(trainFocusPoint);
  camera.position.copy(trainFocusPoint.clone().add(CAMERA_OFFSET));
  lastTrainFocusPoint.copy(trainFocusPoint);
  cameraFollowState.initialized = true;
};

const syncTrainBodyFromVisual = () => {
  if (!locomotive || !trainPhysicsBody) return;
  const targetPosition = locomotive.position.clone().add(trainBodyOffset);
  trainPhysicsBody.setTranslation(targetPosition, true);
  trainPhysicsBody.setNextKinematicTranslation(targetPosition);
  trainPhysicsBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  trainPhysicsBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
};

const syncLocomotiveFromPhysics = () => {
  if (!locomotive || !trainPhysicsBody) return;
  const physicsPos = trainPhysicsBody.translation();
  locomotive.position.set(
    physicsPos.x - trainBodyOffset.x,
    physicsPos.y - trainBodyOffset.y,
    physicsPos.z - trainBodyOffset.z
  );
  updateTrainFocusPoint();
};

const placeLocomotiveOnTrack = () => {
  if (!locomotive) return;
  locomotive.position.set(0, 0, 0);
  const modelBounds = new THREE.Box3().setFromObject(locomotive);
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());
  const terrainHeight = terrain
    ? terrain.getHeightAt(
        trainStartPosition.x - modelCenter.x,
        TRACK_CENTER_Z - modelCenter.z
      )
    : 0;
  locomotive.position.set(
    trainStartPosition.x - modelCenter.x,
    GROUND_Y - modelBounds.min.y + terrainHeight,
    TRACK_CENTER_Z - modelCenter.z
  );
  const placedBounds = new THREE.Box3().setFromObject(locomotive);
  const placedCenter = placedBounds.getCenter(new THREE.Vector3());
  const placedSize = placedBounds.getSize(new THREE.Vector3());
  trainBodyOffset.copy(placedCenter).sub(locomotive.position);
  trainBodyHalfExtents.set(
    Math.max(placedSize.x * 0.48, 0.6),
    Math.max(placedSize.y * 0.48, 0.4),
    Math.max(placedSize.z * 0.42, 0.35)
  );
  updateTrainFocusPoint();
};

const horn = useContinuous("trainHorn");

const createTrainTracks = () => {
  const railGeometry = new THREE.BoxGeometry(500, 0.1, 0.1);
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.4,
    metalness: 0.8,
  });
  const leftRail = new THREE.Mesh(railGeometry, railMaterial);
  leftRail.position.set(0, 0.05, -0.3);
  leftRail.receiveShadow = true;
  scene.add(leftRail);
  const rightRail = new THREE.Mesh(railGeometry, railMaterial);
  rightRail.position.set(0, 0.05, 0.3);
  rightRail.receiveShadow = true;
  scene.add(rightRail);
  const sleeperGeometry = new THREE.BoxGeometry(0.3, 0.08, 1.8);
  const sleeperMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.9,
    metalness: 0.0,
  });
  for (let i = -250; i < 250; i += 1.5) {
    const sleeper = new THREE.Mesh(sleeperGeometry, sleeperMaterial);
    sleeper.position.set(i, 0.02, 0);
    sleeper.receiveShadow = true;
    scene.add(sleeper);
  }
};

const createObstacleField = () => {
  if (!trainPhysics.physicsWorld || !physicsBlocksGroup || physicsBlocks.length > 0) return;
  const startPos = new THREE.Vector3(BLOCKS_START_X, 0.01, 0);
  trainPhysics.createPhysicsBlocks(trainPhysics.physicsWorld, STONE_COUNT, startPos);
  trainPhysics.blockRenderMeshesRef.meshes.forEach((renderMesh) => {
    physicsBlocksGroup!.add(renderMesh);
    physicsBlocks.push(renderMesh);
  });
  const speedFactor = Math.min(Math.abs(currentGear.value.speed) / MAX_GEAR_ABS_SPEED, 1);
  trainPhysics.setBlockBounceProfile(trainPhysics.blocksRef.blocks, speedFactor);
};

const clearObstacleField = () => {
  physicsBlocks.forEach((mesh) => {
    physicsBlocksGroup?.remove(mesh);
    if ("geometry" in mesh && mesh.geometry) mesh.geometry.dispose();
    if ("material" in mesh && mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach((mat) => mat.dispose());
      else mesh.material.dispose();
    }
  });
  physicsBlocks = [];
  trainPhysics.blocksRef.blocks = [];
  trainPhysics.blockRenderMeshesRef.meshes = [];
};

const toggleFullscreen = async () => await toggle();

const togglePhysics = async () => {
  physicsMode.value = !physicsMode.value;
  if (!physicsMode.value) {
    currentGearIndex.value = 0;
    wheelSpeed.value = 0;
    locomotiveSpeed.value = 0;
    motionTweens.speed?.kill();
    motionTweens.rpm?.kill();
    return;
  }
  try {
    await trainPhysics.initPhysics();
    if (trainPhysics.physicsWorld && locomotive) {
      if (terrain) {
        terrain.setPhysics(trainPhysics.physicsWorld, trainPhysics.rapier);
        terrain.initPhysics();
      }
      if (!trainPhysicsBody) {
        if (!terrain || !terrain.collider) trainPhysics.createGroundCollider(trainPhysics.physicsWorld);
        trainPhysicsBody = trainPhysics.createTrainBody(
          trainPhysics.physicsWorld,
          locomotive.position.clone().add(trainBodyOffset),
          { halfExtents: trainBodyHalfExtents.clone() }
        );
      }
      syncTrainBodyFromVisual();
      if (showBlocks.value) createObstacleField();
    }
  } catch (error) {
    console.error("Failed to initialize physics:", error);
    physicsMode.value = false;
  }
};

const toggleBlocks = () => {
  if (!physicsMode.value || !trainPhysics.physicsWorld || !locomotive || !physicsBlocksGroup) return;
  showBlocks.value = !showBlocks.value;
  if (showBlocks.value) createObstacleField();
  else clearObstacleField();
};

const toggleWheelSpin = () => {
  if (!locomotive) return;
  wheelSpinMode.value = !wheelSpinMode.value;
  wheelSpinGSAPRef.ref.forEach((tween) => tween.kill());
  wheelSpinGSAPRef.ref = [];
  motionTweens.speed?.kill();
  motionTweens.rpm?.kill();
  if (wheelSpinMode.value) {
    currentGearIndex.value = 0;
    wheelSpeed.value = 90;
    locomotiveSpeed.value = 0;
    wheelSpinGSAPRef.ref = trainPhysics.startWheelSpin(locomotive, wheelSpeed.value);
    return;
  }
  wheelSpeed.value = 0;
};

const cycleGear = () => {
  if (!locomotive || !trainPhysics.physicsWorld || !trainPhysicsBody) return;
  const oldSpeed = locomotiveSpeed.value;
  currentGearIndex.value = (currentGearIndex.value + 1) % gearPhases.length;
  const newSpeed = currentGear.value.speed;
  syncTrainBodyFromVisual();
  if (Math.abs(newSpeed) < Math.abs(oldSpeed) - 0.5) playSound("trainBrakes");
  motionTweens.speed?.kill();
  motionTweens.rpm?.kill();
  motionTweens.bend?.kill();
  motionTweens.lifeSpeed?.kill();
  const duration = 4.5;
  const ease = "power1.inOut";
  motionTweens.speed = useGSAP().to(locomotiveSpeed, { value: newSpeed, duration, ease });
  motionTweens.rpm = useGSAP().to(wheelSpeed, { value: currentGear.value.rpm, duration, ease });
  const targetBend = THREE.MathUtils.degToRad(SMOKE_BEND_ANGLE_BY_GEAR[currentGear.value.key]);
  motionTweens.bend = useGSAP().to(smokeBendAngle, { value: targetBend, duration, ease });
  const targetLifeSpeed = SMOKE_LIFE_SPEED_BY_GEAR[currentGear.value.key];
  motionTweens.lifeSpeed = useGSAP().to(smokeLifeSpeed, { value: targetLifeSpeed, duration, ease });
  const speedFactor = Math.min(Math.abs(currentGear.value.speed) / MAX_GEAR_ABS_SPEED, 1);
  trainPhysics.setBlockBounceProfile(trainPhysics.blocksRef.blocks, speedFactor);
};

const animate = (elapsedMs: number) => {
  animationId = requestAnimationFrame(animate);
  ticker.update(elapsedMs);

  const wheelSound = getSound("trainWheels");
  if (wheelSound) {
    const absSpeed = Math.abs(locomotiveSpeed.value);
    wheelSound.volume(THREE.MathUtils.mapLinear(absSpeed, 0, MAX_GEAR_ABS_SPEED, 0, 0.3));// TODO: was 6 but too
    wheelSound.rate(THREE.MathUtils.mapLinear(absSpeed, 0, MAX_GEAR_ABS_SPEED, 0.5, 1.1));
  }

  const engineSound = getSound("trainEngine");
  if (engineSound) {
    let targetRate = 0.8, targetVol = 0.3;
    const absSpeed = Math.abs(locomotiveSpeed.value);
    if (currentGear.value.key === "high") {
      targetRate = THREE.MathUtils.mapLinear(absSpeed, 3.5, 6.8, 1.1, 1.4);
      targetVol = THREE.MathUtils.mapLinear(absSpeed, 3.5, 6.8, 0.45, 0.6);
    } else {
      targetRate = THREE.MathUtils.mapLinear(absSpeed, 0, 3.5, 0.8, 1.1);
      targetVol = THREE.MathUtils.mapLinear(absSpeed, 0, 3.5, 0.3, 0.45);
    }
    engineSound.rate(targetRate);
    engineSound.volume(targetVol);
  }

  // Update smoke and sky
  if (smokeMaterial) {
    smokeMaterial.uniforms.uTime.value = ticker.elapsed;

    // Drive smoke bend by actual locomotive speed (heavy mass simulation)
    // Forward (negative speed) tilts right, Backward (positive) tilts left
    let targetBendDeg = 0;
    if (locomotiveSpeed.value < 0) {
      // Mapping forward speed (-6.8 max) to 90 degrees tilt
      targetBendDeg = THREE.MathUtils.mapLinear(
        locomotiveSpeed.value,
        0,
        -6.8,
        0,
        80
      );
    } else {
      // Mapping backward speed (2.4 max) to -45 degrees tilt
      targetBendDeg = THREE.MathUtils.mapLinear(
        locomotiveSpeed.value,
        0,
        2.4,
        0,
        -45
      );
    }

    const targetBendRad = THREE.MathUtils.degToRad(targetBendDeg);
    const lerpT = Math.min(ticker.delta * SMOKE_BEND_SMOOTHING, 1);
    smokeBendAngle.value = THREE.MathUtils.lerp(
      smokeBendAngle.value,
      targetBendRad,
      lerpT
    );
    smokeMaterial.uniforms.uWindBendAngle.value = smokeBendAngle.value;

    // Drive smoke life speed (intensity) by speed as well
    // It stays at 1.0 until speed exceeds medium forward, then ramps to 1.1
    const lifeSpeedTarget =
      locomotiveSpeed.value < -3.5
        ? THREE.MathUtils.mapLinear(locomotiveSpeed.value, -3.5, -6.8, 1.0, 1.1)
        : 1.0;

    // Lerp the life speed as well for extra smoothness when stopping
    const currentLifeSpeed = smokeMaterial.uniforms.uLifeSpeed.value;
    smokeMaterial.uniforms.uLifeSpeed.value = THREE.MathUtils.lerp(
      currentLifeSpeed,
      lifeSpeedTarget,
      lerpT
    );
  }

  if (skyMesh) skyMesh.position.copy(camera.position);

  if (physicsMode.value && trainPhysics.physicsWorld && trainPhysicsBody) {
    trainPhysics.stepPhysics(trainPhysics.physicsWorld, ticker.delta, (stepDt) => {
      const distanceDelta = locomotiveSpeed.value * stepDt;
      if (!wheelSpinMode.value && Math.abs(distanceDelta) > 0.0001) {
        const physicsPos = trainPhysicsBody.translation();
        const nextX = physicsPos.x + distanceDelta, nextZ = physicsPos.z;
        trainPhysicsBody.setNextKinematicTranslation({ x: nextX, y: (terrain ? terrain.getHeightAt(nextX, nextZ) : 0) + trainBodyHalfExtents.y, z: nextZ });
        trainPhysics.rotateWheelsByDistance(locomotive, distanceDelta);
      }
      trainPhysics.applyTrainSeparationForces(trainPhysics.blocksRef.blocks, trainPhysicsBody, locomotiveSpeed.value, stepDt, () => playWithVariation("brickHit"));
    });
    trainPhysics.updatePhysicsBlocks(trainPhysics.blocksRef.blocks);
    syncLocomotiveFromPhysics();
    if (Math.abs(locomotiveSpeed.value) > 0.0001) syncCameraToTrain(true);
  }

  // Respawn dead particles
  if (smokeParticles) {
    const positions = smokeParticles.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const age = ticker.elapsed - smokeBirths[i];
      if (age > smokeLifespans[i]) {
        // --- RESPAWN TIMING ---
        // Small stagger delay prevents clumping
        smokeBirths[i] = ticker.elapsed + Math.random() * 1.5;
        // Smoke height control:
        // longer lifespan = particles survive longer and rise higher.
        // Example:
        // Shorter plume: SMOKE_LIFETIME + Math.random() * 1.0
        // Taller plume:  SMOKE_LIFETIME + Math.random() * 2.0
        smokeLifespans[i] = SMOKE_LIFETIME + Math.random() * 2.0;

        // --- RESPAWN POSITION (local space) ---
        positions[i * 3] = (Math.random() - 0.5) * 0.25;
        positions[i * 3 + 1] = Math.random() * 0.2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.25;

        // --- RESPAWN VELOCITY ---
        smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
        // Main smoke height control for respawned particles.
        // Example:
        // Lower plume:  0.3 + Math.random() * 0.25
        // Taller plume: 0.8 + Math.random() * 0.25
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
  }

  if (controls) controls.update();
  renderer.render(scene, camera);
  skyInstance?.update(camera);
};

const handleResize = () => {
  if (!containerRef.value || !renderer || !camera) return;
  const width = containerRef.value.clientWidth, height = containerRef.value.clientHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);
  sizes.resolution.set(width * sizes.pixelRatio, height * sizes.pixelRatio);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(sizes.pixelRatio);

  // Update shader uniform
  if (smokeMaterial) {
    smokeMaterial.uniforms.uResolution.value.copy(sizes.resolution);
  }
};

const handleKeydown = (e: KeyboardEvent) => { if (!e.repeat && e.key.toLowerCase() === "h") horn.start(); };
const handleKeyup = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "h") horn.stop(); };

onMounted(async () => {
  if (!containerRef.value || !canvasRef.value) return;
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("keyup", handleKeyup);
  getSound("trainWheels")?.play();

  const container = containerRef.value, canvas = canvasRef.value;
  scene = new THREE.Scene();
  skyInstance = useSky(scene, { sunDirection: new THREE.Vector3(-0.5, 0.15, -0.5).normalize() });
  if (skyInstance) skyMesh = skyInstance.mesh;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const width = container.clientWidth, height = container.clientHeight;
  sizes.width = width; sizes.height = height;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);
  sizes.resolution.set(width * sizes.pixelRatio, height * sizes.pixelRatio);
  renderer.setSize(width, height);
  renderer.setPixelRatio(sizes.pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;

  camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
  camera.position.set(5, 2.3, 2.5);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  const loader = new GLTFLoader(), dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/assets/three/draco/gltf/");
  loader.setDRACOLoader(dracoLoader);

  try {
    const gltf = await new Promise<any>((resolve, reject) => { loader.load("/assets/three/resources/Locomotive.glb", resolve, undefined, reject); });
    locomotive = gltf.scene;
    scene.add(locomotive);
    const box = new THREE.Box3().setFromObject(locomotive), size = box.getSize(new THREE.Vector3());
    locomotive.scale.setScalar(3 / Math.max(size.x, size.y, size.z));
    placeLocomotiveOnTrack();

    let headlightMesh: THREE.Mesh | null = null;
    let chimneySteamPipeMesh: THREE.Mesh | null = null;
    locomotive.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.name === "Forward-light") headlightMesh = child;
        if (child.name === "chimney-steam-pipe") chimneySteamPipeMesh = child;
      }
    });
    if (headlightMesh) {
      const mat = headlightMesh.material as THREE.MeshStandardMaterial;
      if (mat.emissive) { mat.emissiveIntensity = 1.0; mat.envMapIntensity = 0.8; }
      const beam = new THREE.SpotLight(0xffeedd, 80, 8, Math.PI / 8, 0.1, 1.5);
      beam.position.set(0, 0, 0);
      beam.target.position.set(Math.sin(-Math.PI / 2) * 1.5, -0.5, Math.cos(-Math.PI / 2) * 1.5);
      beam.castShadow = true;
      headlightMesh.add(beam); headlightMesh.add(beam.target);
    }

    // Create smoke particle system at chimney position
    if (chimneySteamPipeMesh) {
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
        // Example:
        // Shorter plume: SMOKE_LIFETIME + Math.random() * 1.0
        // Taller plume:  SMOKE_LIFETIME + Math.random() * 2.0
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
        // Example:
        // Lower plume:  0.3 + Math.random() * 0.25
        // Taller plume: 0.8 + Math.random() * 0.25
        // Current value is raised to make the smoke reach about 2 units higher.
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
          uResolution: { value: sizes.resolution.clone() },
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
      chimneySteamPipeMesh.add(smokeParticles);
    }

    terrain = new Terrain(scene);
    await terrain.load("/terrain/terrain.glb", "/terrain/terrain.png");
    physicsBlocksGroup = new THREE.Group();
    scene.add(physicsBlocksGroup);
    createTrainTracks();
  } catch (error) { console.error("Error loading locomotive model:", error); }

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.copy(trainFocusPoint);
  syncCameraToTrain();

  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);
  window.addEventListener("resize", handleResize);
  animate(0);
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("keyup", handleKeyup);
  getSound("trainWheels")?.stop();
  resizeObserver?.disconnect();
  controls?.dispose();
  wheelSpinGSAPRef.ref.forEach((tween) => tween.kill());
  // smokeInstance?.dispose();
  skyInstance?.dispose();
  smokeMaterial?.dispose();
  renderer?.dispose();
  trainPhysics.cleanup();
  clearObstacleField();
  window.removeEventListener("resize", handleResize);
});
</script>

<style lang="scss" scoped>
div {
  width: 100%; height: 80dvh; position: relative; transition: all 0.3s ease;
  &.is-fullscreen { position: fixed; top: 0; left: 0; width: 100dvw; height: 100dvh; z-index: 9999; background: #228b22; }
  // @include mobile { overflow-y: scroll; padding-bottom: 10dvh; }
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  @include mobile {
    width: calc(100dvw - 30px);
    height: calc(100dvh - 90px);
    position: fixed;
  }
}

.fullscreen-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
  backdrop-filter: blur(4px);

  @include mobile {
    bottom: 15%;
    // should be hidden after 5 seconds on focused
  }

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  &:active {
    background: rgba(0, 0, 0, 0.9);
  }
}

.controls-container {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  gap: 8px;
  pointer-events: none;
  justify-content: flex-start;
  align-items: flex-end;
  height: 50px;

  .speed-display {
    text-align: center;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 12px;
    border-radius: 8px;
    height: 25px;
    min-width: 30px;
    max-width: 45px;
    line-height: 25px;
  }

  @include mobile {
    left: 8px;
    bottom: 15%;
    height: 60px;
    gap: 4px;
  }
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  font-size: 14px;
  font-weight: 500;
  pointer-events: auto;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.8);
  }

  &:active:not(:disabled) {
    background: rgba(0, 0, 0, 0.9);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.active {
    background: rgba(0, 128, 255, 0.6);

    &:hover:not(:disabled) {
      background: rgba(0, 128, 255, 0.8);
    }
  }

  &.primary {
    background: rgba(0, 200, 83, 0.7);

    &:hover:not(:disabled) {
      background: rgba(0, 200, 83, 0.9);
    }
  }

  .btn-text {
    @include mobile {
      display: none;
    }
  }
}

body.fullscreen-active {
  overflow: hidden !important;

  ::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    background: transparent !important;
  }

  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
