// Smoke Particle Vertex Shader
// Positions and sizes each smoke particle in a point-cloud billboard system.

#include ../includes/simplexNoise4d.glsl;

uniform float uTime;
uniform float uWindBendAngle;
uniform float uLifeSpeed;
uniform float uParticleSize;
uniform vec2 uResolution;

attribute float aBirth;
attribute float aLifespan;
attribute vec3 aVelocity;
attribute float aSeed;

varying float vAlpha;
varying float vLife;
varying float vNoise;

void main() {
  float age = (uTime - aBirth) * uLifeSpeed;
  float lifeRatio = clamp(age / aLifespan, 0.0, 1.0);

  // Skip dead particles
  if (lifeRatio <= 0.0 || lifeRatio >= 1.0) {
    gl_Position = vec4(9999.0, 9999.0, 0.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }

  vec3 pos = position;

  // Rise
  pos += aVelocity * age;

  // Turbulent wind (4D simplex noise)
  // Higher frequency = jittery/noisy smoke, Lower = smooth rolling billows
  float noiseFreq = 0.4;
  // How much the smoke deviates from its path due to turbulence
  float noiseAmp = 0.6;
  vec4 noisePos = vec4(
      pos.x * noiseFreq + aSeed * 10.0,
      pos.y * noiseFreq + aSeed * 20.0,
      pos.z * noiseFreq + aSeed * 30.0,
      uTime * 0.3
    );

  float noiseX = simplexNoise4d(noisePos) * noiseAmp * lifeRatio;
  float noiseZ = simplexNoise4d(noisePos + 100.0) * noiseAmp * lifeRatio;
  pos.x += noiseX;
  pos.z += noiseZ;

  // Secondary smoke-height control:
  // this adds vertical turbulence, but the main plume height is still set in
  // Locomotive.vue via smokeVelocities[i * 3 + 1] and smokeLifespans[i].
  // Example:
  // Subtle wobble:        0.10
  // More lift/turbulence: 0.20
  float noiseY = simplexNoise4d(noisePos + 200.0) * 0.15 * lifeRatio;
  pos.y += noiseY * lifeRatio;

  // Strong directional wind bend: target plume tilt angles are driven by gear phase.
  float bendCurve = lifeRatio * lifeRatio;
  float safeAngle = clamp(uWindBendAngle, radians(-89.0), radians(89.0));
  float bendSlope = tan(safeAngle);
  // Multiplier (1.25) controls how aggressively the plume "leans" into the wind
  float bendAmount = bendSlope * pos.y * 1.25 * bendCurve;
  pos.x += bendAmount;

  // Alpha fade
  // smoothstep(start, end, ...) defines how fast particles fade in/out
  // Current: Fade in over first 10% of life, start fading out at 30% life
  vAlpha = smoothstep(0.0, 0.1, lifeRatio)
      * (1.0 - smoothstep(0.3, 1.0, lifeRatio));

  vLife = lifeRatio;
  vNoise = simplexNoise4d(noisePos + 300.0) * 0.5 + 0.5;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Resolution-based size
  float sizeNoise = simplexNoise4d(noisePos + 400.0) * 0.3 + 1.0;
  // Expansion factor (1.5) makes the smoke puffs grow larger as they rise
  gl_PointSize = uParticleSize
      * uResolution.y
      * (1.0 + lifeRatio * 1.5)
      * sizeNoise
      * (1.0 / -mvPosition.z);
}
