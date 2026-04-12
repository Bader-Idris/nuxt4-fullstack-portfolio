<template>
  <div
    ref="containerRef"
    :class="{ 'is-fullscreen': modelFullscreen }"
  >
    <canvas ref="canvasRef"></canvas>
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

import particleVertexShader from './shaders/smoke/particleVertex.glsl'
import particleFragmentShader from './shaders/smoke/particleFragment.glsl'
// import particleVertexShader from './shaders/smoke/particleVertex.glsl'
// import particleFragmentShader from './shaders/smoke/particleFragment.glsl'
import { createSmokeTexture } from './utils/smokeTexture'

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const PIXEL_RATIO_MAX = 2 // Limit max pixel ratio for performance

// Fullscreen state - synced with parent via v-model
const modelFullscreen = defineModel<boolean>('fullscreen', { default: false })
const route = useRoute()
const router = useRouter()

// VueUse useFullscreen bound to containerRef
const { isFullscreen: nativeFullscreen, enter, exit, toggle } = useFullscreen(containerRef, { autoExit: true })

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let locomotive: THREE.Group
let animationId: number
let smokeParticles: THREE.Points | null = null
let smokeMaterial: THREE.ShaderMaterial | null = null
let smokePositions: Float32Array
let smokeLifetimes: Float32Array
let smokeBirths: Float32Array
let smokeLifespans: Float32Array
let smokeVelocities: Float32Array
let smokeSeeds: Float32Array
// --- PARTICLE COUNT ---
// Lower = better performance on mobile (try 30 for low-end devices)
const PARTICLE_COUNT = 100
// --- LIFETIME ---
// How long each particle lives before respawning (seconds)
const SMOKE_LIFETIME = 4.0

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

const toggleFullscreen = async () => {
  // console.log(nativeFullscreen.value);
  await toggle()
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

  // Update smoke particles
  if (smokeParticles && smokeMaterial) {
    smokeMaterial.uniforms.uTime.value = ticker.elapsed
    
    // Respawn dead particles
    const positions = smokeParticles.geometry.attributes.position.array as Float32Array
    for(let i = 0; i < PARTICLE_COUNT; i++) {
      const age = ticker.elapsed - smokeBirths[i]
      if(age > smokeLifespans[i]) {
        // --- RESPAWN TIMING ---
        // 2.0: delay before respawn (stagger, prevents clumping)
        smokeBirths[i] = ticker.elapsed + Math.random() * 2.0
        smokeLifespans[i] = SMOKE_LIFETIME + Math.random() * 1.5

        // --- RESPAWN POSITION (local space) ---
        positions[i * 3] = (Math.random() - 0.5) * 0.2 // X: narrow spread
        positions[i * 3 + 1] = Math.random() * 0.2     // Y: start near emitter base
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2 // Z: narrow spread

        // --- RESPAWN VELOCITY ---
        // X: slight lateral drift
        smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.15
        // Y: RISE SPEED (0.3-0.5 units/sec) - match init values
        smokeVelocities[i * 3 + 1] = 0.3 + Math.random() * 0.2
        // Z: slight depth drift
        smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15

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
  const pixelRatio = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_MAX)

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
  renderer.setPixelRatio(pixelRatio)
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
  scene.background = new THREE.Color(0x228B22)

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  )
  camera.position.set(5, 3, 5)

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  })
  const pixelRatio = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_MAX)
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(pixelRatio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

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
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 3 / maxDim
    locomotive.scale.setScalar(scale)

    // Move locomotive closer to camera
    locomotive.position.sub(center.multiplyScalar(scale))
    locomotive.position.y += (size.y * scale) / 2
    locomotive.position.z += 2 // Push toward camera

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
      const chimneyWorldPos = new THREE.Vector3()
      chimneySteamPipeMesh.getWorldPosition(chimneyWorldPos)

      // Initialize particle data arrays
      smokePositions = new Float32Array(PARTICLE_COUNT * 3)
      smokeBirths = new Float32Array(PARTICLE_COUNT)
      smokeLifespans = new Float32Array(PARTICLE_COUNT)
      smokeVelocities = new Float32Array(PARTICLE_COUNT * 3)
      smokeSeeds = new Float32Array(PARTICLE_COUNT)

      // Initialize particles with staggered birth times
      for(let i = 0; i < PARTICLE_COUNT; i++) {
        // --- LIFETIME (duration before respawn) ---
        smokeBirths[i] = -Math.random() * SMOKE_LIFETIME // Negative = some already alive at start
        smokeLifespans[i] = SMOKE_LIFETIME + Math.random() * 1.5 // 4.0-5.5s duration

        // --- INITIAL POSITION (local space, relative to chimney emitter) ---
        // X: horizontal spread (-0.1 to 0.1)
        smokePositions[i * 3] = (Math.random() - 0.5) * 0.
        // Y: vertical start (0 to 2.0 units above emitter) - controls initial height
        smokePositions[i * 3 + 1] = Math.random() * 2.0
        // Z: depth spread (-0.1 to 0.1)
        smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.2

        // --- VELOCITY (speed & direction) ---
        // X: lateral drift (-0.075 to 0.075 units/sec)
        smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.15
        // Y: RISE SPEED - 0.3 to 0.5 units/sec (increase for faster rise)
        smokeVelocities[i * 3 + 1] = 0.3 + Math.random() * 0.2
        // Z: depth drift (-0.075 to 0.075 units/sec)
        smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15

        // Random seed for unique wind oscillation per particle
        smokeSeeds[i] = Math.random()
      }

      // Create particle geometry
      const particleGeo = new THREE.BufferGeometry()
      particleGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3))
      particleGeo.setAttribute('aBirth', new THREE.BufferAttribute(smokeBirths, 1))
      particleGeo.setAttribute('aLifespan', new THREE.BufferAttribute(smokeLifespans, 1))
      particleGeo.setAttribute('aVelocity', new THREE.BufferAttribute(smokeVelocities, 3))
      particleGeo.setAttribute('aSeed', new THREE.BufferAttribute(smokeSeeds, 1))

      // Create smoke texture
      const smokeTexture = createSmokeTexture()

      // Create shader material for particles
      smokeMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          // --- PARTICLE SIZE ---
          // Base size in world units (multiplied by screen distance factor)
          uParticleSize: { value: 0.5 },
          // --- SMOKE COLOR ---
          // Warm gray: rgb(217, 209, 204)
          uColor: { value: new THREE.Color(0.85, 0.82, 0.8) },
          uTexture: { value: smokeTexture },
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
      smokeParticles.position.copy(chimneyWorldPos)
      // --- EMITTER POSITION ---
      // Offset above chimney steam pipe (0.2 units)
      smokeParticles.position.y += 0.2

      scene.add(smokeParticles)
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

    // Add ground plane for testing
    const groundGeo = new THREE.PlaneGeometry(40, 40)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3a5a40,
      roughness: 0.9,
      metalness: 0.0,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    scene.add(ground)

    // Add subtle grid helper for context
    const gridHelper = new THREE.GridHelper(40, 40, 0x555555, 0x333333)
    gridHelper.position.y = 0.005
    scene.add(gridHelper)
  } catch (error) {
    console.error('Error loading locomotive model:', error)
  }

  // Orbit Controls
  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 1, 0)

  // Resize handling
  const resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(container)
  window.addEventListener('resize', handleResize)

  // Start animation
  animate(0)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)

  controls?.dispose()
  renderer?.dispose()

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
