/**
 * useTrainBricks.ts
 *
 * Composable for managing physics-based brick obstacle walls along the locomotive path.
 * Extracted from useTrainPhysics.ts for separation of concerns.
 *
 * Key features:
 *  - createBrickSetsAlongPath : distributes brick walls evenly along a CatmullRomCurve3
 *  - createBrickWallAtPoint   : builds one InstancedMesh wall perpendicular to the track tangent
 *  - clearAllBlocks           : removes render meshes + Rapier rigid bodies cleanly
 *  - updatePhysicsBlocks      : syncs visuals to physics bodies each frame
 *  - applyTrainSeparationForces: wake turbulence impulses on blocks the train passes
 *  - setBlockBounceProfile    : tunes restitution/damping based on train speed
 *  - resetBlocks              : teleports all blocks back to spawn positions
 */

import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single physics-simulated brick with its associated InstancedMesh render slot */
export interface PhysicsBlock {
  mesh: THREE.Object3D;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  /** World-space spawn position – used by resetBlocks */
  initialPos: THREE.Vector3;
  /** Index into the InstancedMesh for efficient per-instance matrix updates */
  instanceIndex?: number;
  /** Timestamp (ms) of the last hit sound trigger – throttles audio spam */
  lastHitTime?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────────────────────

export function useTrainBricks() {
  /** Minimum milliseconds between hit-sound triggers per brick */
  const BRICK_HIT_THROTTLE_MS = 120;

  /**
   * Plain-object refs (not Vue reactives) for maximum performance in the
   * per-frame render loop.
   */
  const blocksRef = { blocks: [] as PhysicsBlock[] };
  const blockRenderMeshesRef = { meshes: [] as THREE.Object3D[] };

  // ──────────────────────────────────────────────────────────────────────────
  // Internal builder
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Builds a single wall of bricks at `centerPos`, oriented perpendicular to
   * `trackTangent`.  All bricks share one InstancedMesh for minimal draw calls.
   *
   * @param world        Active Rapier physics world
   * @param rapierApi    Initialised Rapier module
   * @param centerPos    Base-center of the wall (track surface level)
   * @param trackTangent Unit vector along the track at this point
   * @param group        THREE.Group the InstancedMesh is added to
   */
  function createBrickWallAtPoint(
    world: RAPIER.World,
    rapierApi: typeof RAPIER,
    centerPos: THREE.Vector3,
    trackTangent: THREE.Vector3,
    group: THREE.Group,
  ): PhysicsBlock[] {
    const WALL_W = 7; // bricks per row
    const WALL_H = 8; // rows (layers)
    const BW = 0.45; // brick width
    const BH = 0.2; // brick height
    const BD = 0.24; // brick depth

    // Horizontal span direction = perpendicular to track (blocks the train)
    const up = new THREE.Vector3(0, 1, 0);
    const wallSpan = new THREE.Vector3()
      .crossVectors(up, trackTangent)
      .normalize();
    const totalWidth = WALL_W * BW;

    // Random hue per wall for Lego-style colour variety (orange-red brick range)
    const wallHue = 0.04 + Math.random() * 0.04;

    type PendingBrick = {
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      color: THREE.Color;
      body: RAPIER.RigidBody;
      collider: RAPIER.Collider;
    };

    const pending: PendingBrick[] = [];

    for (let layer = 0; layer < WALL_H; layer++) {
      // Alternate-row stagger for structural integrity (classic brick bond)
      const stagger = layer % 2 === 0 ? 0 : BW * 0.5;
      const yCenter = centerPos.y + BH * 0.5 + layer * BH * 1.02;

      for (let col = 0; col < WALL_W; col++) {
        // Local offset along wall span, centred on the track
        const localX = -totalWidth * 0.5 + col * BW + stagger;
        const brickPos = new THREE.Vector3()
          .copy(centerPos)
          .addScaledVector(wallSpan, localX)
          .setY(yCenter);

        // Face wall toward the oncoming train with slight random variance
        const yaw =
          Math.atan2(trackTangent.x, trackTangent.z) +
          (Math.random() - 0.5) * 0.08;
        const euler = new THREE.Euler(
          (Math.random() - 0.5) * 0.04,
          yaw,
          (Math.random() - 0.5) * 0.03,
        );
        const quat = new THREE.Quaternion().setFromEuler(euler);

        const rigidBodyDesc = rapierApi.RigidBodyDesc.dynamic()
          .setTranslation(brickPos.x, brickPos.y, brickPos.z)
          .setRotation(quat)
          .setLinearDamping(0.14)
          .setAngularDamping(0.22);

        const body = world.createRigidBody(rigidBodyDesc);

        const colliderDesc = rapierApi.ColliderDesc.cuboid(
          BW / 2,
          BH / 2,
          BD / 2,
        )
          .setDensity(0.72)
          .setRestitution(0.16)
          .setFriction(0.9);

        const collider = world.createCollider(colliderDesc, body);

        pending.push({
          position: brickPos.clone(),
          quaternion: quat.clone(),
          color: new THREE.Color().setHSL(
            wallHue,
            0.6 + Math.random() * 0.15,
            0.38 + Math.random() * 0.12,
          ),
          body,
          collider,
        });
      }
    }

    // Pack all bricks into one InstancedMesh for draw-call efficiency
    const newBlocks: PhysicsBlock[] = [];

    if (pending.length > 0) {
      const geometry = new THREE.BoxGeometry(BW, BH, BD);
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.92,
        metalness: 0.01,
      });
      const instanced = new THREE.InstancedMesh(
        geometry,
        material,
        pending.length,
      );
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instanced.castShadow = true;
      instanced.receiveShadow = true;

      const tmpMatrix = new THREE.Matrix4();
      const tmpScale = new THREE.Vector3(1, 1, 1);

      pending.forEach((p, idx) => {
        tmpMatrix.compose(p.position, p.quaternion, tmpScale);
        instanced.setMatrixAt(idx, tmpMatrix);
        instanced.setColorAt(idx, p.color);

        newBlocks.push({
          mesh: instanced,
          body: p.body,
          collider: p.collider,
          initialPos: p.position.clone(),
          instanceIndex: idx,
        });
      });

      instanced.instanceMatrix.needsUpdate = true;
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

      group.add(instanced);
      blockRenderMeshesRef.meshes.push(instanced);
    }

