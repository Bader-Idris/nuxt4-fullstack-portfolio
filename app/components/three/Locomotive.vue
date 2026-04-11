<template>
  <div
    ref="containerRef"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <canvas ref="canvasRef"></canvas>
    <button
      class="fullscreen-btn"
      :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
      @click="toggleFullscreen"
    >
      <Icon
        :name="isFullscreen ? 'material-symbols-light:fullscreen-exit' : 'material-symbols:fullscreen'"
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
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const PIXEL_RATIO_MAX = 2 // Limit max pixel ratio for performance

// Fullscreen state - synced with parent via v-model
const isFullscreen = defineModel<boolean>('fullscreen', { default: false })
const route = useRoute()
const router = useRouter()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let locomotive: THREE.Group
let animationId: number

const toggleFullscreen = async () => {
  if (!containerRef.value) return

  if (!isFullscreen.value) {
    // Enter fullscreen - use real Fullscreen API
    try {
      await containerRef.value.requestFullscreen()
    } catch (err) {
      console.error('Fullscreen request failed:', err)
    }
  } else {
    // Exit fullscreen - check if real API is active
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch (err) {
        console.error('Exit fullscreen failed:', err)
      }
    } else {
      // CSS-only fullscreen (from ?fullscreen=true), just toggle state
      isFullscreen.value = false
    }
  }
}

// Listen for fullscreen changes (user can press Escape)
const handleFullscreenChange = () => {
  isFullscreen.value = document.fullscreenElement !== null
  if (!isFullscreen.value) {
    document.body.classList.remove('fullscreen-active')
    const newQuery = { ...route.query }
    delete newQuery.fullscreen
    router.replace({ query: newQuery })
  }
}

// Watch isFullscreen to sync URL when toggled via button
watch(isFullscreen, (val) => {
  if (val) {
    document.body.classList.add('fullscreen-active')
    router.replace({ query: { ...route.query, fullscreen: 'true' } })
  } else {
    document.body.classList.remove('fullscreen-active')
    if (route.query.fullscreen) {
      const newQuery = { ...route.query }
      delete newQuery.fullscreen
      router.replace({ query: newQuery })
    }
  }
})

const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (controls) controls.update()
  renderer.render(scene, camera)
}

// Create a soft radial glow texture for the bulb halo
const createGlowTexture = () => {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
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

  // Environment map for PBR reflections (WebGL compatible)
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()
  const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap
  pmremGenerator.dispose()

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight.position.set(5, 10, 7)
  scene.add(directionalLight)

  const pointLight = new THREE.PointLight(0xffffff, 0.5)
  pointLight.position.set(-5, 5, -5)
  scene.add(pointLight)

  // Load Locomotive model with Draco
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  // we can get the current version of draco dir from node_modules/three/examples/jsm/libs/draco
  dracoLoader.setDecoderPath('/assets/three/draco/gltf/')
  loader.setDRACOLoader(dracoLoader)

  // const locomotivePath = '/assets/three/resources/Locomotive.glb'
  const locomotivePath = '/assets/three/resources/Locomotive_compressed.glb' 
  // compressed with gltf-optimizer.simondev.io
  // we can do it locally, but for bigger projects: 🤗 

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

    // Find headlight position and add actual light (emissive doesn't cast light)
    let headlightMesh: THREE.Mesh | null = null
    let maxEmissive = 0

    locomotive.traverse((child) => {
      if (child.isMesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        // Find the brightest emissive surface (likely the headlight)
        if (mat.emissive && mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 2.0)
          mat.envMapIntensity = 1.5
          mat.needsUpdate = true

          // Track brightest emissive mesh
          const brightness = mat.emissive.r + mat.emissive.g + mat.emissive.b
          if (brightness > maxEmissive) {
            maxEmissive = brightness
            headlightMesh = child
          }
        }
      }
    })

    // Add actual bulb-style light at headlight position
    if (headlightMesh) {
      // Visible bulb — small glowing sphere, attached to the mesh
      const bulbGeo = new THREE.SphereGeometry(0.08, 16, 16)
      const bulbMat = new THREE.MeshBasicMaterial({
        color: 0xffeedd,
        transparent: true,
        opacity: 0.9,
      })
      const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat)
      bulbMesh.position.set(0, 0, 0) // At the surface center
      headlightMesh.add(bulbMesh)

      // Bulb glow halo — sprite always facing camera
      const glowTexture = createGlowTexture()
      const glowMat = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffeedd,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const glowSprite = new THREE.Sprite(glowMat)
      glowSprite.position.set(0, 0, 0.15) // Slightly in front of surface
      glowSprite.scale.set(0.6, 0.6, 1)
      headlightMesh.add(glowSprite)

      // Narrow beam angled -90° to the right
      const beam = new THREE.SpotLight(0xffeedd, 80, 8, Math.PI / 8, 0.1, 1.5)
      beam.position.set(0, 0, 0) // Attached to surface

      // Target: -90° right from forward (local +Z → -X)
      const angle = -Math.PI / 2
      const distance = 1.5
      beam.target.position.set(
        Math.sin(angle) * distance, // right (-X)
        -0.5,                       // slight downward
        Math.cos(angle) * distance  // forward (0 on Z)
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
  document.addEventListener('fullscreenchange', handleFullscreenChange)

  // Start animation
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)

  controls?.dispose()
  renderer?.dispose()

  document.removeEventListener('fullscreenchange', handleFullscreenChange)
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
