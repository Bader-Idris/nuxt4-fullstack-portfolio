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
  /**
   * When true, skip the default single-cuboid collider.
   * Use addWheelColliders() afterwards to attach per-wheel shapes instead.
   */
  skipCuboidCollider?: boolean
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

  const trainBodyRef       = { body: null as RAPIER.RigidBody | null }
  const wheelMeshesRef     = { meshes: [] as { mesh: THREE.Object3D; wheel: WheelConfig; initialRotation: THREE.Euler }[] }
  /** Cylinder colliders attached to the kinematic body, one per wheel mesh. */
  const wheelCollidersRef  = { colliders: [] as RAPIER.Collider[] }

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

    const numColliders = trainBodyRef.body.numColliders()
    for (let i = 0; i < numColliders; i++) {
      const collider = trainBodyRef.body.collider(i)
      if (collider) {
        let groups = (COLLISION_GROUPS.TRAIN << 16)
        if (terrainOnly) {
          groups |= COLLISION_GROUPS.TERRAIN
        } else {
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

    if (!options.skipCuboidCollider) {
      const colliderDesc = rapier.ColliderDesc.cuboid(
        options.halfExtents.x,
        options.halfExtents.y,
        options.halfExtents.z
      )
        .setRestitution(0.1)
        .setFriction(0.8)
        .setCollisionGroups((COLLISION_GROUPS.TRAIN << 16) | COLLISION_GROUPS.BRICK | COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.TRACK)

      world.createCollider(colliderDesc, body)
    }

    trainBodyRef.body = body
    return body
  }

  function addWheelColliders(
    world: RAPIER.World,
    body: RAPIER.RigidBody,
    locomotive: THREE.Object3D,
    trainBodyOffset: THREE.Vector3
  ): RAPIER.Collider[] {
    if (!rapier) throw new Error('Rapier not initialized')

    const meshes = wheelMeshesRef.meshes.length > 0
      ? wheelMeshesRef.meshes
      : collectWheelMeshes(locomotive)

    if (meshes.length === 0) {
      console.warn('[useTrainPhysics] addWheelColliders: no wheel meshes found – call collectWheelMeshes() first')
      return []
    }

    const bodyWorldPos    = locomotive.position.clone().add(trainBodyOffset)
    const bodyWorldQuatInv = locomotive.quaternion.clone().invert()

    const colliders: RAPIER.Collider[] = []

    for (const { mesh, wheel } of meshes) {
      mesh.updateMatrixWorld(true)

      const wheelWorldPos = new THREE.Vector3()
      mesh.getWorldPosition(wheelWorldPos)

      const localPos = wheelWorldPos
        .clone()
        .sub(bodyWorldPos)
        .applyQuaternion(bodyWorldQuatInv)

      const localRot = new THREE.Quaternion()
      if (wheel.rotationAxis === 'x') {
        localRot.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2)
      } else {
        localRot.setFromAxisAngle(new THREE.Vector3(1, 0, 0),  Math.PI / 2)
      }

      const halfWidth = wheel.isBigWheel ? 0.14 : 0.10

      const colliderDesc = rapier.ColliderDesc
        .cylinder(halfWidth, wheel.radius)
        .setTranslation(localPos.x, localPos.y, localPos.z)
        .setRotation(localRot)
        .setRestitution(0.06)
        .setFriction(1.0)
        .setCollisionGroups(
          (COLLISION_GROUPS.TRAIN << 16) |
          COLLISION_GROUPS.BRICK | COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.TRACK
        )

      const collider = world.createCollider(colliderDesc, body)
      colliders.push(collider)
    }

    wheelCollidersRef.colliders = colliders
    console.log(`[useTrainPhysics] addWheelColliders: attached ${colliders.length} wheel colliders`)
    return colliders
  }

  function collectWheelMeshes(locomotive: THREE.Object3D) {
    const wheelMeshes: { mesh: THREE.Object3D; wheel: WheelConfig; initialRotation: THREE.Euler }[] = []

    locomotive.traverse((child: THREE.Object3D) => {
      const matchedWheel = wheels.find((w) => child.name.includes(w.name))
      if (matchedWheel) {
        // Store the original rotation as a clone of the current Euler angles
        const initialRotation = child.rotation.clone()
        wheelMeshes.push({ mesh: child, wheel: matchedWheel, initialRotation })
      }
    })

    wheelMeshesRef.meshes = wheelMeshes
    return wheelMeshes
  }

  /**
   * Resets all wheel meshes back to their imported (initial) rotation.
   * Useful before starting a new animation or after a teleport.
   */
  function resetWheelRotations() {
    for (const { mesh, initialRotation } of wheelMeshesRef.meshes) {
      mesh.rotation.copy(initialRotation)
    }
  }

  function animateWheels(locomotive: THREE.Object3D, duration = 5, distance = 15) {
    // Ensure we have the wheel meshes and that they are at initial rotation
    let wheelMeshes = wheelMeshesRef.meshes
    if (wheelMeshes.length === 0) {
      wheelMeshes = collectWheelMeshes(locomotive)
    }
    resetWheelRotations() // start from original orientation

    const travelDirection = distance >= 0 ? -1 : 1

    wheelMeshes.forEach(({ mesh, wheel, initialRotation }) => {
      const rotations = Math.abs(distance) / wheel.radius
      const totalRotation = rotations * Math.PI * 2
      const axis = wheel.rotationAxis || 'x'
      const spinDirection = wheel.spinDirection ?? 1
      const signedDelta = totalRotation * spinDirection * travelDirection

      // Animate relative to the initial rotation
      gsap.to(mesh.rotation, {
        [axis]: initialRotation[axis] + signedDelta,
        duration,
        ease: 'power2.inOut',
      })
    })

    return wheelMeshes
  }

  function startWheelSpin(locomotive: THREE.Object3D, rpm = 90) {
    let wheelMeshes = wheelMeshesRef.meshes
    if (wheelMeshes.length === 0) {
      wheelMeshes = collectWheelMeshes(locomotive)
    }
    resetWheelRotations()

    const rotationPerSecond = (rpm / 60) * Math.PI * 2

    return wheelMeshes.map(({ mesh, wheel, initialRotation }) => {
      const axis = wheel.rotationAxis || 'x'
      const signedRPS = rotationPerSecond * (wheel.spinDirection ?? 1)

      // Infinite tween relative to initial rotation
      return gsap.to(mesh.rotation, {
        [axis]: `+=${signedRPS}`,
        duration: 1,
        repeat: -1,
        ease: 'none',
        modifiers: {
          [axis]: (x) => {
            // Keep the rotation relative to initialRotation
            const current = parseFloat(x)
            const base = initialRotation[axis]
            return (base + (current - base)) % (Math.PI * 2)
          }
        }
      })
    })
  }

  function animateTrainMotion(trainBody: RAPIER.RigidBody, distance = 15, duration = 5) {
    const startTranslation = trainBody.translation()
    const targetZ = startTranslation.z + distance
    const proxy = { z: startTranslation.z }

    return gsap.to(proxy, {
      z: targetZ,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        trainBody.setNextKinematicTranslation({
          x: startTranslation.x,
          y: startTranslation.y,
          z: proxy.z
        })
      },
      onComplete: () => {
        trainBody.setTranslation({
          x: startTranslation.x,
          y: startTranslation.y,
          z: targetZ
        }, true)
      },
    })
  }

  function rotateWheelsByDistance(locomotive: THREE.Object3D, distanceDelta: number) {
    let wheelMeshes = wheelMeshesRef.meshes
    if (wheelMeshes.length === 0) {
      wheelMeshes = collectWheelMeshes(locomotive)
    }

    for (const { mesh, wheel, initialRotation } of wheelMeshes) {
      const axis = wheel.rotationAxis || 'x'
      const spinDirection = wheel.spinDirection ?? 1
      const rotationDelta = (Math.abs(distanceDelta) / wheel.radius) * Math.PI * 2
      const signedDelta = rotationDelta * spinDirection * (distanceDelta >= 0 ? -1 : 1)

      // Apply relative to the stored initial rotation
      mesh.rotation[axis] = initialRotation[axis] + signedDelta
    }
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

  function castRay(world: RAPIER.World, origin: { x: number, y: number, z: number }, direction: { x: number, y: number, z: number }, maxDistance: number = 10) {
    if (!rapier) return null
    const ray = new rapier.Ray(origin, direction)
    const hit = world.castRay(ray, maxDistance, true, undefined, undefined, undefined, undefined, (collider) => {
      const groups = collider.collisionGroups()
      const memberships = groups >> 16
      return (memberships & COLLISION_GROUPS.TRACK) !== 0
    })

    if (hit) {
      const point = ray.pointAt(hit.timeOfImpact)
      return { point, time: hit.timeOfImpact, collider: hit.collider }
    }
    return null
  }

  function castRayAny(
    world: RAPIER.World,
    origin: { x: number, y: number, z: number },
    direction: { x: number, y: number, z: number },
    maxDistance: number = 10,
    excludeBody?: RAPIER.RigidBody | null
  ) {
    if (!rapier) return null
    const ray = new rapier.Ray(origin, direction)
    const hit = world.castRay(ray, maxDistance, true, undefined, undefined, undefined, undefined, (collider) => {
      if (excludeBody && collider.parent()?.handle === excludeBody.handle) return false
      return true
    })
    if (hit) {
      const point = ray.pointAt(hit.timeOfImpact)
      return { point, time: hit.timeOfImpact, collider: hit.collider }
    }
    return null
  }

  function cleanup() {
    if (physicsWorld) {
      physicsWorld.free()
      physicsWorld = null
    }
    rapier = null
    trainBodyRef.body = null
    wheelMeshesRef.meshes = []
    wheelCollidersRef.colliders = []
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
    castRay,
    castRayAny,
    cleanup,
    resetWheelRotations,
    wheels,
    trainBodyRef,
    wheelMeshesRef,
    wheelCollidersRef,
    addWheelColliders,
    get physicsWorld() { return physicsWorld },
    get rapier()       { return rapier },
    COLLISION_GROUPS,
  }
}