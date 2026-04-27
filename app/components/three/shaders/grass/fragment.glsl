uniform vec3 uGrassColorDark;
uniform vec3 uGrassColorLight;
uniform vec3 uShadowColor;
uniform vec3 uHighlightColor;
uniform sampler2D uSplatTexture;
uniform float uTerrainNormalScale;

varying vec2 vUv;
varying float vGrassMask;
varying float vRandom;
varying float vBladeMask;
varying vec2 vGrassUv;
varying float vInteraction;

void main() {
  if (vGrassMask < 0.05) discard;
  
  // Heightmap data from blue channel
  vec4 heightMap = texture2D(uSplatTexture, vGrassUv * uTerrainNormalScale);
  
  // Base color mix
  vec3 grassColor = mix(uGrassColorDark, uGrassColorLight, heightMap.b * 0.5 + vRandom * 0.5);
  
  // Add stylized highlight based on height and randomness
  float highlightMask = smoothstep(0.7, 1.0, vBladeMask + vRandom * 0.2);
  grassColor = mix(grassColor, uHighlightColor, highlightMask * 0.3);
  
  // Blade vertical gradient
  float mask = smoothstep(0.0, 1.0, vBladeMask);
  mask = pow(mask, 0.5);
  float finalMask = clamp(mask, 0.0, 1.0);
  
  // Final color mix with shadow color at base
  vec3 finalColor = mix(uShadowColor, grassColor, finalMask);
  
  // Interaction darkening/tinting
  finalColor = mix(finalColor, uShadowColor * 0.8, vInteraction * 0.5);
  
  // Stylized lighting
  finalColor *= (0.7 + vBladeMask * 0.5);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
