<template>
  <div
    ref="containerRef"
    :class="{ 'is-fullscreen': modelFullscreen }"
  >
    <canvas ref="canvasRef" />
    
    <!-- Speed Display Overlay -->
    <div v-if="physicsMode || wheelSpinMode" class="speed-display">
      <div class="speed-value">{{ wheelSpeed.toFixed(1) }}</div>
      <div class="speed-label">RPM</div>
      <div v-if="wheelSpinMode" class="speed-mode">WHEEL SPIN</div>
      <div v-else-if="physicsMode" class="speed-mode">GEAR {{ currentGear.label.toUpperCase() }}</div>
    </div>

    <div class="controls-container">
      <button
        class="control-btn"
        :class="{ active: physicsMode }"
        :aria-label="physicsMode ? 'Disable physics' : 'Enable physics'"
        @click="togglePhysics"
      >
        <Icon name="mdi:train" size="24" />
        <span class="btn-text">{{ physicsMode ? 'Physics ON' : 'Physics OFF' }}</span>
      </button>
      <button
        class="control-btn"
        :class="{ active: showBlocks }"
        :aria-label="showBlocks ? 'Hide blocks' : 'Show blocks'"
        :disabled="!physicsMode"
        @click="toggleBlocks"
      >
        <Icon name="mdi:cube-outline" size="24" />
        <span class="btn-text">{{ showBlocks ? 'Blocks ON' : 'Blocks OFF' }}</span>
      </button>
      <button
        class="control-btn"
        :class="{ active: wheelSpinMode, warning: wheelSpinMode }"
        :aria-label="wheelSpinMode ? 'Stop wheel spin' : 'Spin wheels only'"
        @click="toggleWheelSpin"
      >
        <Icon :name="wheelSpinMode ? 'mdi:stop' : 'mdi:speedometer'" size="24" />
        <span class="btn-text">{{ wheelSpinMode ? 'STOP SPIN' : 'WHEEL SPIN' }}</span>
      </button>
      <button
        v-if="physicsMode"
        class="control-btn primary"
        :aria-label="`Change train gear. Current gear ${currentGear.label}`"
        :disabled="wheelSpinMode"
        @click="cycleGear"
      >
        <Icon name="mdi:car-shift-pattern" size="24" />
        <span class="btn-text">GEAR: {{ currentGear.label.toUpperCase() }}</span>
      </button>
    </div>
    <button
      class="fullscreen-btn"
      :aria-label="modelFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
      @click="toggleFullscreen"
    >
      <Icon
        :name="modelFullscreen ? 'material-symbols-light:fullscreen-exit' : 'material-symbols:fullscreen'"
        size="28"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { useFullscreen } from '@vueuse/core'
import type { Tween } from 'gsap'

import particleVertexShader from './shaders/smoke/particleVertex.glsl'
import particleFragmentShader from './shaders/smoke/particleFragment.glsl'
import skyVertexShader from './shaders/sky/vertex.glsl'
import skyFragmentShader from './shaders/sky/fragment.glsl'
// import particleVertexShader from './shaders/smoke/particleVertex.glsl'
// import particleFragmentShader from './shaders/smoke/particleFragment.glsl'

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Resolution tracking for shaders
const sizes = {
  width: 0,
  height: 0,
  pixelRatio: 1,
  resolution: new THREE.Vector2(0, 0),
}

// Fullscreen state - synced with parent via v-model
const modelFullscreen = defineModel<boolean>('fullscreen', { default: false })

// Physics mode state
const physicsMode = ref(false)
const showBlocks = ref(true)
const wheelSpinMode = ref(false)
const wheelSpeed = ref(0)
const wheelSpinGSAPRef = { ref: [] as Tween[] }
const gearPhases = [
  { key: 'backward', label: 'backward', speed: 2.4, rpm: 45 },
  { key: 'idle', label: 'idle', speed: 0, rpm: 0 },
  { key: 'medium', label: 'medium', speed: -3.5, rpm: 90 },
  { key: 'high', label: 'high', speed: -6.8, rpm: 160 },
] as const
const currentGearIndex = ref(1)
const currentGear = computed(() => gearPhases[currentGearIndex.value])

