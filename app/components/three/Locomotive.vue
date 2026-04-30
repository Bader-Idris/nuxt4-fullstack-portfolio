<template>
  <div ref="containerRef" :class="{ 'is-fullscreen': modelFullscreen }">
    <ThreeTrainLoader :loading="isLoading" :progress="loadProgress" />
    <canvas ref="canvasRef" />

    <div class="controls-container">
      <!-- Blocks toggle – requires physics to be initialised first -->
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

      <!-- Wheel-spin mode: makes wheels spin in place without moving the train -->
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

      <!-- Gear cycling – always visible once a gear is defined -->
      <button
        v-if="currentGear"
        class="control-btn primary"
        :aria-label="`Change train gear. Current gear ${currentGear.label}`"
        :disabled="wheelSpinMode || !physicsMode"
        @click="cycleGear"
      >
        <Icon name="mdi:car-shift-pattern" size="24" />
        <span class="btn-text"
          >GEAR: {{ currentGear.label.toUpperCase() }}</span
        >
      </button>

      <!-- Speed / RPM overlay: always shown once physics is running -->
      <div v-if="currentGear" class="speed-display">
        <div class="speed-value">{{ wheelSpeed.toFixed(1) }}</div>
        <div class="speed-label">RPM</div>
        <div v-if="wheelSpinMode" class="speed-mode">WHEEL SPIN</div>
        <div v-else-if="physicsMode" class="speed-mode">
          GEAR {{ currentGear.label.toUpperCase() }}
        </div>
      </div>
 
      <!-- Terrain Only Collision Mode: Debug helper -->
       <button
        class="control-btn warning"
        :class="{ active: terrainOnlyMode }"
        aria-label="Toggle terrain-only collision"
        :disabled="!physicsMode"
        @click="toggleTerrainOnly"
      >
        <Icon :name="terrainOnlyMode ? 'mdi:terrain' : 'mdi:layers-outline'" size="24" />
        <span class="btn-text">{{
          terrainOnlyMode ? "TERRAIN ONLY" : "ALL COLLISIONS"
        }}</span>
      </button>  

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
// use then one in camera instead!!
// import { RuntimeInspector } from "@needle-tools/engine";

