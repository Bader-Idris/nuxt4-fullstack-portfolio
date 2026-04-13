// Sky Vertex Shader
// Renders inside of a large inverted sphere (BackSide) centered on camera.

varying vec3 vRayDir;

void main() {
    // Ray direction from camera to sky sphere surface (view space)
    vRayDir = position;

    // Standard MVP transform
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