// VueUse useFullscreen bound to containerRef
const { toggle } = useFullscreen(containerRef, { autoExit: true })

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let locomotive: THREE.Group
let animationId: number
let smokeParticles: THREE.Points | null = null
let skyMesh: THREE.Mesh | null = null
let skyMaterial: THREE.ShaderMaterial | null = null
let smokeMaterial: THREE.ShaderMaterial | null = null
let smokePositions: Float32Array
let smokeBirths: Float32Array
let smokeLifespans: Float32Array
let smokeVelocities: Float32Array
let smokeSeeds: Float32Array
let resizeObserver: ResizeObserver | null = null
let physicsBlocksGroup: THREE.Group | null = null
let physicsBlocks: THREE.Mesh[] = []
let trainPhysicsBody: any = null
const trainBodyOffset = new THREE.Vector3()
const trainBodyHalfExtents = new THREE.Vector3(1.2, 0.7, 0.6)
const trainFocusPoint = new THREE.Vector3()
const trainStartPosition = new THREE.Vector3(20, 0, 0)

const GROUND_Y = 0
const TRACK_CENTER_Z = 0
// Move this closer to the train for faster crashes, or farther away for a longer runway.
const BLOCKS_START_X = 9
// Increase this when you want a denser obstacle field and bigger chain reactions.
const STONE_COUNT = 12
// Camera offset is the quickest way to tune how close the player feels to the locomotive.
const CAMERA_OFFSET = new THREE.Vector3(3.5, 2.2, 5)

// Physics engine instance
const trainPhysics = useTrainPhysics()
// --- PARTICLE COUNT ---
// Higher = denser, more realistic coal smoke (try 200+ for thick smoke)
const PARTICLE_COUNT = 400
// --- LIFETIME ---
// How long each particle lives before respawning (seconds)
// Lower = shorter smoke column
const SMOKE_LIFETIME = 3.0

const ticker = {
  elapsed: 0,
  delta: 1 / 60,
  maxDelta: 1 / 30,
  update(elapsedMs: number) {
    const elapsedSeconds = elapsedMs / 1000
    this.delta = Math.min(elapsedSeconds - this.elapsed, this.maxDelta)
    this.elapsed = elapsedSeconds
  },
}

const updateTrainFocusPoint = () => {
  if (!locomotive) return

  trainFocusPoint.copy(locomotive.position).add(trainBodyOffset)
}

const syncCameraToTrain = (followMotion: boolean = false) => {
  if (!controls || !camera || !locomotive) return

  updateTrainFocusPoint()

  if (followMotion) {
    controls.target.lerp(trainFocusPoint, 0.15)
    return
  }

  controls.target.copy(trainFocusPoint)
  camera.position.copy(trainFocusPoint.clone().add(CAMERA_OFFSET))
}

const syncTrainBodyFromVisual = () => {
  if (!locomotive || !trainPhysicsBody) return

  const targetPosition = locomotive.position.clone().add(trainBodyOffset)
  trainPhysicsBody.setTranslation(targetPosition, true)
  trainPhysicsBody.setNextKinematicTranslation(targetPosition)
  trainPhysicsBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
  trainPhysicsBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
}

const syncLocomotiveFromPhysics = () => {
  if (!locomotive || !trainPhysicsBody) return

  const physicsPos = trainPhysicsBody.translation()
  locomotive.position.set(
    physicsPos.x - trainBodyOffset.x,
    physicsPos.y - trainBodyOffset.y,
    physicsPos.z - trainBodyOffset.z
  )
  updateTrainFocusPoint()
}

const placeLocomotiveOnTrack = () => {
  if (!locomotive) return

  locomotive.position.set(0, 0, 0)

  const modelBounds = new THREE.Box3().setFromObject(locomotive)
  const modelCenter = modelBounds.getCenter(new THREE.Vector3())

  locomotive.position.set(
    trainStartPosition.x - modelCenter.x,
    GROUND_Y - modelBounds.min.y,
    TRACK_CENTER_Z - modelCenter.z
  )

  const placedBounds = new THREE.Box3().setFromObject(locomotive)
  const placedCenter = placedBounds.getCenter(new THREE.Vector3())
  const placedSize = placedBounds.getSize(new THREE.Vector3())

  trainBodyOffset.copy(placedCenter).sub(locomotive.position)
  trainBodyHalfExtents.set(
    Math.max(placedSize.x * 0.48, 0.6),
    Math.max(placedSize.y * 0.48, 0.4),
    Math.max(placedSize.z * 0.42, 0.35)
  )

  updateTrainFocusPoint()
}