import type {  OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { useFullscreen } from "@vueuse/core";
import { useSound } from "@/composables/useSound";
import { useTerrain } from "@/composables/threeD/useTerrain";
import { useWater } from "@/composables/threeD/useWater";
import { useGrass } from "@/composables/threeD/useGrass";
import { useSlabs } from "@/composables/threeD/useSlabs";
import { useTrainPhysics } from "@/composables/threeD/useTrainPhysics";
import { useTrainBricks } from "@/composables/threeD/useTrainBricks";
import { useSky } from "@/composables/threeD/useSky";
import { useChimneySteam } from "@/composables/threeD/useChimneySteam";
import { useInteraction } from "@/composables/threeD/useInteraction";
import { useCamera } from "@/composables/threeD/useCamera";

const chimneySteam = useChimneySteam();
const { smokeBendAngle, smokeLifeSpeed, SMOKE_BEND_ANGLE_BY_GEAR, SMOKE_LIFE_SPEED_BY_GEAR } = chimneySteam;

const isLoading = ref(true);
const loadProgress = ref(0);

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
const terrainOnlyMode = ref(false);
const wheelSpinMode = ref(false);
const wheelSpeed = ref(0);
const locomotiveSpeed = ref(0);
const motionTweens = {
  speed: null as any,
  rpm: null as any,
  bend: null as any,
  lifeSpeed: null as any,
};
const wheelSpinGSAPRef = { ref: [] as any[] };
const gearPhases = [
  { key: "idle", label: "idle", speed: 0, rpm: 0 },
  { key: "medium", label: "medium", speed: 3.5, rpm: 90 },
  { key: "high", label: "high", speed: 6.8, rpm: 160 },
  { key: "idle", label: "idle", speed: 0, rpm: 0 },
  { key: "backward", label: "backward", speed: -2.4, rpm: 45 },
] as const;
const currentGearIndex = ref(0);
const currentGear = computed(() => gearPhases[currentGearIndex.value]!);
const MAX_GEAR_ABS_SPEED =
  Math.max(...gearPhases.map((phase) => Math.abs(phase.speed))) || 1;

// VueUse useFullscreen bound to containerRef
const { toggle } = useFullscreen(containerRef, { autoExit: true });

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let cameraInstance: ReturnType<typeof useCamera> | null = null;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let locomotive: THREE.Object3D;
let areas: THREE.Group;
let colarCargo: THREE.Group;
let _areasMesh: THREE.Object3D | null = null;
let animationId: number;
let skyMesh: THREE.Mesh | null = null;
let skyInstance: ReturnType<typeof useSky> | null = null;
// let smokeInstance: ReturnType<typeof useSmokeParticles> | null = null;
let waterInstance: ReturnType<typeof useWater> | null = null;
let grassInstance: ReturnType<typeof useGrass> | null = null;
let slabsInstance: ReturnType<typeof useSlabs> | null = null;
let interactionInstance: ReturnType<typeof useInteraction> | null = null;
let terrainNormalHelper: THREE.ArrowHelper | null = null;

let trainCurve: THREE.CatmullRomCurve3 | null = null;
let trainProgress = 0;
let trainCurveLength = 0;
const _trainOrientation = new THREE.Quaternion();

// let inspector: any = null;
let resizeObserver: ResizeObserver | null = null;
let physicsBlocksGroup: THREE.Group | null = null;
// Note: block render meshes are now tracked in trainBricks.blockRenderMeshesRef
let trainPhysicsBody: any = null;
let terrain: any = null;
const { Terrain } = useTerrain();
const trainBodyOffset = new THREE.Vector3();
const trainBodyHalfExtents = new THREE.Vector3(1.2, 0.7, 0.6);
// Y distance from the 'Locomotive' empty origin down to the rail surface.
// The empty sits above the mesh in Blender; we preserve this so the model
// never sinks underground when snapped onto the CatmullRom curve.
let heightAboveRail = 1;

// +1 = follow increasing t, -1 = follow decreasing t.
// Computed once in placeLocomotiveOnTrack by comparing the model's authored
// forward direction with the path tangent. Fixes the backward-travel bug when
// the angular sort produces a path whose "increasing t" opposes the locomotive.
let pathDirectionSign = 1;

// Smoothed quaternion applied to the kinematic body every physics step.
// Lerped toward the wide-window target so path jitter never reaches the visual.
const smoothedBodyQuat = new THREE.Quaternion();
let smoothedQuatReady = false;
// Last accepted smoothed tangent – used to detect 180° flip artifacts in the
// imperfectly sorted rail_sleeper path and correct them before they are applied.
const prevSmoothTangent = new THREE.Vector3(0, 0, 1);
const trainFocusPoint = new THREE.Vector3();
const _trainStartPosition = new THREE.Vector3(20, 0, 0);

const GROUND_Y = 0;
const _TRACK_CENTER_Z = 0;

// Physics engine instance – world management only (bricks managed by trainBricks)
const trainPhysics = useTrainPhysics();
// Brick obstacles along the path
const trainBricks = useTrainBricks();

const ticker = {
  elapsed: 0,
  delta: 1 / 60,
  maxDelta: 1 / 30,
  verticalVelocity: 0,
  storedFall: 0,
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

// was completely removed, maybe moved to useCamera!?
const syncCameraToTrain = (followMotion: boolean = false) => {
  if (!cameraInstance || !locomotive) return;
  updateTrainFocusPoint();
  cameraInstance.update(trainFocusPoint, followMotion);
};

const syncTrainBodyFromVisual = () => {
  if (!locomotive || !trainPhysicsBody) return;
  const targetPosition = locomotive.position.clone().add(trainBodyOffset);
  trainPhysicsBody.setTranslation(targetPosition, true);
  trainPhysicsBody.setNextKinematicTranslation(targetPosition);
  // Sync rotation so the first syncLocomotiveFromPhysics() call doesn't snap to identity
  trainPhysicsBody.setRotation(locomotive.quaternion, true);
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
  const physicsRot = trainPhysicsBody.rotation();
  locomotive.quaternion.set(physicsRot.x, physicsRot.y, physicsRot.z, physicsRot.w);
  updateTrainFocusPoint();
};

const locomotiveInitialPos = new THREE.Vector3();
const locomotiveInitialQuat = new THREE.Quaternion();
const trainOrientationCorrection = new THREE.Quaternion();

const placeLocomotiveOnTrack = () => {
  if (!locomotive) return;
  
  // Store original model transform from Blender once
  if (locomotiveInitialPos.lengthSq() === 0) {
    locomotiveInitialPos.copy(locomotive.position);
    locomotiveInitialQuat.copy(locomotive.quaternion);
    console.log("Locomotive loaded at:", locomotiveInitialPos);
  }

  if (trainCurve) {
    // Find the closest point on the curve to its Blender position to avoid jumps
    let minD = Infinity;
    let bestT = 0;
    const samples = 200;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = trainCurve.getPointAt(t);
      const d = p.distanceTo(locomotiveInitialPos);
      if (d < minD) {
        minD = d;
        bestT = t;
      }
    }
    trainProgress = bestT;
    
    const snappedPos = trainCurve.getPointAt(trainProgress);
    // Wide-window tangent: sample ±2.5 % of the curve around the snap point
    // so local vertex jitter in the rail_sleeper mesh doesn't skew the initial facing.
    const INIT_TD = 0.025;
    const tangent = trainCurve
      .getPointAt(Math.min(0.999, bestT + INIT_TD))
      .clone()
      .sub(trainCurve.getPointAt(Math.max(0.001, bestT - INIT_TD)))
      .normalize();

    // The 'Locomotive' empty was authored in Blender with its origin ABOVE the mesh.
    // Snapping it directly to the rail surface (snappedPos.y) would push the visible
    // geometry underground. We compute how high the empty sat above the rail in
    // Blender and preserve that offset for the entire journey.
    heightAboveRail = locomotiveInitialPos.y - snappedPos.y;
    locomotive.position.set(snappedPos.x, snappedPos.y + heightAboveRail, snappedPos.z);
    
    // Calculate relative orientation correction
    // We want to preserve the model's Blender rotation relative to the track tangent
    const lookAtMatrix = new THREE.Matrix4().lookAt(
      new THREE.Vector3(0, 0, 0), 
      tangent, 
      new THREE.Vector3(0, 1, 0)
    );
    const tangentQuat = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
    
    // correction = tangentInv * initialModelQuat
    // This way: currentTangentQuat * correction = initialModelQuat (at t=bestT)
    trainOrientationCorrection.copy(tangentQuat).invert().multiply(locomotiveInitialQuat);

    // Apply initial orientation
    locomotive.quaternion.copy(tangentQuat).multiply(trainOrientationCorrection);

    // Detect which direction to traverse the path.
    // The angular sort produces a counter-clockwise loop; the locomotive's
    // Blender-authored forward (-Z in Three.js lookAt convention) may point
    // WITH or AGAINST increasing-t.  Measure the dot product and store the sign
    // so the animate loop always moves the train in the correct direction and
    // orients it to face the direction of travel.
    // User hint: forward is decreasing Z. In Three.js, forward is usually (0, 0, -1).
    const modelFwd = new THREE.Vector3(0, 0, 0).applyQuaternion(locomotiveInitialQuat);
    pathDirectionSign = modelFwd.dot(tangent) >= 0 ? 1 : -1;
    console.log(
      `Path direction sign: ${pathDirectionSign}`,
      `(model·tangent = ${modelFwd.dot(tangent).toFixed(3)})`
    );

    // Reset orientation smoother so it re-initialises from the correct placement
    // rather than slewing from an old value when the scene is re-entered.
    smoothedQuatReady = false;
    prevSmoothTangent.copy(tangent.clone().multiplyScalar(pathDirectionSign));
    
    // Calculate body offset for focus point and physics
    const modelBounds = new THREE.Box3().setFromObject(locomotive);
    const modelCenter = modelBounds.getCenter(new THREE.Vector3());
    trainBodyOffset.copy(modelCenter).sub(locomotive.position);
    
    const placedSize = modelBounds.getSize(new THREE.Vector3());
    trainBodyHalfExtents.set(
      Math.max(placedSize.x * 0.48, 0.6),
      Math.max(placedSize.y * 0.48, 0.4),
      Math.max(placedSize.z * 0.42, 0.35)
    );
  } else {
    // Fallback: Stay at Blender position, just handle terrain height
    const terrainHeight = terrain
      ? terrain.getHeightAt(locomotiveInitialPos.x, locomotiveInitialPos.z)
      : 0;
    
    locomotive.position.y = (locomotiveInitialPos.y || GROUND_Y) + terrainHeight;
    locomotive.quaternion.copy(locomotiveInitialQuat);
    
    const modelBounds = new THREE.Box3().setFromObject(locomotive);
    const modelCenter = modelBounds.getCenter(new THREE.Vector3());
    const placedSize = modelBounds.getSize(new THREE.Vector3());
    
    trainBodyOffset.copy(modelCenter).sub(locomotive.position);
    trainBodyHalfExtents.set(
      Math.max(placedSize.x * 0.48, 0.6),
      Math.max(placedSize.y * 0.48, 0.4),
      Math.max(placedSize.z * 0.42, 0.35)
    );
  }
  updateTrainFocusPoint();
};

const horn = useContinuous("trainHorn");

// Kept for reference – replaced by tracks embedded in areas.glb
const _createTrainTracks = () => {
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

// Fullscreen toggle – delegates to VueUse useFullscreen
const toggleFullscreen = async () => await toggle();

// Rail sleeper meshes: used for path extraction + static physics trimesh colliders
const railSleeperMeshes: THREE.Mesh[] = [];
// Rapier colliders for rail meshes – stored for cleanup on physics reset
const railColliders = ref<any[]>([]);

/**
 * Auto-initialises physics once after models load.
 * Physics is ALWAYS active – no manual toggle needed.
 */
const initPhysicsMode = async () => {
  if (physicsMode.value) return; // Already initialised

  try {
    await trainPhysics.initPhysics();

    if (trainPhysics.physicsWorld && locomotive) {
      // Connect terrain height-map to physics world
      if (terrain) {
        terrain.setPhysics(trainPhysics.physicsWorld, trainPhysics.rapier);
        terrain.initPhysics();
        // Set terrain collision groups to be recognized by the train
        if (terrain.collider) {
          const { COLLISION_GROUPS } = trainPhysics;
          terrain.collider.setCollisionGroups(
            (COLLISION_GROUPS.TERRAIN << 16) | COLLISION_GROUPS.TRAIN | COLLISION_GROUPS.BRICK
          );
        }
      }

      if (!trainPhysicsBody) {
        // Fall back to a flat ground plane if terrain has no physics collider
        if (!terrain || !terrain.collider) {
          trainPhysics.createGroundCollider(trainPhysics.physicsWorld);
        }
        trainPhysicsBody = trainPhysics.createTrainBody(
          trainPhysics.physicsWorld,
          locomotive.position.clone().add(trainBodyOffset),
          { halfExtents: trainBodyHalfExtents.clone() }
        );
      }

      // Sync visual transform → physics body (includes rotation, preventing snap)
      syncTrainBodyFromVisual();

      // Create static trimesh colliders for all rail sleeper meshes
      // so bricks can land and slide on the rails naturally
      railSleeperMeshes.forEach((mesh) => {
        if (trainPhysics.physicsWorld) {
          const collider = trainPhysics.createStaticTrimesh(trainPhysics.physicsWorld, mesh);
          railColliders.value.push(collider);
        }
      });

      // Place 5 brick walls along the journey path for an amusing ride
      if (showBlocks.value && physicsBlocksGroup && trainCurve && trainPhysics.rapier) {
        const trackY = trainCurve.getPointAt(0).y;
        trainBricks.createBrickSetsAlongPath(
          trainPhysics.physicsWorld,
          trainPhysics.rapier,
          trainCurve,
          5,
          physicsBlocksGroup,
          trackY
        );
        const speedFactor = Math.min(Math.abs(currentGear.value.speed) / MAX_GEAR_ABS_SPEED, 1);
        trainBricks.setBlockBounceProfile(trainBricks.blocksRef.blocks, speedFactor);
      }

      physicsMode.value = true;
      console.log("Physics initialised – locomotive is on rails.");
    }
  } catch (error) {
    console.error("Failed to initialise physics:", error);
  }
};

const toggleBlocks = () => {
  if (!physicsMode.value || !trainPhysics.physicsWorld || !locomotive || !physicsBlocksGroup) return;
  showBlocks.value = !showBlocks.value;

  if (showBlocks.value) {
    // Recreate brick walls along the path
    if (trainCurve && trainPhysics.rapier) {
      const trackY = trainCurve.getPointAt(0).y;
      trainBricks.createBrickSetsAlongPath(
        trainPhysics.physicsWorld,
        trainPhysics.rapier,
        trainCurve,
        5,
        physicsBlocksGroup,
        trackY
      );
      const speedFactor = Math.min(Math.abs(currentGear.value.speed) / MAX_GEAR_ABS_SPEED, 1);
      trainBricks.setBlockBounceProfile(trainBricks.blocksRef.blocks, speedFactor);
    }
  } else {
    // Remove all bricks from scene and physics world
    trainBricks.clearAllBlocks(physicsBlocksGroup, trainPhysics.physicsWorld);
  }
};

const toggleTerrainOnly = () => {
  if (!physicsMode.value) return;
  terrainOnlyMode.value = !terrainOnlyMode.value;
  trainPhysics.setCollisionFilter(terrainOnlyMode.value);
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
  // Adjust brick bounce profile to match new speed
  trainBricks.setBlockBounceProfile(trainBricks.blocksRef.blocks, speedFactor);
};

let knotMesh: THREE.Object3D | null = null;
const knotInitialPosition = new THREE.Vector3();

// ... (other refs)

const updateKnotSmoothly = () => {
  if (!knotMesh || trainPhysics.wheelMeshesRef.meshes.length === 0) return;
  
  const smallWheel = trainPhysics.wheelMeshesRef.meshes.find(w => w.wheel.name === 'SmallWheels_2');
  if (smallWheel) {
    const angle = smallWheel.mesh.rotation.z;
    const amplitude = 0.235; 
    
    // We use GSAP to set the values for slightly better interpolation/sub-frame consistency 
    // although for physics we might still stay frame-bound.
    useGSAP().set(knotMesh.position, {
      x: knotInitialPosition.x + Math.cos(angle) * amplitude,
      y: knotInitialPosition.y - Math.sin(angle) * amplitude,
      overwrite: 'auto'
    });
  }
};

const animate = (elapsedMs: number) => {
  animationId = requestAnimationFrame(animate);
  ticker.update(elapsedMs);

  const camDist = locomotive ? camera.position.distanceTo(locomotive.position) : 0;
  const isFar = camDist > 50;
  const isVeryFar = camDist > 120;

  // Update interaction texture - only if close enough to see effects clearly
  if (interactionInstance && locomotive && !isVeryFar) {
    interactionInstance.update(locomotive.position);
  }

  const wheelSound = getSound("trainWheels");
  if (wheelSound) {
    const absSpeed = Math.abs(locomotiveSpeed.value);
    wheelSound.volume(
      THREE.MathUtils.mapLinear(absSpeed, 0, MAX_GEAR_ABS_SPEED, 0, 0.3)
    ); // TODO: was 6 but too
    wheelSound.rate(
      THREE.MathUtils.mapLinear(absSpeed, 0, MAX_GEAR_ABS_SPEED, 0.5, 1.1)
    );
  }

  const engineSound = getSound("trainEngine");
  if (engineSound) {
    let targetRate = 0.8,
      targetVol = 0.3;
    const absSpeed = Math.abs(locomotiveSpeed.value);
    if (currentGear.value?.key === "high") {
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
  // THROTTLE: Only update smoke logic fully if not very far
  chimneySteam.update(ticker.elapsed, ticker.delta, locomotiveSpeed.value, camDist);

  if (skyMesh) skyMesh.position.copy(camera.position);

  // Animate Knot mechanical linkage smoothly
  // CPU OPTIMIZATION: Skip linkage animation if far away
  if (!isFar) {
    updateKnotSmoothly();
  }

  if (physicsMode.value && trainPhysics.physicsWorld && trainPhysicsBody) {
    trainPhysics.stepPhysics(trainPhysics.physicsWorld, ticker.delta, (stepDt) => {
      // distanceDelta is positive for forward movement
      const distanceDelta = locomotiveSpeed.value * stepDt;

      if (!wheelSpinMode.value) {
        // ── Advance curve progress when moving ──────────────────────────────
        // pathDirectionSign flips the increment direction so the locomotive
        // always moves forward (in its authored facing direction) when speed > 0.
        // We only advance progress if NOT in terrain-only debug mode OR if we want to follow the loop path at ground level.
        // The user wants to know if it moves in the "correct direction", so moving along the curve is still useful,
        // but let's make it follow the terrain height.
        if (Math.abs(distanceDelta) > 0.0001 && trainCurve && trainCurveLength > 0) {
          trainProgress += pathDirectionSign * distanceDelta / trainCurveLength;
          // Wrap around for a continuous loop
          while (trainProgress < 0) trainProgress += 1;
          while (trainProgress > 1) trainProgress -= 1;
        }

        // ── Always lock kinematic body to the curve (even at idle) ──────────
        // This prevents the body from drifting when syncLocomotiveFromPhysics
        // reads it back, which would cause a snap to identity rotation.
        if (trainCurve && trainCurveLength > 0 && !terrainOnlyMode.value) {
          const targetPos = trainCurve.getPointAt(trainProgress);

          // ── Position ────────────────────────────────────────────────────────
          // The empty sits heightAboveRail above the rail; add that before trainBodyOffset
          // so the physics body centre lands at the correct world-space height.
          const bodyTargetPos = new THREE.Vector3(
            targetPos.x + trainBodyOffset.x,
            targetPos.y + heightAboveRail + trainBodyOffset.y,
            targetPos.z + trainBodyOffset.z
          );
          trainPhysicsBody.setNextKinematicTranslation(bodyTargetPos);

          // ── Orientation (wide-window tangent + direction sign + flip guard + slerp) ──
          // Sample the curve ±TD on either side of the current position and use
          // the chord as the tangent.  This averages out vertex-level jitter from
          // the imperfect rail_sleeper path extraction so the locomotive faces the
          // "major" track direction rather than per-point noise.
          const TD = 0.025; // look-ahead/behind window (2.5 % of full curve)
          const pAhead  = trainCurve.getPointAt(Math.min(0.999, trainProgress + TD));
          const pBehind = trainCurve.getPointAt(Math.max(0.001, trainProgress - TD));
          // Raw chord (always points in increasing-t direction)
          const rawTangent = pAhead.clone().sub(pBehind).normalize();
          // Apply path direction so this always points in the direction of travel
          const wideTangent = rawTangent.multiplyScalar(pathDirectionSign);

          //Flip guard: a sudden 180° reversal is a path-ordering artifact, not a
          // real track bend.  Negate the tangent to keep the heading continuous.
          if (smoothedQuatReady && prevSmoothTangent.dot(wideTangent) < 0) {
            wideTangent.negate();
          }
          prevSmoothTangent.copy(wideTangent);

          // Build the raw target quaternion from the wide tangent
          const lookAtMatrix = new THREE.Matrix4().lookAt(
            new THREE.Vector3(0, 0, 0),
            wideTangent,
            new THREE.Vector3(0, 1, 0)
          );
          const targetQuat = new THREE.Quaternion()
            .setFromRotationMatrix(lookAtMatrix)
            .multiply(trainOrientationCorrection);

          // Initialise on first valid frame, then slerp each step.
          // Rate = 5 rad/s → ~8 % progress per frame at 60 fps – smooth but
          // responsive enough to track gentle curves without visual lag.
          if (!smoothedQuatReady) {
            smoothedBodyQuat.copy(targetQuat);
            smoothedQuatReady = true;
          } else {
            smoothedBodyQuat.slerp(targetQuat, 1 - Math.exp(-5.0 * stepDt));
          }
          trainPhysicsBody.setNextKinematicRotation(smoothedBodyQuat);

          // Spin wheels proportional to distance travelled
          if (Math.abs(distanceDelta) > 0.0001) {
            trainPhysics.rotateWheelsByDistance(locomotive, distanceDelta);
          }
        } else if (terrainOnlyMode.value) {
          // ── TERRAIN ONLY DEBUG MODE ──
          // Moves strictly along its authored forward axis at the terrain height.
          // Includes smoothed gravity to avoid trembling on downhill slopes.
          const currentPos = trainPhysicsBody.translation();
          const currentRot = trainPhysicsBody.rotation();
          const currentQuat = new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w);
          
          // Authored forward is -Z
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(currentQuat).normalize();
          
          const nextX = currentPos.x + forward.x * distanceDelta;
          const nextZ = currentPos.z + forward.z * distanceDelta;
          const terrainY = terrain ? terrain.getHeightAt(nextX, nextZ) : 0;
          
          // Gravity and Fall Smoothing logic
          // Persist vertical state on ticker to avoid losing it across turns
          if (ticker.verticalVelocity === undefined) (ticker as any).verticalVelocity = 0;
          if ((ticker as any).storedFall === undefined) (ticker as any).storedFall = 0;

          const G = 9.81;
          const groundedY = terrainY + trainBodyOffset.y;
          const currentY = currentPos.y;
          
          if (currentY > groundedY + 0.01) {
            // Falling state: accumulate fall speed but smooth it
            const targetFall = -G * stepDt;
            ticker.storedFall = THREE.MathUtils.lerp(ticker.storedFall, targetFall, 0.1);
            ticker.verticalVelocity += ticker.storedFall;
          } else {
            // Grounded state - snap or gently push up
            ticker.verticalVelocity = 0;
            ticker.storedFall = 0;
          }

          let nextY = currentY + ticker.verticalVelocity;
          
          // Downhill snapping: prevent floating when ground drops away
          if (nextY < groundedY || (currentY <= groundedY + 0.05)) {
             nextY = THREE.MathUtils.lerp(nextY, groundedY, 0.2);
          }

          trainPhysicsBody.setNextKinematicTranslation({
            x: nextX,
            y: nextY,
            z: nextZ
          });
          
          if (Math.abs(distanceDelta) > 0.0001) {
            trainPhysics.rotateWheelsByDistance(locomotive, distanceDelta);
          }
        } else {
          // ── Fallback: straight-line movement along initial forward direction ─
          if (Math.abs(distanceDelta) > 0.0001) {
            const physicsPos = trainPhysicsBody.translation();
            // Authored forward is -Z
            const forward = new THREE.Vector3(0, 0, -1)
              .applyQuaternion(locomotiveInitialQuat)
              .normalize();
            trainPhysicsBody.setNextKinematicTranslation({
              x: physicsPos.x + forward.x * distanceDelta,
              y: (terrain
                ? terrain.getHeightAt(
                    physicsPos.x + forward.x * distanceDelta,
                    physicsPos.z + forward.z * distanceDelta
                  )
                : 0) + trainBodyOffset.y,
              z: physicsPos.z + forward.z * distanceDelta,
            });
            trainPhysicsBody.setNextKinematicRotation(locomotiveInitialQuat);
            trainPhysics.rotateWheelsByDistance(locomotive, distanceDelta);
          }
        }
      }

      // Apply wake turbulence impulses to bricks the train has just passed
      trainBricks.applyTrainSeparationForces(
        trainBricks.blocksRef.blocks,
        trainPhysicsBody,
        locomotiveSpeed.value,
        stepDt,
        () => playWithVariation("brickHit")
      );
    });

    // Sync instanced-mesh matrices to physics body transforms
    trainBricks.updatePhysicsBlocks(trainBricks.blocksRef.blocks);
    // Read back physics body position/rotation → visual locomotive
    syncLocomotiveFromPhysics();
    if (Math.abs(locomotiveSpeed.value) > 0.0001) syncCameraToTrain(true);
  }

  if (controls) controls.update();
  renderer.render(scene, camera);
  skyInstance?.update(camera);
  waterInstance?.update(ticker.elapsed, camera);

  // updateTrainFocusPoint();
  // cameraInstance.update(trainFocusPoint, Math.abs(locomotiveSpeed.value) > 0.0001);

  // renderer.render(scene, cameraInstance.camera);
  // skyInstance?.update(cameraInstance.camera);
  // waterInstance?.update(ticker.elapsed, cameraInstance.camera);
  grassInstance?.update(ticker.elapsed, camera.position);
};

const handleResize = () => {
  if (!containerRef.value || !renderer || !camera) return;
  // if (!containerRef.value || !renderer || !cameraInstance) return;
  const width = containerRef.value.clientWidth, height = containerRef.value.clientHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);
  sizes.resolution.set(width * sizes.pixelRatio, height * sizes.pixelRatio);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  // cameraInstance.handleResize(width, height);
  renderer.setSize(width, height);
  renderer.setPixelRatio(sizes.pixelRatio);

  // Update shader uniform
  chimneySteam.updateResolution(sizes.resolution);
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
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap is deprecated in latest Three.js

  // Enhanced Atmospheric Fog
  // We use linear fog to strictly hide the terrain edges at a certain distance
  // while keeping the foreground clear.
  const fogColor = new THREE.Color("#735233"); // Matches sky horizon
  scene.fog = new THREE.Fog(fogColor, 10, 250); // Start at 10, total fog at 250
  scene.background = fogColor; // Set background to fog color for seamless blend

  cameraInstance = useCamera({
    canvas,
    width,
    height,
    pixelRatio: sizes.pixelRatio,
  });
  
  // Apply Azimuth (horizontal) limits to lock the "sides" 
  // so the user stays focused on the track and beautiful terrain.
  if (cameraInstance.controls) {
    cameraInstance.controls.minAzimuthAngle = -Math.PI * 0.85; // Limit rotation to ~300 degrees
    cameraInstance.controls.maxAzimuthAngle = Math.PI * 0.85;
  }

  camera = cameraInstance.camera;
  controls = cameraInstance.controls;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(30, 60, -180);
  directionalLight.castShadow = true;
  // Professional Shadow Tuning: High resolution and tight frustum for crisp terrain/train shadows
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.left = -150;
  directionalLight.shadow.camera.right = 150;
  directionalLight.shadow.camera.top = 150;
  directionalLight.shadow.camera.bottom = -150;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.bias = -0.0005; // Reduce shadow acne
  scene.add(directionalLight);

  const manager = new THREE.LoadingManager();
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    if (itemsTotal > 0) {
      loadProgress.value = (itemsLoaded / itemsTotal) * 100;
    }
  };
  manager.onLoad = () => {
    setTimeout(() => {
      isLoading.value = false;
    }, 500);
  };

  const loader = new GLTFLoader(manager), dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/assets/three/draco/gltf/");
  loader.setDRACOLoader(dracoLoader);

  // Directional Light Helper to visualize sun position
  // const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
  // scene.add(lightHelper);

  try {
    // Parallel loading of locomotive and areas for better performance and clean orchestration
    const [locomotiveGltf, areasGltf, colarGltf] = await Promise.all([
      // loader.loadAsync("/assets/three/resources/Locomotive.glb"),
      loader.loadAsync("/train/locomotive.glb"),
      loader.loadAsync("/areas/areas.glb"),
      loader.loadAsync("/train/colar.glb"),
    ]);

    // Apply shadows to every mesh in the GLTF hierarchy before adding to scene
    locomotiveGltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(locomotiveGltf.scene);

    // Use the named 'Locomotive' Object3D rather than the GLTF scene root.
    // The scene root sits at (0,0,0) so placeLocomotiveOnTrack would snap to
    // the wrong curve point. The named object carries the correct Blender
    // world-space position – exactly where it sits on the rail_sleeper track.
    const locomotiveNode = locomotiveGltf.scene.getObjectByName("Locomotive");
    console.log("locomotiveNode: ", locomotiveNode);
    if (!locomotiveNode) {
      console.warn("'Locomotive' object not found in locomotive.glb – falling back to scene root");
    }
    locomotive = locomotiveNode ?? locomotiveGltf.scene;

    areas = areasGltf.scene;

    scene.add(areas);

    colarCargo = colarGltf.scene;
    colarCargo.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(colarCargo);

    // Extract path from the 'rail_sleeper' mesh or collection
    const pathPoints: THREE.Vector3[] = [];
    const processedPathMeshes = new Set<THREE.Object3D>();

    // Tracks which rail_sleeper Groups have already contributed path points.
    // The rail_sleeper Group from Blender's array+mirror modifier exports with
    // two material-split children (Cube040 and Cube040_1) sharing the same
    // geometry. Extracting path points from only the FIRST child prevents
    // duplicate/zigzag curve points that would break the CatmullRomCurve3.
    const pathExtractedGroups = new Set<THREE.Object3D>();

    areas.traverse((child) => {
      const isRailSleeper = child.name?.includes("rail_sleeper") ?? false;
      const isRailway     = child.name?.includes("railway")      ?? false;

      if (isRailSleeper || isRailway) {
        // Handle Groups by traversing their mesh descendants
        child.traverse((node) => {
          if (node instanceof THREE.Mesh && !processedPathMeshes.has(node)) {
            processedPathMeshes.add(node);
            // Always add ALL child meshes to railSleeperMeshes for physics colliders
            railSleeperMeshes.push(node);

            // Only extract path points from the FIRST mesh in this Group.
            // Subsequent material-split siblings (e.g. Cube040_1) have identical
            // vertex positions and would double – then zigzag – the path points.
            if (!pathExtractedGroups.has(child)) {
              pathExtractedGroups.add(child);

              const pos = node.geometry.attributes.position;
              node.updateMatrixWorld(true);

              if (pos.count > 300) {
                // ── Angular-sort path extraction ──────────────────────────────────
                // Problem: GLTF vertex buffers are NOT ordered along the track.
                // Each rail sleeper spans ACROSS the track (perpendicular to travel);
                // buffer-order chunk-averaging produces points that zigzag left/right
                // instead of following the centerline.
                //
                // Fix: collect all world-space positions, sort by angle around the
                // XZ centroid of the mesh (loop-aware ordering), then chunk-average.
                // At each angle slice, inner-edge and outer-edge sleeper vertices
                // cancel out, leaving the track centerline point.

                const allVerts: THREE.Vector3[] = [];
                for (let j = 0; j < pos.count; j++) {
                  const v = new THREE.Vector3().fromBufferAttribute(pos, j);
                  allVerts.push(v.applyMatrix4(node.matrixWorld));
                }

                // Centroid in the XZ plane (Y = height, not useful for angle)
                let cx = 0, cz = 0;
                for (const v of allVerts) { cx += v.x; cz += v.z; }
                cx /= allVerts.length; cz /= allVerts.length;

                // Sort by polar angle around the loop centre
                allVerts.sort((a, b) =>
                  Math.atan2(a.z - cz, a.x - cx) - Math.atan2(b.z - cz, b.x - cx)
                );

                // Chunk-average the angularly-ordered verts → 200 centerline points
                const chunkCount = 200;
                const vpc = Math.max(1, Math.floor(allVerts.length / chunkCount));
                for (let i = 0; i < chunkCount; i++) {
                  const s = i * vpc;
                  const e = Math.min(s + vpc, allVerts.length);
                  if (s >= allVerts.length) break;
                  const avgPos = new THREE.Vector3();
                  for (let j = s; j < e; j++) avgPos.add(allVerts[j]!);
                  avgPos.divideScalar(e - s);
                  pathPoints.push(avgPos);
                }
              } else {
                // Small mesh (e.g. a single sleeper): use world-space centre
                const worldPos = new THREE.Vector3();
                node.getWorldPosition(worldPos);
                pathPoints.push(worldPos);
              }
            }
          }
        });
      }

      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (child.name && child.name.includes("areas")) _areasMesh = child;
    });

    if (pathPoints.length > 1) {
      // Sort points by proximity to ensure a smooth continuous curve
      for (let i = 0; i < pathPoints.length - 1; i++) {
        let nearestIdx = i + 1;
        const currentPoint = pathPoints[i];
        if (!currentPoint) continue;
        
        let minDist = currentPoint.distanceTo(pathPoints[nearestIdx]!);
        for (let j = i + 2; j < pathPoints.length; j++) {
          const nextPoint = pathPoints[j];
          if (!nextPoint) continue;
          const d = currentPoint.distanceTo(nextPoint);
          if (d < minDist) {
            minDist = d;
            nearestIdx = j;
          }
        }
        
        // Swap
        const temp = pathPoints[i + 1]!;
        pathPoints[i + 1] = pathPoints[nearestIdx]!;
        pathPoints[nearestIdx] = temp;
      }

      trainCurve = new THREE.CatmullRomCurve3(pathPoints);
      trainCurveLength = trainCurve.getLength();
      console.log(
        `Train path initialized with ${pathPoints.length} points, length:`,
        trainCurveLength
      );
    }

    // locomotive.scale.setScalar(3 / Math.max(size.x, size.y, size.z));
    placeLocomotiveOnTrack();
    
    // Initialize wheel meshes for linkage animation
    trainPhysics.collectWheelMeshes(locomotive);

    let headlightMesh: any = null;
    let chimneySteamPipeMesh: any = null;
    locomotive.traverse((child) => {
      if (child.name) {
        // Robust name matching with includes to handle potential prefixes or hierarchy changes
        if (child.name.includes("Forward-light")) headlightMesh = child;
        if (child.name.includes("chimney")) chimneySteamPipeMesh = child;
        if (child.name.includes("knot")) {
          knotMesh = child;
          // TODO: hide it for now, nla is much better!!
          knotMesh.visible = false;
          knotInitialPosition.copy(child.position);
        }
      }
    });

    if (headlightMesh && headlightMesh instanceof THREE.Mesh) {
      const mat = headlightMesh.material as THREE.MeshStandardMaterial;
      if (mat.emissive) { mat.emissiveIntensity = 1.0; mat.envMapIntensity = 0.8; }
      const beam = new THREE.SpotLight(0xffeedd, 80, 8, Math.PI / 8, 0.1, 1.5);
      beam.position.set(0, 0, 0);
      beam.target.position.set(Math.sin(-Math.PI / 2) * 1.5, -0.5, Math.cos(-Math.PI / 2) * 1.5);
      beam.castShadow = true;
      // Headlight shadow map optimization
      beam.shadow.mapSize.set(1024, 1024);
      beam.shadow.bias = -0.0001;
      headlightMesh.add(beam);
      headlightMesh.add(beam.target);
    }

    // Create smoke particle system at chimney position
    if (chimneySteamPipeMesh) {
      chimneySteam.init(chimneySteamPipeMesh, sizes.resolution);
    }

    terrain = new Terrain(scene);
    await terrain.load("/terrain/terrain.glb", "/terrain/terrain.png", manager);

    // // Initialize Needle Engine Context for the Inspector Extension to detect the scene
    // const { Context } = await import("@needle-tools/engine");
    // const needleContext = new Context({
    //   scene,
    //   camera,
    //   renderer,
    //   domElement: canvas,
    // });
    // // @ts-ignore
    // needleContext.start();

    if (terrain.splatTexture) {
      interactionInstance = useInteraction({
        size: terrain.size,
        renderer,
      });

      waterInstance = useWater(scene, {
        splatTexture: terrain.splatTexture,
        terrainSize: terrain.size,
      });

      grassInstance = useGrass(scene, {
        splatTexture: terrain.splatTexture,
        interactionTexture: interactionInstance.texture,
        terrainSize: terrain.size,
      });

      slabsInstance = useSlabs(scene, {
        splatTexture: terrain.splatTexture,
        terrainSize: terrain.size,
      });
    }

    physicsBlocksGroup = new THREE.Group();
    scene.add(physicsBlocksGroup);

    terrainNormalHelper = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xffff00);
    terrainNormalHelper.visible = false;
    scene.add(terrainNormalHelper);

    // createTrainTracks(); // Use the tracks from areas.glb instead

    // Pass loaded terrain to camera instance for altitude constraints
    if (cameraInstance) cameraInstance.setTerrain(terrain);

    // Auto-initialise physics – always active, no manual toggle needed
    await initPhysicsMode();

    if (terrain && terrain.collider) {
      const { COLLISION_GROUPS } = trainPhysics;
      terrain.collider.setCollisionGroups(
        (COLLISION_GROUPS.TERRAIN << 16) | COLLISION_GROUPS.TRAIN | COLLISION_GROUPS.BRICK
      );
    }

  } catch (error) { console.error("Error loading locomotive model:", error); }

  syncCameraToTrain();

  // Terrain position test!
  // console.log(terrain.mesh.getWorldPosition(new THREE.Vector3()));

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
  skyInstance?.dispose();
  waterInstance?.dispose();
  grassInstance?.dispose();
  slabsInstance?.dispose();
  interactionInstance?.dispose();
  chimneySteam.dispose();
  renderer?.dispose();
  // Clear bricks BEFORE freeing the physics world to avoid dangling handles
  if (physicsBlocksGroup && trainPhysics.physicsWorld) {
    trainBricks.clearAllBlocks(physicsBlocksGroup, trainPhysics.physicsWorld);
  }
  trainPhysics.cleanup();
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
    bottom: 10px;
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
    bottom: 10px;
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

  &.warning {
    background: rgba(255, 152, 0, 0.7);
    &:hover:not(:disabled) { background: rgba(255, 152, 0, 0.9); }
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
