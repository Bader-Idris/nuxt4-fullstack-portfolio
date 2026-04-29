uniform sampler2D uSplatTexture;
uniform float uTerrainSize;

varying vec2 vUv;
varying vec4 vTerrainData;

void main() {
    vUv = uv;
    
    // In Three.js PlaneGeometry(size, size) rotated by -PI/2 on X:
    // position.x is [-size/2, size/2]
    // position.y is 0
    // position.z is [size/2, -size/2] (after rotation)
    // Wait, let's be careful. PlaneGeometry is in XY plane.
    // rotateX(-PI/2) makes Y point up, and Z point towards us? 
    // Actually, position is attribute, so it's the LOCAL position.
    
    vec3 transformed = position;
    
    // splatUv calculation must match useTerrain.ts exactly
    // In useTerrain.ts: vec2 splatUv = vec2(position.x / uTerrainSize + 0.5, 0.5 - position.z / uTerrainSize);
    // Since we rotated the geometry IN code (geometry.rotateX), the position attribute is ALREADY modified.
    // NO, geometry.rotateX modifies the 'position' attribute values.
    
    // Let's re-read useTerrain.ts:
    // const geometry = new THREE.PlaneGeometry(this.size, this.size, this.subdivision, this.subdivision)
    // geometry.rotateX(-Math.PI * 0.5)
    
    // After rotateX(-PI/2):
    // original Y (0) -> new Z (0)
    // original X -> stays X
    // original Z (0) -> NO, PlaneGeometry is 2D (XY).
    // Original X in [-size/2, size/2]
    // Original Y in [-size/2, size/2]
    // After rotateX(-PI/2):
    // X stays X
    // Y becomes Z (inverted?) 
    
    // Actually, THREE.PlaneGeometry(w, h) creates vertices in XY plane.
    // rotateX(-PI/2) moves Y to Z.
    // So position.x is X, position.z is -Y_original.
    
    vec2 splatUv = vec2(position.x / uTerrainSize + 0.5, 0.5 - position.z / uTerrainSize);
    vTerrainData = texture2D(uSplatTexture, splatUv);
    
    float uvDim = min(min(uv.x, uv.y) * 20.0, 1.0);
    uvDim = min(uvDim, min(1.0 - uv.x, 1.0 - uv.y) * 20.0);
    
    transformed.y += vTerrainData.b * -1.5 * uvDim;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