const createTrainTracks = () => {
  // Create two parallel rails
  const railGeometry = new THREE.BoxGeometry(60, 0.1, 0.1)
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.4,
    metalness: 0.8,
  })

  // Left rail
  const leftRail = new THREE.Mesh(railGeometry, railMaterial)
  leftRail.position.set(15, 0.05, -0.6)
  leftRail.receiveShadow = true
  scene.add(leftRail)

  // Right rail
  const rightRail = new THREE.Mesh(railGeometry, railMaterial)
  rightRail.position.set(15, 0.05, 0.6)
  rightRail.receiveShadow = true
  scene.add(rightRail)

  // Add sleepers (wooden beams)
  const sleeperGeometry = new THREE.BoxGeometry(0.3, 0.08, 1.8)
  const sleeperMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.0,
  })

  for (let i = -10; i < 30; i += 1.5) {
    const sleeper = new THREE.Mesh(sleeperGeometry, sleeperMaterial)
    sleeper.position.set(i, 0.02, 0)
    sleeper.receiveShadow = true
    scene.add(sleeper)
  }
}

const createObstacleField = () => {
  if (!trainPhysics.physicsWorld || !physicsBlocksGroup || physicsBlocks.length > 0) return

  const startPos = new THREE.Vector3(BLOCKS_START_X, 0.5, 0)
  const blocks = trainPhysics.createPhysicsBlocks(
    trainPhysics.physicsWorld,
    STONE_COUNT,
    startPos
  )

  blocks.forEach((block) => {
    physicsBlocksGroup!.add(block.mesh)
    physicsBlocks.push(block.mesh)
  })
}

const clearObstacleField = () => {
  physicsBlocks.forEach((mesh) => {
    physicsBlocksGroup?.remove(mesh)
    mesh.geometry.dispose()
    mesh.material.dispose()
  })

  physicsBlocks = []
  trainPhysics.blocksRef.blocks = []
}

const toggleFullscreen = async () => {
  await toggle()
}

const togglePhysics = async () => {
  physicsMode.value = !physicsMode.value

  if (!physicsMode.value) {
    currentGearIndex.value = 1
    wheelSpeed.value = 0
    return
  }

  try {
    await trainPhysics.initPhysics()

    if (trainPhysics.physicsWorld && locomotive) {
      if (!trainPhysicsBody) {
        trainPhysics.createGroundCollider(trainPhysics.physicsWorld)
        trainPhysicsBody = trainPhysics.createTrainBody(
          trainPhysics.physicsWorld,
          locomotive.position.clone().add(trainBodyOffset),
          { halfExtents: trainBodyHalfExtents.clone() }
        )
      }

      syncTrainBodyFromVisual()

      if (showBlocks.value) {
        createObstacleField()
      }
    }
  } catch (error) {
    console.error('Failed to initialize physics:', error)
    physicsMode.value = false
  }
}

const toggleBlocks = () => {
  if (!physicsMode.value || !trainPhysics.physicsWorld || !locomotive || !physicsBlocksGroup) return
  
  showBlocks.value = !showBlocks.value
  
  if (showBlocks.value) {
    createObstacleField()
  } else {
    clearObstacleField()
  }
}

const toggleWheelSpin = () => {
  if (!locomotive) return

  wheelSpinMode.value = !wheelSpinMode.value

  wheelSpinGSAPRef.ref.forEach((tween) => tween.kill())
  wheelSpinGSAPRef.ref = []

  if (wheelSpinMode.value) {
    currentGearIndex.value = 1
    wheelSpeed.value = 90
    wheelSpinGSAPRef.ref = trainPhysics.startWheelSpin(locomotive, wheelSpeed.value)
    return
  }

  wheelSpeed.value = 0
}

const cycleGear = () => {
  if (!locomotive || !trainPhysics.physicsWorld || !trainPhysicsBody) return

  currentGearIndex.value = (currentGearIndex.value + 1) % gearPhases.length
  syncTrainBodyFromVisual()

  if (trainPhysics.blocksRef.blocks.length > 0) {
    trainPhysics.resetBlocks(trainPhysics.blocksRef.blocks, trainPhysics.physicsWorld)
  }

  wheelSpeed.value = currentGear.value.rpm
}

// Sync VueUse nativeFullscreen → modelFullscreen + URL
// watch(nativeFullscreen, async (val) => {
//   modelFullscreen.value = val

//   if (val) {
//     document.body.classList.add('fullscreen-active')
//     await navigateTo({ query: { ...route.query, fullscreen: 'true' } }, { replace: true })
//   } else {
//     document.body.classList.remove('fullscreen-active')
//     if (route.query.fullscreen) {
//       const newQuery = { ...route.query }
//       delete newQuery.fullscreen
//       await navigateTo({ query: newQuery }, { replace: true })
//     }
//   }

