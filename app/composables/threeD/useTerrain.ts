import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

export class Terrain {
  scene: THREE.Scene
  world: RAPIER.World | null = null
  rapier: any = null
  
  // Data
  size: number = 512
  subdivision: number = 256
  
  // Assets
  mesh: THREE.Mesh | null = null
  collider: RAPIER.Collider | null = null
  splatTexture: THREE.Texture | null = null
  gradientTexture: THREE.Texture | null = null
  
  // Colors
  grassColor = new THREE.Color('#b8b62e')

  constructor(scene: THREE.Scene, world?: RAPIER.World, rapier?: any) {
    this.scene = scene
    this.world = world || null
    this.rapier = rapier || null
    
    this.setGradient()
  }

  setGradient() {
    if (typeof document === 'undefined') return
    
    const height = 16
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return

    const gradient = context.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0.1, '#ffa94e') // Sand
    gradient.addColorStop(0.3, '#5bc2b9') // Shallows
    gradient.addColorStop(0.9, '#13375f') // Deep

    context.fillStyle = gradient
    context.fillRect(0, 0, 1, height)

    this.gradientTexture = new THREE.CanvasTexture(canvas)
    this.gradientTexture.colorSpace = THREE.SRGBColorSpace
  }

  async load(glbUrl: string, splatUrl: string, manager?: THREE.LoadingManager) {
    const textureLoader = new THREE.TextureLoader(manager)
    this.splatTexture = await textureLoader.loadAsync(splatUrl)
    this.splatTexture.colorSpace = THREE.NoColorSpace
    this.splatTexture.wrapS = THREE.RepeatWrapping
    this.splatTexture.wrapT = THREE.RepeatWrapping

    const loader = new GLTFLoader(manager)
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/assets/three/draco/gltf/')
    loader.setDRACOLoader(dracoLoader)

    const gltf = await loader.loadAsync(glbUrl)
    const terrainModel = gltf.scene
    
    terrainModel.traverse((child) => {
      if (child instanceof THREE.Mesh && !this.mesh) {
        this.mesh = child
      }
    })

    // Align 320-unit Blender geometry to 512-unit world size
    // if (this.mesh) {
    //   const originalBlenderSize = 512
    //   const scaleFactor = this.size / originalBlenderSize
    //   // Scale the geometry itself to ensure raycaster and physics use updated bounds
    //   this.mesh.geometry.scale(scaleFactor, 1, scaleFactor)
    //   this.mesh.updateMatrixWorld()
    // }

    if (this.world && this.rapier && this.mesh) {
      this.setPhysical(this.mesh.geometry)
    }

    this.setVisual()
  }

  setVisual() {
    const geometry = new THREE.PlaneGeometry(this.size, this.size, this.subdivision, this.subdivision)
    geometry.rotateX(-Math.PI * 0.5)

    const material = new THREE.MeshStandardMaterial({
      // --- TERRAIN REFLECTION TUNING ---
      // To reduce the "too strong" reflection on the terrain:
      // 1. Increase roughness (closer to 1.0) to make the surface more matte.
      // 2. Decrease metalness (closer to 0.0) to reduce specular highlights.
      roughness: 0.8,
      metalness: 0.1
    })

    const uniforms = {
      uSplatTexture: { value: this.splatTexture },
      uGradientTexture: { value: this.gradientTexture },
      uGrassColor: { value: this.grassColor },
      uTerrainSize: { value: this.size }
    }

    material.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...uniforms }

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform sampler2D uSplatTexture;
        uniform float uTerrainSize;
        varying vec4 vTerrainData;
        `
      )

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        
        vec2 splatUv = vec2(position.x / uTerrainSize + 0.5, 0.5 - position.z / uTerrainSize);
        vTerrainData = texture2D(uSplatTexture, splatUv);
        
        float uvDim = min(min(uv.x, uv.y) * 20.0, 1.0);
        uvDim = min(uvDim, min(1.0 - uv.x, 1.0 - uv.y) * 20.0);
        
        transformed.y += vTerrainData.b * -1.5 * uvDim;
        `
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform sampler2D uGradientTexture;
        uniform vec3 uGrassColor;
        varying vec4 vTerrainData;
        `
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec3 baseColor = texture2D(uGradientTexture, vec2(0.0, 1.0 - vTerrainData.b)).rgb;
        vec3 withGrass = mix(baseColor, uGrassColor, vTerrainData.g);
        
        diffuseColor.rgb = withGrass;
        `
      )
    }

    const visualMesh = new THREE.Mesh(geometry, material)
    visualMesh.receiveShadow = true
        // position test 1
    // console.log(visualMesh.position);         // should be (0,0,0)
    // console.log(visualMesh.parent?.position); // parent offset?
    // console.log(visualMesh.matrixWorld);      // after scene update
    this.scene.add(visualMesh)

    // position test 2
    // const axesHelper = new THREE.AxesHelper(100);
    // this.scene.add(axesHelper);

    // position test 3
    // setTimeout(() => {
    //   console.log(visualMesh.getWorldPosition(new THREE.Vector3()));
    // }, 100);

    // Add a solid base (skirt) to make the terrain look like a physical block
    // and hide the "empty" space underneath when the camera is at low angles.
    const baseDepth = 20
    const baseGeometry = new THREE.BoxGeometry(this.size, baseDepth, this.size)
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: '#2a1f14', // Dark earthy color
      roughness: 0.9,
      metalness: 0.0
    })
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial)
    // Position it so the top is just below the terrain's lowest point
    baseMesh.position.y = -(baseDepth * 0.5) - 1.5 
    this.scene.add(baseMesh)
  }

  setPhysics(world: RAPIER.World, rapier: any) {
    this.world = world
    this.rapier = rapier
  }

  initPhysics() {
    if (this.mesh && this.world && this.rapier && !this.collider) {
      this.setPhysical(this.mesh.geometry)
    }
  }

  setPhysical(geometry: THREE.BufferGeometry) {
    if (!this.world || !this.rapier) return

    const positionAttribute = geometry.attributes.position
    const totalCount = positionAttribute.count
    const rowsCount = Math.sqrt(totalCount)
    const heights = new Float32Array(totalCount)
    const halfExtent = this.size / 2

    for (let i = 0; i < totalCount; i++) {
      const x = positionAttribute.array[i * 3 + 0]
      const y = positionAttribute.array[i * 3 + 1]
      const z = positionAttribute.array[i * 3 + 2]
      
      const indexX = Math.round(((x / (halfExtent * 2)) + 0.5) * (rowsCount - 1))
      const indexZ = Math.round(((z / (halfExtent * 2)) + 0.5) * (rowsCount - 1))
      const index = indexZ + indexX * rowsCount

      heights[index] = y
    }

    const scale = { x: this.size, y: 1, z: this.size }
    const colliderDesc = this.rapier.ColliderDesc.heightfield(
      rowsCount - 1,
      rowsCount - 1,
      heights,
      scale
    )
    
    this.collider = this.world.createCollider(colliderDesc)
  }

  private raycaster = new THREE.Raycaster()
  private down = new THREE.Vector3(0, -1, 0)

  getHeightAt(x: number, z: number): number {
    if (!this.mesh) return 0
    this.raycaster.set(new THREE.Vector3(x, 100, z), this.down)
    const intersects = this.raycaster.intersectObject(this.mesh, true)
    return intersects.length > 0 ? intersects[0].point.y : 0
  }
}

export function useTerrain() {
  return { Terrain }
}
