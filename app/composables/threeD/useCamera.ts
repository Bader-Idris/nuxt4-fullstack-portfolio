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
  const { canvas, width, height } = options; // don't put terrain here, it's a let not const!
  let currentTerrain = options.terrain;

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(5, 2.3, 2.5);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  // Prevent camera from going below the horizon or too high up
  controls.maxPolarAngle = Math.PI * 0.48; // Hide "underneath"
  controls.minPolarAngle = Math.PI * 0.15; // Prevent looking straight up into empty sky

  // Horizontal (Azimuth) limits to keep the "sides" focused on the scene
  // This prevents the user from rotating behind the "main view" if desired.
  // controls.minAzimuthAngle = -Math.PI * 0.5;
  // controls.maxAzimuthAngle = Math.PI * 0.5;

  controls.minDistance = 2.0;
  controls.maxDistance = 35.0; // Tightened distance

  // Internal state for follow logic
  const lastTargetPos = new THREE.Vector3();
  const followState = { initialized: false };
  const CAMERA_OFFSET = new THREE.Vector3(3.5, 2.2, 5);
  const FOLLOW_TIGHTNESS = 0.16;
  const MIN_ALTITUDE_BUFFER = 0.8;

  // Tighter boundaries based on terrain size (512)
  // to ensure the camera never sees past the fog/edges.
  const BOUNDS = 220;

  const update = (targetPos: THREE.Vector3, followMotion: boolean = false) => {
    // 1. Clamp the target position itself to keep the focus within the terrain
    const clampedTarget = targetPos.clone();
    clampedTarget.x = THREE.MathUtils.clamp(clampedTarget.x, -BOUNDS, BOUNDS);
    clampedTarget.z = THREE.MathUtils.clamp(clampedTarget.z, -BOUNDS, BOUNDS);

    if (followMotion) {
      if (!followState.initialized) {
        controls.target.copy(clampedTarget);
        lastTargetPos.copy(clampedTarget);
        followState.initialized = true;
      } else {
        const delta = clampedTarget.clone().sub(lastTargetPos);
        controls.target.add(delta);
        camera.position.add(delta);
        controls.target.lerp(clampedTarget, FOLLOW_TIGHTNESS);

        const toTarget = camera.position.clone().sub(controls.target);
        const dist = toTarget.length();
        if (dist > controls.maxDistance) {
          toTarget.setLength(controls.maxDistance);
          camera.position.copy(controls.target).add(toTarget);
        } else if (dist < controls.minDistance) {
          toTarget.setLength(controls.minDistance);
          camera.position.copy(controls.target).add(toTarget);
        }
        lastTargetPos.copy(clampedTarget);
      }
    } else {
      controls.target.copy(clampedTarget);
      if (!followState.initialized) {
        camera.position.copy(clampedTarget.clone().add(CAMERA_OFFSET));
        followState.initialized = true;
      }
      lastTargetPos.copy(clampedTarget);
    }

    // --- CAMERA CONSTRAINTS ---

    // 2. Strict Boundary constraints for Camera position (XZ)
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -BOUNDS,
      BOUNDS,
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -BOUNDS,
      BOUNDS,
    );

    // 3. Terrain collision (Altitude)
    if (currentTerrain) {
      const groundHeight = currentTerrain.getHeightAt(
        camera.position.x,
        camera.position.z,
      );
      const minHeight = groundHeight + MIN_ALTITUDE_BUFFER;
      if (camera.position.y < minHeight) {
        camera.position.y = minHeight;
      }
    }

    controls.update();
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
    resetFollow,
    setTerrain: (newTerrain: any) => {
      currentTerrain = newTerrain;
    },
  };
}