import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface CameraOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio: number;
  terrain?: any;
}

export function useCamera(options: CameraOptions) {
  const { canvas, width, height, terrain } = options;

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(5, 2.3, 2.5);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  
  // Internal state for follow logic
  const lastTargetPos = new THREE.Vector3();
  const followState = { initialized: false };
  const CAMERA_OFFSET = new THREE.Vector3(3.5, 2.2, 5);
  const FOLLOW_TIGHTNESS = 0.16;
  const MIN_DISTANCE = 2.2;
  const MAX_DISTANCE = 15.0; // Slightly more room
  const MIN_ALTITUDE_BUFFER = 0.5; // Offset from ground

  // Boundaries based on terrain size (500)
  const BOUNDS = 245; 

  const update = (targetPos: THREE.Vector3, followMotion: boolean = false) => {
    if (followMotion) {
      if (!followState.initialized) {
        controls.target.copy(targetPos);
        lastTargetPos.copy(targetPos);
        followState.initialized = true;
      } else {
        const delta = targetPos.clone().sub(lastTargetPos);
        controls.target.add(delta);
        camera.position.add(delta);
        controls.target.lerp(targetPos, FOLLOW_TIGHTNESS);

        const toTarget = camera.position.clone().sub(controls.target);
        const dist = toTarget.length();
        if (dist > MAX_DISTANCE) {
          toTarget.setLength(MAX_DISTANCE);
          camera.position.copy(controls.target).add(toTarget);
        } else if (dist < MIN_DISTANCE) {
          toTarget.setLength(MIN_DISTANCE);
          camera.position.copy(controls.target).add(toTarget);
        }
        lastTargetPos.copy(targetPos);
      }
    } else {
      controls.target.copy(targetPos);
      if (!followState.initialized) {
        camera.position.copy(targetPos.clone().add(CAMERA_OFFSET));
        followState.initialized = true;
      }
      lastTargetPos.copy(targetPos);
    }

    controls.update();

    // --- CAMERA CONSTRAINTS ---
    
    // 1. Boundary constraints (XZ)
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -BOUNDS, BOUNDS);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -BOUNDS, BOUNDS);

    // 2. Terrain collision (Altitude)
    if (terrain) {
      const groundHeight = terrain.getHeightAt(camera.position.x, camera.position.z);
      const minHeight = groundHeight + MIN_ALTITUDE_BUFFER;
      if (camera.position.y < minHeight) {
        camera.position.y = minHeight;
        // If we hit the ground, we might need to update controls target to avoid looking "through" the terrain
        // but for now simple clamping is usually enough.
      }
    }
  };

  const handleResize = (newWidth: number, newHeight: number) => {
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
  };

  const resetFollow = () => {
    followState.initialized = false;
  };

  return {
    camera,
    controls,
    update,
    handleResize,
    resetFollow
  };
}
