import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { gsap } from 'gsap'

export interface WheelConfig {
  name: string
  radius: number
  isBigWheel: boolean
  spinDirection?: 1 | -1
  rotationAxis?: 'x' | 'y' | 'z'
}

export interface TrainBodyOptions {
  halfExtents: THREE.Vector3
}

// Collision groups for proper filtering
export const COLLISION_GROUPS = {
  TRAIN: 0x0001,
  TRACK: 0x0002,
  BRICK: 0x0004,
  TERRAIN: 0x0008,
}

export function useTrainPhysics() {
  let rapier: typeof RAPIER | null = null
  let physicsWorld: RAPIER.World | null = null
  let physicsAccumulator = 0
  const FIXED_TIMESTEP = 1 / 60

  const wheels: WheelConfig[] = [
    { name: 'SmallWheels1',  radius: 0.71, isBigWheel: false, rotationAxis: 'x', spinDirection:  1 },
    { name: 'SmallWheels_2', radius: 0.71, isBigWheel: false, rotationAxis: 'z', spinDirection: -1 },
    { name: 'BigWheels_3',   radius: 1.0,  isBigWheel: true,  rotationAxis: 'z', spinDirection:  1 },
    { name: 'BigWheels_2',   radius: 1.0,  isBigWheel: true,  rotationAxis: 'z', spinDirection:  1 },
    { name: 'BigWheels_1',   radius: 1.0,  isBigWheel: true,  rotationAxis: 'z', spinDirection:  1 },
  ]

  const trainBodyRef   = { body: null as RAPIER.RigidBody | null }
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

  function setCollisionFilter(terrainOnly: boolean) {
    if (!trainBodyRef.body || !rapier || !physicsWorld) return
    
    // Update all colliders attached to the train body
    const numColliders = trainBodyRef.body.numColliders()
    for (let i = 0; i < numColliders; i++) {
      const handle = trainBodyRef.body.collider(i)
      const collider = physicsWorld.getCollider(handle)
      if (collider) {
        let groups = (COLLISION_GROUPS.TRAIN << 16)
        if (terrainOnly) {
          // Collide ONLY with terrain
          groups |= COLLISION_GROUPS.TERRAIN
        } else {
          // Collide with bricks AND terrain
          groups |= COLLISION_GROUPS.BRICK | COLLISION_GROUPS.TERRAIN
        }
        collider.setCollisionGroups(groups)
      }
    }
  }

  function createGroundCollider(world: RAPIER.World) {
    if (!rapier) throw new Error('Rapier not initialized')

    const groundColliderDesc = rapier.ColliderDesc.cuboid(200, 0.05, 200)
      .setTranslation(0, -0.05, 0)
      .setRestitution(0.1)
      .setFriction(1.0)

    world.createCollider(groundColliderDesc)
  }

  /**
   * Creates a static trimesh collider from a Three.js mesh, correctly accounting
   * for the mesh's world transform.
   */
  function createStaticTrimesh(world: RAPIER.World, mesh: THREE.Mesh): RAPIER.Collider {
    if (!rapier) throw new Error('Rapier not initialized')

    const geometry = mesh.geometry
    const posAttr = geometry.attributes.position
    if (!posAttr) throw new Error('Mesh geometry has no position attribute')
    const vertices = posAttr.array as Float32Array
    const indices  = geometry.index
      ? (geometry.index.array as Uint32Array)
      : new Uint32Array(vertices.length / 3).map((_, i) => i)

    const worldPos   = new THREE.Vector3()
    const worldQuat  = new THREE.Quaternion()
    const worldScale = new THREE.Vector3()
    mesh.updateMatrixWorld(true)
    mesh.matrixWorld.decompose(worldPos, worldQuat, worldScale)

    let finalVertices = vertices
    if (
      Math.abs(worldScale.x - 1) > 0.001 ||
      Math.abs(worldScale.y - 1) > 0.001 ||
      Math.abs(worldScale.z - 1) > 0.001
    ) {
      finalVertices = new Float32Array(vertices.length)
      for (let i = 0; i < vertices.length; i += 3) {
        finalVertices[i]     = vertices[i]!     * worldScale.x
        finalVertices[i + 1] = vertices[i + 1]! * worldScale.y
        finalVertices[i + 2] = vertices[i + 2]! * worldScale.z
      }
    }

    const colliderDesc = rapier.ColliderDesc.trimesh(finalVertices, indices)
    colliderDesc.setTranslation(worldPos.x, worldPos.y, worldPos.z)
    colliderDesc.setRotation(worldQuat)
    // Track collides with bricks and train
    colliderDesc.setCollisionGroups((COLLISION_GROUPS.TRACK << 16) | COLLISION_GROUPS.BRICK | COLLISION_GROUPS.TRAIN)

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

    body.setEnabledRotations(true, true, true, true)
    body.setEnabledTranslations(true, true, true, true)

    const colliderDesc = rapier.ColliderDesc.cuboid(
      options.halfExtents.x,
      options.halfExtents.y,
      options.halfExtents.z
    )
      .setRestitution(0.1)
      .setFriction(0.8)
      // Train collides with bricks, track and terrain by default
      .setCollisionGroups((COLLISION_GROUPS.TRAIN << 16) | COLLISION_GROUPS.BRICK | COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.TRACK)

    world.createCollider(colliderDesc, body)

    trainBodyRef.body = body
    return body
  }

  function collectWheelMeshes(locomotive: THREE.Object3D) {
    const wheelMeshes: { mesh: THREE.Object3D; wheel: WheelConfig }[] = []

    locomotive.traverse((child: THREE.Object3D) => {
      const matchedWheel = wheels.find((w) => child.name.includes(w.name))
      if (matchedWheel) wheelMeshes.push({ mesh: child, wheel: matchedWheel })
    })

    wheelMeshesRef.meshes = wheelMeshes
    return wheelMeshes
  }

  function animateWheels(locomotive: THREE.Object3D, duration = 5, distance = 15) {
    const wheelMeshes    = collectWheelMeshes(locomotive)
    const travelDirection = distance >= 0 ? -1 : 1

    wheelMeshes.forEach(({ mesh, wheel }) => {
      const rotations    = Math.abs(distance) / wheel.radius
      const totalRotation = rotations * Math.PI * 2
      const axis          = wheel.rotationAxis || 'x'
      const spinDirection = wheel.spinDirection ?? 1
      const signedDelta   = totalRotation * spinDirection * travelDirection

      gsap.to(mesh.rotation, {
        [axis]: `${signedDelta >= 0 ? '+=' : '-='}${Math.abs(signedDelta)}`,
        duration,
        ease: 'power2.inOut',
      })
    })

    return wheelMeshes
  }

  function startWheelSpin(locomotive: THREE.Object3D, rpm = 90) {
    const wheelMeshes       = collectWheelMeshes(locomotive)
    const rotationPerSecond = (rpm / 60) * Math.PI * 2

    return wheelMeshes.map(({ mesh, wheel }) => {
      const axis = wheel.rotationAxis || 'x'
      const signedRPS = rotationPerSecond * (wheel.spinDirection ?? 1)

      return gsap.to(mesh.rotation, {
        [axis]: `${signedRPS >= 0 ? '+=' : '-='}${Math.abs(signedRPS)}`,
        duration: 1,
        repeat: -1,
        ease: 'none',
      })
    })
  }

  function animateTrainMotion(trainBody: RAPIER.RigidBody, distance = 15, duration = 5) {
    const startTranslation = trainBody.translation()
    const targetX = startTranslation.x + distance
    const proxy   = { x: startTranslation.x }

    return gsap.to(proxy, {
      x: targetX,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        trainBody.setNextKinematicTranslation({ x: proxy.x, y: startTranslation.y, z: startTranslation.z })
      },
      onComplete: () => {
        trainBody.setTranslation({ x: targetX, y: startTranslation.y, z: startTranslation.z }, true)
      },
    })
  }

  function rotateWheelsByDistance(locomotive: THREE.Object3D, distanceDelta: number) {
    const wheelMeshes = wheelMeshesRef.meshes.length > 0
      ? wheelMeshesRef.meshes
      : collectWheelMeshes(locomotive)

    wheelMeshes.forEach(({ mesh, wheel }) => {
      const axis          = wheel.rotationAxis || 'x'
      const spinDirection = wheel.spinDirection ?? 1
      const rotationDelta = (Math.abs(distanceDelta) / wheel.radius) * Math.PI * 2
      const signedDelta   = rotationDelta * spinDirection * (distanceDelta >= 0 ? -1 : 1)

      mesh.rotation[axis] += signedDelta
    })
  }

  function stepPhysics(world: RAPIER.World, deltaTime: number, onStep?: (dt: number) => void) {
    physicsAccumulator += deltaTime

    while (physicsAccumulator >= FIXED_TIMESTEP) {
      if (onStep) onStep(FIXED_TIMESTEP)
      world.timestep = FIXED_TIMESTEP
      world.step()
      physicsAccumulator -= FIXED_TIMESTEP
    }
  }

  function cleanup() {
    if (physicsWorld) {
      try { physicsWorld.free() }
      catch (e) { console.warn('Error freeing physics world:', e) }
      physicsWorld = null
    }

    rapier = null
    physicsAccumulator = 0
    trainBodyRef.body  = null
    wheelMeshesRef.meshes = []
  }

  return {
    initPhysics,
    createGroundCollider,
    createTrainBody,
    animateWheels,
    startWheelSpin,
    rotateWheelsByDistance,
    animateTrainMotion,
    collectWheelMeshes,
    stepPhysics,
    createStaticTrimesh,
    setCollisionFilter,
    cleanup,
    wheels,
    trainBodyRef,
    wheelMeshesRef,
    get physicsWorld() { return physicsWorld },
    get rapier()       { return rapier },
    // Expose collision groups for use in brick creation
    COLLISION_GROUPS,
  }
}