//   // Trigger resize after fullscreen transition
//   setTimeout(handleResize, 100)
// })

const animate = (elapsedMs: number) => {
  animationId = requestAnimationFrame(animate)

  ticker.update(elapsedMs)

  // Update smoke and sky
  if (smokeMaterial) {
    smokeMaterial.uniforms.uTime.value = ticker.elapsed
  }
  // Sky follows camera for proper spherical dome perception
  if (skyMesh) {
    skyMesh.position.copy(camera.position)
  }
  if (skyMaterial) {
    skyMaterial.uniforms.uTime.value = ticker.elapsed
  }

  if (physicsMode.value && trainPhysics.physicsWorld && trainPhysicsBody) {
    const distanceDelta = currentGear.value.speed * ticker.delta

    if (!wheelSpinMode.value && distanceDelta !== 0) {
      const physicsPos = trainPhysicsBody.translation()
      trainPhysicsBody.setNextKinematicTranslation({
        x: physicsPos.x + distanceDelta,
        y: physicsPos.y,
        z: physicsPos.z,
      })
      trainPhysics.rotateWheelsByDistance(locomotive, distanceDelta)
    }

    trainPhysics.stepPhysics(trainPhysics.physicsWorld, ticker.delta)
    trainPhysics.updatePhysicsBlocks(trainPhysics.blocksRef.blocks)
    syncLocomotiveFromPhysics()

    if (currentGear.value.speed !== 0) {
      syncCameraToTrain(true)
    }
  }

  // Respawn dead particles
  if (smokeParticles) {
    const positions = smokeParticles.geometry.attributes.position.array as Float32Array
    for(let i = 0; i < PARTICLE_COUNT; i++) {
      const age = ticker.elapsed - smokeBirths[i]
      if(age > smokeLifespans[i]) {
        // --- RESPAWN TIMING ---
        // Small stagger delay prevents clumping
        smokeBirths[i] = ticker.elapsed + Math.random() * 1.5
        // Smoke height control:
        // longer lifespan = particles survive longer and rise higher.
        // Example:
        // Shorter plume: SMOKE_LIFETIME + Math.random() * 1.0
        // Taller plume:  SMOKE_LIFETIME + Math.random() * 2.0
        smokeLifespans[i] = SMOKE_LIFETIME + Math.random() * 2.0

        // --- RESPAWN POSITION (local space) ---
        positions[i * 3] = (Math.random() - 0.5) * 0.25
        positions[i * 3 + 1] = Math.random() * 0.2
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.25

        // --- RESPAWN VELOCITY ---
        smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.2
        // Main smoke height control for respawned particles.
        // Example:
        // Lower plume:  0.3 + Math.random() * 0.25
        // Taller plume: 0.8 + Math.random() * 0.25
        smokeVelocities[i * 3 + 1] = 0.8 + Math.random() * 0.25
        smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2

        smokeSeeds[i] = Math.random()
      }
    }
    
    smokeParticles.geometry.attributes.position.needsUpdate = true
    smokeParticles.geometry.attributes.aBirth.needsUpdate = true
    smokeParticles.geometry.attributes.aLifespan.needsUpdate = true
    smokeParticles.geometry.attributes.aVelocity.needsUpdate = true
    smokeParticles.geometry.attributes.aSeed.needsUpdate = true
  }

  if (controls) controls.update()
  renderer.render(scene, camera)
}

const handleResize = () => {
  if (!containerRef.value || !renderer || !camera) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)
  sizes.resolution.set(width * sizes.pixelRatio, height * sizes.pixelRatio)

  // Update camera
  camera.aspect = width / height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(width, height)
  renderer.setPixelRatio(sizes.pixelRatio)

  // Update shader uniform
  if (smokeMaterial) {
    smokeMaterial.uniforms.uResolution.value.copy(sizes.resolution)
  }
}