    return newBlocks;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Distributes `setsCount` brick walls evenly along a CatmullRom path so
   * clients enjoy an amusing journey as the locomotive crashes through them.
   *
   * Walls are placed between t = 0.1 and t = 0.9 (keeping start/end clear)
   * and are oriented perpendicular to the track tangent at each sampled point.
   *
   * @param world      Active Rapier physics world
   * @param rapierApi  Initialised Rapier module
   * @param curve      CatmullRomCurve3 representing the full train path
   * @param setsCount  Number of brick walls to create (default 5)
   * @param group      THREE.Group to receive the InstancedMesh objects
   * @param trackY     Y level of the rail surface (walls snap to this height)
   */
  function createBrickSetsAlongPath(
    world: RAPIER.World,
    rapierApi: typeof RAPIER,
    curve: THREE.CatmullRomCurve3,
    setsCount: number = 5,
    group: THREE.Group,
    trackY: number = 0,
  ): PhysicsBlock[] {
    const allBlocks: PhysicsBlock[] = [];

    for (let i = 0; i < setsCount; i++) {
      // Evenly spread from 10% to 90% of the path
      const t = setsCount > 1 ? 0.1 + (i / (setsCount - 1)) * 0.8 : 0.5;

      const pos = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);

      // Snap wall base to the rail surface (avoids floating or buried bricks)
      const wallBase = new THREE.Vector3(pos.x, trackY + 0.01, pos.z);
      const wallBlocks = createBrickWallAtPoint(
        world,
        rapierApi,
        wallBase,
        tangent,
        group,
      );
      allBlocks.push(...wallBlocks);
    }

    // Accumulate into shared refs so the render loop can update them all at once
    blocksRef.blocks.push(...allBlocks);

