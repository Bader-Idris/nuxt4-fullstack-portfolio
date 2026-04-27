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
// use then one in camera instead!!
import type {  OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { useFullscreen } from "@vueuse/core";
import { useSound } from "@/composables/useSound";
import { useTerrain } from "@/composables/threeD/useTerrain";
import { useWater } from "@/composables/threeD/useWater";
import { useGrass } from "@/composables/threeD/useGrass";
import { useTrainPhysics } from "@/composables/threeD/useTrainPhysics";
import { useSky } from "@/composables/threeD/useSky";
import { useChimneySteam } from "@/composables/threeD/useChimneySteam";
import { useInteraction } from "@/composables/threeD/useInteraction";
import { useCamera } from "@/composables/threeD/useCamera";

const chimneySteam = useChimneySteam();
const { smokeBendAngle, smokeLifeSpeed, SMOKE_BEND_ANGLE_BY_GEAR, SMOKE_LIFE_SPEED_BY_GEAR } = chimneySteam;

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
let cameraInstance: ReturnType<typeof useCamera> | null = null;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let locomotive: THREE.Group;
let areas: THREE.Group;
let areasMesh: THREE.Object3D | null = null;
let animationId: number;
let skyMesh: THREE.Mesh | null = null;
let skyInstance: ReturnType<typeof useSky> | null = null;
// let smokeInstance: ReturnType<typeof useSmokeParticles> | null = null;
let waterInstance: ReturnType<typeof useWater> | null = null;
let grassInstance: ReturnType<typeof useGrass> | null = null;
let interactionInstance: ReturnType<typeof useInteraction> | null = null;

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

// Physics engine instance
const trainPhysics = useTrainPhysics();

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
  directionalLight.position.set(0, 60, -180);
  scene.add(directionalLight);

  const loader = new GLTFLoader(), dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/assets/three/draco/gltf/");
  loader.setDRACOLoader(dracoLoader);

  // Directional Light Helper to visualize sun position
  // const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
  // scene.add(lightHelper);

  try {
    // Parallel loading of locomotive and areas for better performance and clean orchestration
    const [locomotiveGltf, areasGltf] = await Promise.all([
      loader.loadAsync("/assets/three/resources/Locomotive.glb"),
      loader.loadAsync("/areas/areas.glb")
    ]);

    locomotive = locomotiveGltf.scene;
    scene.add(locomotive);

    areas = areasGltf.scene;
    scene.add(areas);
    // areas.position.x -= 20; // all meshes go +20, fix the uv

    // Preserve Blender positions: the 'areas' group stays at (0,0,0) by default.
    // We apply standard properties to children and find the primary areasMesh if present.
    areas.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true;
      }
      if (child.name && child.name.includes("areas")) areasMesh = child;
    });

    const box = new THREE.Box3().setFromObject(locomotive), size = box.getSize(new THREE.Vector3());
    locomotive.scale.setScalar(3 / Math.max(size.x, size.y, size.z));
    placeLocomotiveOnTrack();
    
    // Initialize wheel meshes for linkage animation
    trainPhysics.collectWheelMeshes(locomotive);

    let headlightMesh: THREE.Object3D | null = null;
    let chimneySteamPipeMesh: THREE.Object3D | null = null;
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
      headlightMesh.add(beam); headlightMesh.add(beam.target);
    }

    // Create smoke particle system at chimney position
    if (chimneySteamPipeMesh) {
      chimneySteam.init(chimneySteamPipeMesh, sizes.resolution);
    }

    terrain = new Terrain(scene);
    await terrain.load("/terrain/terrain.glb", "/terrain/terrain.png");

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
    }

    physicsBlocksGroup = new THREE.Group();
    scene.add(physicsBlocksGroup);
    createTrainTracks();

    // Pass loaded terrain to camera instance for altitude constraints
    if (cameraInstance) cameraInstance.setTerrain(terrain);

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
  // cameraInstance?.controls?.dispose();
  wheelSpinGSAPRef.ref.forEach((tween) => tween.kill());
  // smokeInstance?.dispose();
  skyInstance?.dispose();
  waterInstance?.dispose();
  grassInstance?.dispose();
  interactionInstance?.dispose();
  chimneySteam.dispose();
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
