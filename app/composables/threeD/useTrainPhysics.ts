import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { gsap } from 'gsap'

export interface WheelConfig {
  name: string
  radius: number
  isBigWheel: boolean
  spinDirection?: 1 | -1
  /** Which axis to rotate: 'x', 'y', or 'z' - depends on Blender orientation */
  rotationAxis?: 'x' | 'y' | 'z'
}

export interface PhysicsBlock {
  mesh: THREE.Object3D
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
  initialPos: THREE.Vector3
  instanceIndex?: number
  lastHitTime?: number
}

export interface TrainBodyOptions {
  halfExtents: THREE.Vector3
}

export function useTrainPhysics() {
  let rapier: typeof RAPIER | null = null
  let physicsWorld: RAPIER.World | null = null
  let physicsAccumulator = 0
  const FIXED_TIMESTEP = 1 / 60
  const BRICK_HIT_THROTTLE_MS = 120

  const wheels: WheelConfig[] = [
    { name: 'SmallWheels1', radius: 0.71, isBigWheel: false, rotationAxis: 'y', spinDirection: 1 },
    { name: 'SmallWheels_2', radius: 0.71, isBigWheel: false, rotationAxis: 'z', spinDirection: -1 },
    { name: 'BigWheels_3', radius: 1.0, isBigWheel: true, rotationAxis: 'z', spinDirection: 1 },
    { name: 'BigWheels_2', radius: 1.0, isBigWheel: true, rotationAxis: 'z', spinDirection: 1 },
    { name: 'BigWheels_1', radius: 1.0, isBigWheel: true, rotationAxis: 'z', spinDirection: 1 },
  ]

  const trainBodyRef = { body: null as RAPIER.RigidBody | null }
  const blocksRef = { blocks: [] as PhysicsBlock[] }
  const blockRenderMeshesRef = { meshes: [] as THREE.Object3D[] }
  const wheelMeshesRef = { meshes: [] as { mesh: THREE.Object3D; wheel: WheelConfig }[] }

  async function initPhysics() {
    if (rapier) return physicsWorld

    rapier = await import('@dimforge/rapier3d-compat')
    await rapier.init()

    const gravity = { x: 0.0, y: -9.81, z: 0.0 }
    physicsWorld = new rapier.World(gravity)
    physicsAccumulator = 0
    
    return physicsWorld
  }

  function createGroundCollider(world: RAPIER.World) {
    if (!rapier) throw new Error('Rapier not initialized')

    // Flat ground aligned with the visual plane at y = 0.
    const groundColliderDesc = rapier.ColliderDesc.cuboid(200, 0.05, 200)
      .setTranslation(0, -0.05, 0)
      .setRestitution(0.1)
      .setFriction(1.0)

    world.createCollider(groundColliderDesc)
  }

  function createTerrainCollider(world: RAPIER.World, heights: Float32Array, width: number, depth: number, resX: number, resY: number) {
    if (!rapier) throw new Error('Rapier not initialized')

    const scale = {
      x: width / (resX - 1),
      y: 1,
      z: depth / (resY - 1)
    }

    const colliderDesc = rapier.ColliderDesc.heightfield(
      resX - 1,
      resY - 1,
      heights,
      scale
    )
    return world.createCollider(colliderDesc)
  }

  function createTrimeshCollider(world: RAPIER.World, vertices: Float32Array, indices: Uint32Array) {
    if (!rapier) throw new Error('Rapier not initialized')
    const colliderDesc = rapier.ColliderDesc.trimesh(vertices, indices)
    return world.createCollider(colliderDesc)
  }

  function createTrainBody(
    world: RAPIER.World,
    position: THREE.Vector3,
    options: TrainBodyOptions
  ): RAPIER.RigidBody {
    if (!rapier) throw new Error('Rapier not initialized')

    const rigidBodyDesc = rapier.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z)

    const body = world.createRigidBody(rigidBodyDesc)

    // Keep the train upright and restricted to the rail direction.
    body.setEnabledRotations(false, false, false, true)
    body.setEnabledTranslations(true, false, false, true)

    const colliderDesc = rapier.ColliderDesc.cuboid(
      options.halfExtents.x,
      options.halfExtents.y,
      options.halfExtents.z
    )
      .setRestitution(0.1)
      .setFriction(0.8)

    world.createCollider(colliderDesc, body)

    trainBodyRef.body = body
    return body
  }

  function createPhysicsBlocks(
    world: RAPIER.World,
    count: number = 22,
    startPos: THREE.Vector3 = new THREE.Vector3(10, 0.01, 0)
  ): PhysicsBlock[] {
    if (!rapier) throw new Error('Rapier not initialized')

    type BrickPreset = {
      key: string
      width: number
      height: number
      depth: number
      layers: number
      bricksPerLayer: number
      gapX: number
    }

    type SpawnBrick = {
      key: string
      width: number
      height: number
      depth: number
      position: THREE.Vector3
      quaternion: THREE.Quaternion
      color: THREE.Color
      body: RAPIER.RigidBody
      collider: RAPIER.Collider
    }

    const presets: BrickPreset[] = [
      { key: 'compact', width: 0.45, height: 0.2, depth: 0.24, layers: 9, bricksPerLayer: 5, gapX: 1.05 },
      { key: 'low-wide', width: 0.52, height: 0.18, depth: 0.24, layers: 9, bricksPerLayer: 5, gapX: 1.15 },
      { key: 'tall', width: 0.4, height: 0.22, depth: 0.25, layers: 9, bricksPerLayer: 5, gapX: 0.95 },
      { key: 'dense', width: 0.42, height: 0.19, depth: 0.26, layers: 9, bricksPerLayer: 5, gapX: 1.05 },
    ]

    const blocks: PhysicsBlock[] = []
    const pendingSpawns: SpawnBrick[] = []
    const dummyMesh = new THREE.Object3D()
    let formationCursorX = startPos.x + 5

    for (let i = 0; i < count; i++) {
      const preset = presets[Math.floor(Math.random() * presets.length)]!
      const setYaw = Math.PI / 2 // Rotate every brick set 90°.
      const formationBaseZ = startPos.z + (Math.random() - 0.5) * 1.7
      const localSpan = preset.bricksPerLayer * preset.width

      for (let layer = 0; layer < preset.layers; layer++) {
        const layerOffset = layer % 2 === 0 ? 0 : preset.width * 0.5

        for (let column = 0; column < preset.bricksPerLayer; column++) {
          const localX = column * preset.width + layerOffset - localSpan * 0.5
          const x = formationCursorX + Math.cos(setYaw) * localX
          const y = startPos.y + preset.height * 0.5 + layer * preset.height * 1.02
          const z = formationBaseZ + Math.sin(setYaw) * localX + (Math.random() - 0.5) * 0.06

          const rotation = new THREE.Euler(
            (Math.random() - 0.5) * 0.04,
            setYaw + (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.03
          )
          const quaternion = new THREE.Quaternion().setFromEuler(rotation)

          const rigidBodyDesc = rapier.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setRotation(quaternion)
            .setLinearDamping(0.14)
            .setAngularDamping(0.22)

          const body = world.createRigidBody(rigidBodyDesc)
          const colliderDesc = rapier.ColliderDesc.cuboid(preset.width / 2, preset.height / 2, preset.depth / 2)
            .setDensity(0.72)
            .setRestitution(0.16)
            .setFriction(0.9)
          const collider = world.createCollider(colliderDesc, body)

          pendingSpawns.push({
            key: preset.key,
            width: preset.width,
            height: preset.height,
            depth: preset.depth,
            position: new THREE.Vector3(x, y, z),
            quaternion,
            color: new THREE.Color().setHSL(
              0.055 + Math.random() * 0.015,
              0.45 + Math.random() * 0.12,
              0.38 + Math.random() * 0.12
            ),
            body,
            collider,
          })
        }
      }

      formationCursorX -= (preset.gapX + Math.random() * 0.9) * 5
    }

    const buckets = new Map<string, SpawnBrick[]>()
    pendingSpawns.forEach((spawn) => {
      const bucketKey = `${spawn.key}:${spawn.width}:${spawn.height}:${spawn.depth}`
      const list = buckets.get(bucketKey)
      if (list) list.push(spawn)
      else buckets.set(bucketKey, [spawn])
    })

    const renderMeshes: THREE.Object3D[] = []
    const tempMatrix = new THREE.Matrix4()
    const tempScale = new THREE.Vector3(1, 1, 1)

    buckets.forEach((items) => {
      const first = items[0]
      if (!first) return
      const geometry = new THREE.BoxGeometry(first.width, first.height, first.depth)
      const material = new THREE.MeshStandardMaterial({
        color: 0xb07a5a,
        roughness: 0.92,
        metalness: 0.01,
      })
      const instanced = new THREE.InstancedMesh(geometry, material, items.length)
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      instanced.castShadow = true
      instanced.receiveShadow = true

      items.forEach((item, index) => {
        tempMatrix.compose(item.position, item.quaternion, tempScale)
        instanced.setMatrixAt(index, tempMatrix)
        instanced.setColorAt(index, item.color)
        blocks.push({
          mesh: instanced,
          body: item.body,
          collider: item.collider,
          initialPos: item.position.clone(),
          instanceIndex: index,
        })
      })

      instanced.instanceMatrix.needsUpdate = true
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
      renderMeshes.push(instanced)
    })

    // Keep API compatible for callers that still iterate blocks, while storing real render objects separately.
    if (renderMeshes.length === 0) {
      dummyMesh.visible = false
      renderMeshes.push(dummyMesh)
    }

    blockRenderMeshesRef.meshes = renderMeshes
    blocksRef.blocks = blocks
    return blocks
  }

  function collectWheelMeshes(locomotive: THREE.Group) {
    const wheelMeshes: { mesh: THREE.Object3D; wheel: WheelConfig }[] = []

    locomotive.traverse((child: THREE.Object3D) => {
      // Find a wheel config where the child name contains the wheel name
      const matchedWheel = wheels.find((w) => child.name.includes(w.name))
      if (matchedWheel) {
        wheelMeshes.push({ mesh: child, wheel: matchedWheel })
      }
    })

    wheelMeshesRef.meshes = wheelMeshes
    return wheelMeshes
  }

  function animateWheels(
    locomotive: THREE.Group,
    duration: number = 5,
    distance: number = 15
  ) {
    const wheelMeshes = collectWheelMeshes(locomotive)
    const travelDirection = distance >= 0 ? -1 : 1

    wheelMeshes.forEach(({ mesh, wheel }) => {
      const rotations = Math.abs(distance) / wheel.radius
      const totalRotation = rotations * Math.PI * 2
      const axis = wheel.rotationAxis || 'x'
      const spinDirection = wheel.spinDirection ?? 1
      const signedDelta = totalRotation * spinDirection * travelDirection

      gsap.to(mesh.rotation, {
        [axis]: `${signedDelta >= 0 ? '+=' : '-='}${Math.abs(signedDelta)}`,
        duration,
        ease: 'power2.inOut',
      })
    })

    return wheelMeshes
  }

  function startWheelSpin(
    locomotive: THREE.Group,
    rpm: number = 90
  ) {
    const wheelMeshes = collectWheelMeshes(locomotive)
    const rotationPerSecond = rpm / 60 * Math.PI * 2

    return wheelMeshes.map(({ mesh, wheel }) => {
      const axis = wheel.rotationAxis || 'x'
      const signedRotationPerSecond = rotationPerSecond * (wheel.spinDirection ?? 1)

      return gsap.to(mesh.rotation, {
        [axis]: `${signedRotationPerSecond >= 0 ? '+=' : '-='}${Math.abs(signedRotationPerSecond)}`,
        duration: 1,
        repeat: -1,
        ease: 'none',
      })
    })
  }

  function animateTrainMotion(
    trainBody: RAPIER.RigidBody,
    distance: number = 15,
    duration: number = 5
  ) {
    const startTranslation = trainBody.translation()
    const targetX = startTranslation.x + distance
    const proxy = { x: startTranslation.x }

    return gsap.to(proxy, {
      x: targetX,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const newPos = { x: proxy.x, y: startTranslation.y, z: startTranslation.z }
        trainBody.setNextKinematicTranslation(newPos)
      },
      onComplete: () => {
        trainBody.setTranslation({ x: targetX, y: startTranslation.y, z: startTranslation.z }, true)
      },
    })
  }

  function rotateWheelsByDistance(
    locomotive: THREE.Group,
    distanceDelta: number
  ) {
    const wheelMeshes = wheelMeshesRef.meshes.length > 0
      ? wheelMeshesRef.meshes
      : collectWheelMeshes(locomotive)

    wheelMeshes.forEach(({ mesh, wheel }) => {
      const axis = wheel.rotationAxis || 'x'
      const spinDirection = wheel.spinDirection ?? 1
      const rotationDelta = Math.abs(distanceDelta) / wheel.radius * Math.PI * 2
      const signedDelta = rotationDelta * spinDirection * (distanceDelta >= 0 ? -1 : 1)

      mesh.rotation[axis] += signedDelta
    })
  }

  function updatePhysicsBlocks(blocks: PhysicsBlock[]) {
    const updatedInstancedMeshes = new Set<THREE.InstancedMesh>()
    const tempMatrix = new THREE.Matrix4()
    const unitScale = new THREE.Vector3(1, 1, 1)

    blocks.forEach((block) => {
      const pos = block.body.translation()
      const rot = block.body.rotation()
      const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)

      if (block.mesh instanceof THREE.InstancedMesh && typeof block.instanceIndex === 'number') {
        tempMatrix.compose(new THREE.Vector3(pos.x, pos.y, pos.z), quat, unitScale)
        block.mesh.setMatrixAt(block.instanceIndex, tempMatrix)
        updatedInstancedMeshes.add(block.mesh)
        return
      }

      block.mesh.position.set(pos.x, pos.y, pos.z)
      block.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    })

    updatedInstancedMeshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true
    })
  }

  function stepPhysics(world: RAPIER.World, deltaTime: number, onStep?: (dt: number) => void) {
    physicsAccumulator += deltaTime

    // Use a fixed timestep to ensure deterministic and stable simulation across all devices (PC & Mobile).
    // This prevents "exploding" or unstable physics stacks at lower render frame rates.
    while (physicsAccumulator >= FIXED_TIMESTEP) {
      if (onStep) onStep(FIXED_TIMESTEP)
      world.timestep = FIXED_TIMESTEP
      world.step()
      physicsAccumulator -= FIXED_TIMESTEP
    }
  }

  function applyTrainSeparationForces(
    blocks: PhysicsBlock[],
    trainBody: RAPIER.RigidBody,
    trainSpeed: number,
    deltaTime: number,
    onBrickHit?: () => void
  ) {
    const speed = Math.abs(trainSpeed)
    if (speed <= 0.001) return

    const trainPos = trainBody.translation()
    const trainDirection = Math.sign(trainSpeed) || 1
    const wakeMinDistanceX = 0.35
    const wakeMaxDistanceX = 2.5
    const influenceZ = 2.2
    const maxSideForce = 2
    const currentTime = Date.now()

    blocks.forEach((block) => {
      const pos = block.body.translation()
      const dx = pos.x - trainPos.x
      const dz = pos.z - trainPos.z

      // Apply only after the train has passed the brick (wake effect).
      const behindTrain = dx * trainDirection < -wakeMinDistanceX
      if (!behindTrain) return

      const wakeDistance = Math.abs(dx)
      if (wakeDistance > wakeMaxDistanceX) return

      const longitudinalFactor = Math.max(0, 1 - wakeDistance / wakeMaxDistanceX)
      const lateralFactor = Math.max(0, 1 - Math.abs(dz) / influenceZ)
      const influence = longitudinalFactor * lateralFactor * lateralFactor
      if (influence <= 0) return

      // Trigger sound if the hit is strong and hasn't been played recently for this block
      if (onBrickHit && influence > 0.45 && (!block.lastHitTime || currentTime - block.lastHitTime > BRICK_HIT_THROTTLE_MS)) {
        block.lastHitTime = currentTime
        onBrickHit()
      }

      const sideSign = dz >= 0 ? 1 : -1
      const speedFactor = THREE.MathUtils.clamp(speed / 7, 0, 1)
      const sideForce = sideSign * maxSideForce * influence * (0.25 + speedFactor * 0.35)

      // Keep a very small lift to avoid sticky ground contacts while staying subtle.
      const liftForce = 0.9 * influence * (0.2 + speedFactor * 0.2)

      // Scale by deltaTime to ensure the total impulse over 1 second remains consistent 
      // regardless of the simulation frequency.
      block.body.addForce(
        { x: 0, y: liftForce * deltaTime, z: sideForce * deltaTime },
        true
      )
    })
  }

  function resetBlocks(blocks: PhysicsBlock[], _world: RAPIER.World) {
    blocks.forEach((block) => {
      block.body.setTranslation(block.initialPos, true)
      block.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      block.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    })
  }

  function setBlockBounceProfile(blocks: PhysicsBlock[], speedFactor: number) {
    const clamped = THREE.MathUtils.clamp(speedFactor, 0, 1)
    const restitution = THREE.MathUtils.lerp(0.08, 0.6, clamped)
    const linearDamping = THREE.MathUtils.lerp(0.26, 0.07, clamped)
    const angularDamping = THREE.MathUtils.lerp(0.34, 0.1, clamped)

    blocks.forEach((block) => {
      block.collider.setRestitution(restitution)
      block.body.setLinearDamping(linearDamping)
      block.body.setAngularDamping(angularDamping)
    })
  }

  function cleanup() {
    if (physicsWorld) {
      try {
        physicsWorld.free()
      } catch (e) {
        console.warn('Error freeing physics world:', e)
      }
      physicsWorld = null
    }
    
    rapier = null
    physicsAccumulator = 0
    trainBodyRef.body = null
    blocksRef.blocks = []
    blockRenderMeshesRef.meshes = []
    wheelMeshesRef.meshes = []
  }

  return {
    initPhysics,
    createGroundCollider,
    createTrainBody,
    createPhysicsBlocks,
    animateWheels,
    startWheelSpin,
    rotateWheelsByDistance,
    animateTrainMotion,
    collectWheelMeshes,
    updatePhysicsBlocks,
    stepPhysics,
    applyTrainSeparationForces,
    resetBlocks,
    setBlockBounceProfile,
    cleanup,
    wheels,
    trainBodyRef,
    blocksRef,
    blockRenderMeshesRef,
    wheelMeshesRef,
    get physicsWorld() {
      return physicsWorld
    },
    get rapier() {
      return rapier
    },
  }
}
