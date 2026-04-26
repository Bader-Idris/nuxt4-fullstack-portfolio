
uniform float uTime;
uniform sampler2D uSplatTexture;
uniform float uTerrainSize;
uniform vec3 uWaterColor;
uniform vec3 uDeepWaterColor;
uniform vec3 uShoreColor;
uniform vec3 uCameraPosition;
uniform vec3 uSunDir;

varying vec2 vUv;
varying vec3 vWorldPosition;

// Optimized parameters for Mobile GPU
#define DRAG_MULT 0.35
#define WATER_DEPTH 1.0
#define ITERATIONS_NORMAL 8 // Reduced from 36 for mobile performance

// Combined height and derivative calculation to save cycles
vec3 get_wave_data(vec2 position, int iterations) {
  float wavePhaseShift = length(position) * 0.1;
  float iter = 0.0;
  float frequency = 1.0;
  float timeMultiplier = 1.5;
  float weight = 1.0;
  float sumOfValues = 0.0;
  float sumOfWeights = 0.0;
  
  // For simple normal approximation without 3x function calls
  vec2 derivative = vec2(0.0);
  
  for(int i=0; i < iterations; i++) {
    vec2 dir = vec2(sin(iter), cos(iter));
    float x = dot(dir, position) * frequency + uTime * timeMultiplier + wavePhaseShift;
    float wave = exp(sin(x) - 1.0);
    float dw = wave * cos(x);

    // The "drag" effect that makes waves sharp
    position += dir * dw * weight * DRAG_MULT;

    sumOfValues += wave * weight;
    derivative += dir * dw * frequency * weight;
    sumOfWeights += weight;

    weight = mix(weight, 0.0, 0.2);
    frequency *= 1.18;
    timeMultiplier *= 1.07;
    iter += 1232.399963;
  }
  
  return vec3(sumOfValues / sumOfWeights, derivative / sumOfWeights);
}

// Simplified atmosphere for mobile
vec3 getAtmosphere(vec3 dir) {
  float elev = max(dir.y, 0.0);
  return mix(vec3(0.95, 0.60, 0.25), vec3(0.18, 0.22, 0.55), pow(elev, 0.5));
}

// Fast tonemap for mobile
vec3 fast_aces(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  // 1. Terrain Data
  vec2 terrainUv = vec2(vWorldPosition.x / uTerrainSize + 0.5, 0.5 - vWorldPosition.z / uTerrainSize);
  vec4 terrainData = texture2D(uSplatTexture, terrainUv);
  float terrainHeightFactor = terrainData.b;
  
  // Calculate actual depth: Water Y is -0.3, Terrain Y is terrainHeightFactor * -1.5
  // Depth = (-0.3) - (terrainHeightFactor * -1.5) = 1.5 * terrainHeightFactor - 0.3
  float actualDepth = max(0.0, 1.5 * terrainHeightFactor - 0.3);
  
  // Normalized depth for shading (0.0 to 1.0 range)
  float depthNorm = smoothstep(0.0, 1.2, actualDepth);
  
  // Shore transition based on actual depth
  float shoreMask = smoothstep(0.0, 0.05, actualDepth);
  
  // 2. Wave Data
  // Scale down waves in very shallow water
  float waveIntensity = smoothstep(0.0, 0.1, actualDepth);
  vec3 waveData = get_wave_data(vWorldPosition.xz, ITERATIONS_NORMAL);
  
  // Construct normal from derivatives
  vec3 N = normalize(vec3(-waveData.y * waveIntensity, 1.0, -waveData.z * waveIntensity));
  
  // Fade normal with distance
  float dist = distance(vWorldPosition, uCameraPosition);
  N = mix(N, vec3(0.0, 1.0, 0.0), smoothstep(15.0, 120.0, dist));

  // 3. Shading
  vec3 ray = normalize(vWorldPosition - uCameraPosition);
  float fresnel = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(-N, ray)), 5.0);

  vec3 R = reflect(ray, N);
  R.y = abs(R.y);
  
  vec3 reflection = getAtmosphere(R);
  float sunDot = max(0.0, dot(R, normalize(uSunDir)));

  // --- SUN SPECULAR REFLECTION TUNING ---
  // To reduce the "too strong" reflection on water:
  // 1. Decrease the 0.2 multiplier below (e.g., to 0.1) to dim the spot.
  // 2. Increase the 250.0 exponent to make the specular spot smaller/sharper.
  reflection += vec3(1.0, 0.9, 0.7) * pow(sunDot, 250.0) * 0.2;

  // Subsurface scattering and color gradient based on actual depth
  vec3 baseColor = mix(uWaterColor, uDeepWaterColor, depthNorm);
  vec3 scattering = baseColor * (0.2 + depthNorm * 0.8);

  vec3 C = mix(scattering, reflection, fresnel);
  
  // 4. Shore foam and blending
  C = mix(uShoreColor, C, shoreMask);

  // Final Alpha: Shallower water is more transparent
  float alpha = mix(0.7, 0.95, depthNorm);
  // Foam is opaque
  alpha = mix(0.98, alpha, shoreMask);

  gl_FragColor = vec4(fast_aces(C * 2.0), alpha);
}
