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
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
  body: RAPIER.RigidBody
  initialPos: THREE.Vector3
}

export interface TrainBodyOptions {
  halfExtents: THREE.Vector3
}

export function useTrainPhysics() {
  let rapier: typeof RAPIER | null = null
  let physicsWorld: RAPIER.World | null = null

  const wheels: WheelConfig[] = [
    { name: 'SmallWheels1', radius: 0.3, isBigWheel: false, rotationAxis: 'y', spinDirection: 1 },
    { name: 'SmallWheels_2', radius: 0.3, isBigWheel: false, rotationAxis: 'z', spinDirection: -1 },
    { name: 'BigWheels3002', radius: 0.6, isBigWheel: true, rotationAxis: 'z', spinDirection: 1 },
    { name: 'BigWheels3001', radius: 0.6, isBigWheel: true, rotationAxis: 'z', spinDirection: 1 },
    { name: 'BigWheels3', radius: 0.6, isBigWheel: true, rotationAxis: 'z', spinDirection: 1 },
  ]

  const trainBodyRef = { body: null as RAPIER.RigidBody | null }
  const blocksRef = { blocks: [] as PhysicsBlock[] }
  const wheelMeshesRef = { meshes: [] as { mesh: THREE.Object3D; wheel: WheelConfig }[] }

  async function initPhysics() {
    if (rapier) return physicsWorld

    rapier = await import('@dimforge/rapier3d-compat')
    await rapier.init()

    const gravity = { x: 0.0, y: -9.81, z: 0.0 }
    physicsWorld = new rapier.World(gravity)
    
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
    count: number = 10,
    startPos: THREE.Vector3 = new THREE.Vector3(10, 0.5, 0)
  ): PhysicsBlock[] {
    if (!rapier) throw new Error('Rapier not initialized')
    
    const blocks: PhysicsBlock[] = []

    let formationCursorX = startPos.x

    for (let i = 0; i < count; i++) {
      // Mixed formations make the obstacle field feel less repetitive.
      const layers = Math.random() > 0.45 ? 4 : 2
      const bricksPerLayer = 2 + Math.floor(Math.random() * 2)
      const brickWidth = 0.42 + Math.random() * 0.12
      const brickHeight = 0.18 + Math.random() * 0.05
      const brickDepth = 0.24 + Math.random() * 0.08
      const formationWidth = bricksPerLayer * brickWidth
      const formationBaseZ = startPos.z + (Math.random() - 0.5) * 1.35

      for (let layer = 0; layer < layers; layer++) {
        const layerOffset = layer % 2 === 0 ? 0 : brickWidth * 0.5

        for (let column = 0; column < bricksPerLayer; column++) {
          const width = brickWidth * (0.94 + Math.random() * 0.12)
          const height = brickHeight * (0.96 + Math.random() * 0.08)
          const depth = brickDepth * (0.94 + Math.random() * 0.12)
          const x = formationCursorX + column * brickWidth + layerOffset
          const y = startPos.y + height * 0.5 + layer * brickHeight * 1.02
          const z = formationBaseZ + (Math.random() - 0.5) * 0.08

          const geometry = new THREE.BoxGeometry(width, height, depth)
          const material = new THREE.MeshStandardMaterial({
            // Warm earth bricks feel more playful and readable than test cubes.
            color: new THREE.Color().setHSL(
              0.055 + Math.random() * 0.015,
              0.45 + Math.random() * 0.12,
              0.38 + Math.random() * 0.12
            ),
            roughness: 0.92,
            metalness: 0.01,
          })
          const mesh = new THREE.Mesh(geometry, material)
          mesh.castShadow = true
          mesh.receiveShadow = true
          mesh.rotation.set(
            (Math.random() - 0.5) * 0.04,
            (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.03
          )

          const rigidBodyDesc = rapier.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setRotation(mesh.quaternion)
            .setLinearDamping(0.14)
            .setAngularDamping(0.22)

          const body = world.createRigidBody(rigidBodyDesc)

          const colliderDesc = rapier.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
            // Lower density makes the stacks burst nicely on collision.
            .setDensity(0.72)
            .setRestitution(0.16)
            .setFriction(0.9)

          world.createCollider(colliderDesc, body)

          blocks.push({
            mesh,
            body,
            initialPos: new THREE.Vector3(x, y, z),
          })
        }
      }

      // Increase the gap to create several readable clusters instead of one long wall.
      formationCursorX += formationWidth + 0.7 + Math.random() * 0.8
    }

    blocksRef.blocks = blocks
    return blocks
  }

  function collectWheelMeshes(locomotive: THREE.Group) {
    const wheelMeshes: { mesh: THREE.Object3D; wheel: WheelConfig }[] = []

    locomotive.traverse((child) => {
      const matchedWheel = wheels.find((w) => child.name === w.name)
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
    blocks.forEach((block) => {
      const pos = block.body.translation()
      const rot = block.body.rotation()
      
      block.mesh.position.set(pos.x, pos.y, pos.z)
      block.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    })
  }

  function stepPhysics(world: RAPIER.World, deltaTime: number = 1 / 60) {
    world.timestep = deltaTime
    world.step()
  }

  function resetBlocks(blocks: PhysicsBlock[], _world: RAPIER.World) {
    blocks.forEach((block) => {
      block.body.setTranslation(block.initialPos, true)
      block.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      block.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
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
    trainBodyRef.body = null
    blocksRef.blocks = []
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
    resetBlocks,
    cleanup,
    wheels,
    trainBodyRef,
    blocksRef,
    wheelMeshesRef,
    get physicsWorld() {
      return physicsWorld
    },
    get rapier() {
      return rapier
    },
  }
}
