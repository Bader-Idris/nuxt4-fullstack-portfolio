varying vec2 vUv;

void main() {
    vUv = uv;
    
    // Billboard: face camera
    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mvPosition.xy += position.xy;
    
    gl_Position = projectionMatrix * mvPosition;
}
