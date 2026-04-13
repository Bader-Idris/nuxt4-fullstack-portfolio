// Smoke Particle Fragment Shader
// Colors each smoke particle (point sprite billboard).
// Puff shape computed in GLSL from gl_PointCoord (no texture needed).

#include ../includes/simplexNoise4d.glsl;

uniform vec3 uColor;

varying float vAlpha;
varying float vLife;
varying float vNoise;

void main() {
  // Puff shape: radial gradient from center
  float dist = distance(gl_PointCoord, vec2(0.5));
  float puffShape = 1.0 - smoothstep(0.15, 0.45, dist);

  if (dist > 0.45) discard;

  // Base color
  vec3 col = uColor;

  // Darken as smoke rises (upper half gets darker for sky contrast)
  float darkening = smoothstep(0.4, 0.7, vLife);
  vec3 darkColor = col * 0.35;
  col = mix(col, darkColor, darkening * 0.75);

  // Noise-based color variation
  col *= 0.82 + vNoise * 0.28;

  // Alpha
  float noiseAlpha = mix(0.22, 0.55, vNoise);
  float edgeNoise = simplexNoise4d(vec4(gl_PointCoord * 6.0, vLife * 2.0, vNoise * 3.0)) * 0.5 + 0.5;
  float alpha = puffShape * vAlpha * noiseAlpha * mix(0.8, 1.1, edgeNoise);

  gl_FragColor = vec4(col, alpha);
}