    return allBlocks;
  }

  /**
   * Removes all brick render meshes from `group` and their rigid bodies from
   * `world`.  Call this BEFORE trainPhysics.cleanup() to avoid dangling handles.
   */
  function clearAllBlocks(group: THREE.Group, world: RAPIER.World): void {
    // Dispose Three.js GPU resources and detach from scene
    blockRenderMeshesRef.meshes.forEach((mesh) => {
      group.remove(mesh);
      if (mesh instanceof THREE.Mesh || mesh instanceof THREE.InstancedMesh) {
        mesh.geometry?.dispose();
        const mat = (mesh as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });

    // Remove Rapier rigid bodies from simulation
    blocksRef.blocks.forEach((block) => {
      try {
        world.removeRigidBody(block.body);
      } catch {
        // Body may already be removed (e.g. fell out of world bounds)
      }
    });

    blocksRef.blocks = [];
    blockRenderMeshesRef.meshes = [];
  }

  /**
   * Syncs every brick's InstancedMesh matrix to its current Rapier body transform.
   * Call once per frame AFTER world.step().
   */
  function updatePhysicsBlocks(blocks: PhysicsBlock[]): void {
    const updatedMeshes = new Set<THREE.InstancedMesh>();
    const tmpMatrix = new THREE.Matrix4();
    const unitScale = new THREE.Vector3(1, 1, 1);

    blocks.forEach((block) => {
      const pos = block.body.translation();
      const rot = block.body.rotation();
      const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);

      if (
        block.mesh instanceof THREE.InstancedMesh &&
        typeof block.instanceIndex === "number"
      ) {
        tmpMatrix.compose(
          new THREE.Vector3(pos.x, pos.y, pos.z),
          quat,
          unitScale,
        );
        block.mesh.setMatrixAt(block.instanceIndex, tmpMatrix);
        updatedMeshes.add(block.mesh);
        return;
      }

      // Fallback for non-instanced meshes
      block.mesh.position.set(pos.x, pos.y, pos.z);
      block.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    });

    // Batch needsUpdate per InstancedMesh (not per individual brick)
    updatedMeshes.forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true));
  }

  /**
   * Applies sideways wake impulses to blocks the train has just passed.
   * Simulates turbulence: higher gear → bricks fly further sideways.
   *
   * @param blocks      Live block list
   * @param trainBody   Kinematic Rapier body of the locomotive
   * @param trainSpeed  Signed speed (negative = forward, positive = backward)
   * @param deltaTime   Fixed physics timestep in seconds
   * @param onBrickHit  Optional callback fired when a block is strongly hit
   */
  function applyTrainSeparationForces(
    blocks: PhysicsBlock[],
    trainBody: RAPIER.RigidBody,
    trainSpeed: number,
    deltaTime: number,
    onBrickHit?: () => void,
  ): void {
    const speed = Math.abs(trainSpeed);
    if (speed <= 0.001) return;

    const trainPos = trainBody.translation();
    const trainDirection = Math.sign(trainSpeed) || 1;
    // Wake zone: bricks within this X range behind the train are affected
    const WAKE_MIN_X = 0.35;
    const WAKE_MAX_X = 2.5;
    const INFLUENCE_Z = 2.2; // half-width of turbulence corridor
    const MAX_SIDE_FORCE = 2;
    const now = Date.now();

    blocks.forEach((block) => {
      const pos = block.body.translation();
      const dx = pos.x - trainPos.x;
      const dz = pos.z - trainPos.z;

      // Wake effect: only affect bricks the train has already passed
      const behindTrain = dx * trainDirection < -WAKE_MIN_X;
      if (!behindTrain) return;

      const wakeDist = Math.abs(dx);
      if (wakeDist > WAKE_MAX_X) return;

      // Influence falls off with both longitudinal and lateral distance
      const lonFactor = Math.max(0, 1 - wakeDist / WAKE_MAX_X);
      const latFactor = Math.max(0, 1 - Math.abs(dz) / INFLUENCE_Z);
      const influence = lonFactor * latFactor * latFactor;
      if (influence <= 0) return;

      // Throttled hit-sound trigger
      if (
        onBrickHit &&
        influence > 0.45 &&
        (!block.lastHitTime || now - block.lastHitTime > BRICK_HIT_THROTTLE_MS)
      ) {
        block.lastHitTime = now;
        onBrickHit();
      }

      const sideSign = dz >= 0 ? 1 : -1;
      const speedFactor = THREE.MathUtils.clamp(speed / 7, 0, 1);
      const sideForce =
        sideSign * MAX_SIDE_FORCE * influence * (0.25 + speedFactor * 0.35);
      // Small lift prevents sticky ground contacts while staying subtle
      const liftForce = 0.9 * influence * (0.2 + speedFactor * 0.2);

      // Scale by dt → total impulse per second is frame-rate-independent
      block.body.addForce(
        { x: 0, y: liftForce * deltaTime, z: sideForce * deltaTime },
        true,
      );
    });
  }

  /**
   * Teleports all blocks back to spawn positions and zeroes velocities.
   * Useful for resetting the scene without recreating physics bodies.
   */
  function resetBlocks(blocks: PhysicsBlock[]): void {
    blocks.forEach((block) => {
      block.body.setTranslation(block.initialPos, true);
      block.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      block.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    });
  }

  /**
   * Adjusts restitution + damping of every block to match the locomotive speed.
   * Higher speed → more bounce, less damping for dramatic scatter effects.
   *
   * @param speedFactor  Normalised 0 (idle) … 1 (max gear)
   */
  function setBlockBounceProfile(
    blocks: PhysicsBlock[],
    speedFactor: number,
  ): void {
    const clamped = THREE.MathUtils.clamp(speedFactor, 0, 1);
    const restitution = THREE.MathUtils.lerp(0.08, 0.6, clamped);
    const linearDamping = THREE.MathUtils.lerp(0.26, 0.07, clamped);
    const angularDamping = THREE.MathUtils.lerp(0.34, 0.1, clamped);

    blocks.forEach((block) => {
      block.collider.setRestitution(restitution);
      block.body.setLinearDamping(linearDamping);
      block.body.setAngularDamping(angularDamping);
    });
  }

  return {
    blocksRef,
    blockRenderMeshesRef,
    // Path-based placement (preferred)
    createBrickSetsAlongPath,
    createBrickWallAtPoint,
    // Lifecycle helpers
    clearAllBlocks,
    // Per-frame render loop
    updatePhysicsBlocks,
    applyTrainSeparationForces,
    // Utilities
    resetBlocks,
    setBlockBounceProfile,
  };
}