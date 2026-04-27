import * as THREE from "three";

export interface InteractionOptions {
  size: number;
  renderer: THREE.WebGLRenderer;
}

export function useInteraction(options: InteractionOptions) {
  const { size, renderer } = options;
  const resolution = 512; // Resolution of the interaction texture

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -size / 2,
    size / 2,
    size / 2,
    -size / 2,
    0.1,
    10
  );
  camera.position.set(0, 5, 0);
  camera.lookAt(0, 0, 0);

  // Ping-pong render targets for persistence
  const rtA = new THREE.WebGLRenderTarget(resolution, resolution, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  });
  const rtB = rtA.clone();
  
  let currentRT = rtA;
  let prevRT = rtB;

  // Fade shader to slowly clear the trail
  const fadeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: null },
      uFade: { value: 0.98 }, // Trail persistence factor
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uFade;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        gl_FragColor = color * uFade;
      }
    `,
  });
  const fadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMaterial);
  const fadeScene = new THREE.Scene();
  fadeScene.add(fadeMesh);
  const fadeCamera = new THREE.Camera();

  // "Boulder" or "Train" brush
  const brushGeometry = new THREE.CircleGeometry(1.5, 16);
  const brushMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const brush = new THREE.Mesh(brushGeometry, brushMaterial);
  brush.rotation.x = -Math.PI / 2;
  scene.add(brush);

  return {
    texture: currentRT.texture,
    update(position: THREE.Vector3) {
      // 1. Move brush to current position
      brush.position.set(position.x, 0, position.z);
      
      // 2. Render fade (prevRT -> currentRT)
      fadeMaterial.uniforms.uTexture.value = prevRT.texture;
      renderer.setRenderTarget(currentRT);
      renderer.render(fadeScene, fadeCamera);
      
      // 3. Render brush into currentRT (on top of faded previous content)
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = true;
      
      // 4. Swap ping-pong
      const temp = currentRT;
      currentRT = prevRT;
      prevRT = temp;
      
      this.texture = prevRT.texture;
      renderer.setRenderTarget(null);
    },
    dispose() {
      rtA.dispose();
      rtB.dispose();
      fadeMaterial.dispose();
      brushMaterial.dispose();
      brushGeometry.dispose();
    },
  };
}