onMounted(async () => {
  if (!containerRef.value || !canvasRef.value) return

  // Sync CSS class from URL (don't auto-enter native fullscreen)
  // if (route.query.fullscreen === 'true' && !modelFullscreen.value) {
  //   modelFullscreen.value = true
  //   document.body.classList.add('fullscreen-active')
  // }

  const container = containerRef.value
  const canvas = canvasRef.value

  // Scene
  scene = new THREE.Scene()

  // Sky (large inverted sphere with shader on the inside)
  const skyGeo = new THREE.SphereGeometry(500, 32, 15)
  skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.5, 0.15, -0.5).normalize() },
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
  })
  skyMesh = new THREE.Mesh(skyGeo, skyMaterial)
  skyMesh.frustumCulled = false
  skyMesh.renderOrder = -1
  scene.add(skyMesh)

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  })
  const width = container.clientWidth
  const height = container.clientHeight

  // Initialize sizes and resolution
  sizes.width = width
  sizes.height = height
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)
  sizes.resolution.set(width * sizes.pixelRatio, height * sizes.pixelRatio)

  renderer.setSize(width, height)
  renderer.setPixelRatio(sizes.pixelRatio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    1000
  )
  camera.position.set(5, 2.3, 2.5)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight.position.set(5, 10, 7)
  scene.add(directionalLight)

  // Load Locomotive model with Draco
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  // we can get the current version of draco dir from node_modules/three/examples/jsm/libs/draco
  dracoLoader.setDecoderPath('/assets/three/draco/gltf/')
  loader.setDRACOLoader(dracoLoader)

  const locomotivePath = '/assets/three/resources/Locomotive.glb'
  // Don't compress meshes with gltf-optimizer.simondev.io, it removes their names, use draco compression script instead!

  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(
        locomotivePath,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      )
    })

    locomotive = gltf.scene
    scene.add(locomotive)

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(locomotive)
    const size = box.getSize(new THREE.Vector3())

    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 3 / maxDim
    locomotive.scale.setScalar(scale)

    placeLocomotiveOnTrack()

    // Find headlight mesh by name
    let headlightMesh: THREE.Mesh | null = null
    let chimneySteamPipeMesh: THREE.Mesh | null = null

    locomotive.traverse((child) => {
      if (child.isMesh) {
        if (child.name === 'Forward-light') {
          headlightMesh = child
        }
        if (child.name === 'chimney-steam-pipe') {
          chimneySteamPipeMesh = child
        }
      }
    })

    // Apply emissive settings to the headlight mesh
    if (headlightMesh) {
      const mat = headlightMesh.material as THREE.MeshStandardMaterial
      if (mat.emissive) {
        mat.emissiveIntensity = 1.0
        mat.envMapIntensity = 0.8
      }
    }

    // Create smoke particle system at chimney position
    if (chimneySteamPipeMesh) {
      // Initialize particle data arrays
      smokePositions = new Float32Array(PARTICLE_COUNT * 3)
      smokeBirths = new Float32Array(PARTICLE_COUNT)
      smokeLifespans = new Float32Array(PARTICLE_COUNT)
      smokeVelocities = new Float32Array(PARTICLE_COUNT * 3)
      smokeSeeds = new Float32Array(PARTICLE_COUNT)

      // Initialize particles with staggered birth times for continuous smoke column
      for(let i = 0; i < PARTICLE_COUNT; i++) {
        // --- LIFETIME (duration before respawn) ---
        // Smoke height control:
        // longer lifespan = particles survive longer and rise higher.
        // Example:
        // Shorter plume: SMOKE_LIFETIME + Math.random() * 1.0
        // Taller plume:  SMOKE_LIFETIME + Math.random() * 2.0
        smokeBirths[i] = -Math.random() * SMOKE_LIFETIME * 2 // Negative = some already alive at start
        smokeLifespans[i] = SMOKE_LIFETIME + Math.random() * 2.0 // 3.0-5.0s duration

        // --- INITIAL POSITION (local space, relative to chimney emitter) ---
        // X: wider horizontal spread for a thick smoke plume
        smokePositions[i * 3] = (Math.random() - 0.5) * 0.25
        // Y: start at emitter base
        smokePositions[i * 3 + 1] = Math.random() * 0.2
        // Z: wider depth spread for a thick smoke plume
        smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.25

        // --- VELOCITY (speed & direction) ---
        // X: wider lateral drift for thick, spreading smoke
        smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.2
        // Main smoke height control:
        // higher Y velocity = taller plume because particles climb farther before fading.
        // Example:
        // Lower plume:  0.3 + Math.random() * 0.25
        // Taller plume: 0.8 + Math.random() * 0.25
        // Current value is raised to make the smoke reach about 2 units higher.
        smokeVelocities[i * 3 + 1] = 0.8 + Math.random() * 0.25
        // Z: wider depth drift
        smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2

        // Random seed for unique noise-driven motion per particle
        smokeSeeds[i] = Math.random()
      }

      // Create particle geometry
      const particleGeo = new THREE.BufferGeometry()
      particleGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3))
      particleGeo.setAttribute('aBirth', new THREE.BufferAttribute(smokeBirths, 1))
      particleGeo.setAttribute('aLifespan', new THREE.BufferAttribute(smokeLifespans, 1))
      particleGeo.setAttribute('aVelocity', new THREE.BufferAttribute(smokeVelocities, 3))
      particleGeo.setAttribute('aSeed', new THREE.BufferAttribute(smokeSeeds, 1))

      // Create shader material for particles (puff shape computed in GLSL)
      smokeMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          // --- PARTICLE SIZE ---
          // Scaled for uResolution.y (screen pixels), so particles stay consistent across devices
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
      })

      // Create points
      smokeParticles = new THREE.Points(particleGeo, smokeMaterial)
      smokeParticles.position.set(0, 0.12, 0)
      smokeParticles.frustumCulled = false
      chimneySteamPipeMesh.add(smokeParticles)
    }

    // Add narrow beam angled -90° to the right
    if (headlightMesh) {
      const beam = new THREE.SpotLight(0xffeedd, 80, 8, Math.PI / 8, 0.1, 1.5)
      beam.position.set(0, 0, 0)

      // Target: -90° right from forward (local +Z → -X)
      const angle = -Math.PI / 2
      const distance = 1.5
      beam.target.position.set(
        Math.sin(angle) * distance,
        -0.5,
        Math.cos(angle) * distance
      )

      beam.castShadow = true
      beam.shadow.mapSize.set(512, 512)
      beam.shadow.camera.near = 0.1
      beam.shadow.camera.far = 8
      beam.shadow.bias = -0.002
      headlightMesh.add(beam)
      headlightMesh.add(beam.target)
    }

    // Layered ground colors read more naturally than a flat test green.
    const groundGeo = new THREE.PlaneGeometry(60, 60)
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6c7b46'),
      roughness: 0.98,
      metalness: 0.0,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    scene.add(ground)

    const soilPatchGeo = new THREE.CircleGeometry(18, 32)
    const soilPatchMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8a7353'),
      roughness: 1.0,
      metalness: 0.0,
    })
    const soilPatch = new THREE.Mesh(soilPatchGeo, soilPatchMat)
    soilPatch.rotation.x = -Math.PI / 2
    soilPatch.position.set(11, 0.002, 0)
    soilPatch.receiveShadow = true
    scene.add(soilPatch)

    const mossStripGeo = new THREE.PlaneGeometry(60, 7)
    const mossStripMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#5a6a36'),
      roughness: 0.96,
      metalness: 0.0,
    })
    const mossStrip = new THREE.Mesh(mossStripGeo, mossStripMat)
    mossStrip.rotation.x = -Math.PI / 2
    mossStrip.position.set(8, 0.003, 0)
    mossStrip.receiveShadow = true
    scene.add(mossStrip)

    // Keep the grid hidden by default so the scene reads like a world, not a sandbox.
    const gridHelper = new THREE.GridHelper(40, 40, 0x555555, 0x333333)
    gridHelper.position.y = 0.005
    gridHelper.visible = false
    scene.add(gridHelper)

    // Create physics blocks group (hidden initially)
    physicsBlocksGroup = new THREE.Group()
    scene.add(physicsBlocksGroup)

    // Add train tracks
    createTrainTracks()
  } catch (error) {
    console.error('Error loading locomotive model:', error)
  }

  // Orbit Controls
  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enableZoom = true
  controls.zoomSpeed = 1.15
  controls.minDistance = 1.5
  controls.maxDistance = 60
  controls.maxPolarAngle = Math.PI / 2.02
  controls.target.copy(trainFocusPoint)
  syncCameraToTrain()

  // Resize handling
  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(container)
  window.addEventListener('resize', handleResize)

  // Start animation
  animate(0)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)

  resizeObserver?.disconnect()
  controls?.dispose()
  wheelSpinGSAPRef.ref.forEach((tween) => tween.kill())
  smokeParticles?.geometry.dispose()
  smokeMaterial?.dispose()
  skyMesh?.geometry.dispose()
  skyMaterial?.dispose()
  renderer?.dispose()

  // Cleanup physics
  trainPhysics.cleanup()
  clearObstacleField()
  physicsBlocksGroup = null

  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
div {
  width: 100%;
  height: 80vh;
  position: relative;
  transition: all 0.3s ease;

  &.is-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: #228b22;
  }

  @include mobile {
    overflow-y: scroll;
    padding-bottom: 10vh;
  }
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
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

  @include mobile {
    left: 8px;
    bottom: 8px;
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
</style>

<style lang="scss">
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
