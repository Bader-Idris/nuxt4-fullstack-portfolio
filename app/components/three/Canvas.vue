<template>
  <div ref="containerRef">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cube: THREE.Mesh;
let controls: OrbitControls;
let animationId: number;

const animate = () => {
  animationId = requestAnimationFrame(animate);

  // Rotate the cube slowly for a nice effect
  cube.rotation.x += 0.005;
  cube.rotation.y += 0.01;

  controls.update(); // Required when enableDamping or autoRotate is true
  renderer.render(scene, camera);
};

const handleResize = () => {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
};

onMounted(() => {
  if (!containerRef.value || !canvasRef.value) return;

  const container = containerRef.value;
  const canvas = canvasRef.value;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 0, 5);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Cube
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Basic lighting (required for MeshStandardMaterial)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  // Orbit Controls
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  // controls.autoRotate = true // Uncomment if you want auto-rotation

  // Resize handling
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);
  window.addEventListener("resize", handleResize);

  // Start animation
  animate();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);

  controls?.dispose();
  renderer?.dispose();
});
</script>

<style lang="scss" scoped>
div {
  @include tablet-to-up {
    width: calc(100% - 300px);
    left: 150px;
    top: -320px;
  }
  height: 80dvh; /* Adjust as needed – you can also use 100vh for full-screen */
  position: relative;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>