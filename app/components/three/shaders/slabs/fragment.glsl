uniform sampler2D uSplatTexture;
uniform sampler2D uSlabsTexture;
uniform vec3 uSlabColorLow;
uniform vec3 uSlabColorHigh;
uniform float uTiling;

varying vec2 vUv;
varying vec4 vTerrainData;

void main() {
    float mask = vTerrainData.r;
    
    // Smooth out the mask slightly to avoid harsh edges
    if (mask < 0.05) {
        discard;
    }
    
    // Sample slabs texture
    // We use a high tiling to make the slabs look like a floor texture
    float slabsValue = texture2D(uSlabsTexture, vUv * uTiling).r;
    
    // Mix slab colors based on texture value
    vec3 slabColor = mix(uSlabColorLow, uSlabColorHigh, slabsValue);
    
    // Apply the mask as alpha
    // We can also multiply the color by the mask if we want it to fade out
    gl_FragColor = vec4(slabColor, mask);
}
