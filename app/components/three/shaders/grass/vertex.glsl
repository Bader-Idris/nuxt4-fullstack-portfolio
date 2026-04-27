uniform float uTime;
uniform sampler2D uSplatTexture;
uniform sampler2D uInteractionTexture;
uniform float uTerrainSize;
uniform float uBladeWidth;
uniform float uBladeHeight;

uniform float uWindSpeed;
uniform float uWindAmplitude;
uniform float uWindWaveTiling;
uniform float uWindWaveStrength;
uniform float uWindBaseTiling;
uniform float uWindBaseStrength;
uniform vec3 uCameraPosition;

attribute vec2 aAnchor;
attribute float aHeightRandomness;
attribute float aVertexIndex;

varying vec2 vUv;
varying float vGrassMask;
varying float vRandom;
varying float vBladeMask;
varying vec2 vGrassUv;
varying float vInteraction;

// Noise functions
float noise2D(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float smoothNoise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = noise2D(i);
    float b = noise2D(i + vec2(1.0, 0.0));
    float c = noise2D(i + vec2(0.0, 1.0));
    float d = noise2D(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, float lacunarity, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    for(int i = 0; i < 2; i++) {
        if (i >= octaves) break;
        value += amplitude * smoothNoise2D(p);
        p *= lacunarity;
        amplitude *= 0.5;
    }
    return value;
}

vec2 calculateWindVector(vec3 worldPos, float dist) {
    // GPU OPTIMIZATION: Reduce octaves for distant grass
    int octaves = (dist < 60.0) ? 2 : 1;
    
    vec2 windWavePos = worldPos.xz * uWindWaveTiling;
    float windWaveTime = uTime * uWindSpeed;
    float wave1 = fbm(windWavePos - vec2(windWaveTime * 0.35, windWaveTime), 3.0, octaves);
    
    float primaryWave = wave1 * uWindWaveStrength;
    if (dist < 60.0) {
        float wave2 = fbm(windWavePos - vec2(0.0, windWaveTime * 0.35), 2.0, octaves);
        primaryWave = (wave1 + wave2) * 0.5 * uWindWaveStrength;
    }

    vec2 windBasePos = worldPos.xz * uWindBaseTiling;
    float baseWaveTime = uTime * (uWindSpeed * 0.93);
    float baseWave = fbm(windBasePos - vec2(baseWaveTime, 0.0), 2.0, octaves) * uWindBaseStrength;

    float windStrength = (primaryWave + baseWave) * uWindAmplitude;
    vec2 windDir;
    windDir.x = windStrength;
    windDir.y = windStrength * 0.3 * sin(windWaveTime * 0.5);
    return windDir;
}

mat3 rotateAxis(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
      oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
      oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
      oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
    );
}

void main() {
  vRandom = aHeightRandomness;
  
  // 1. Terrain & Interaction Data
  vec2 terrainUv = vec2(aAnchor.x / uTerrainSize + 0.5, 0.5 - aAnchor.y / uTerrainSize);
  vGrassUv = terrainUv;
  vec4 terrainData = texture2D(uSplatTexture, terrainUv);
  float depth = terrainData.b;
  vGrassMask = terrainData.g;
  
  // Read interaction texture (Red channel for flattening, Green/Blue for direction if needed)
  vec4 interactionData = texture2D(uInteractionTexture, terrainUv);
  float interactionFlatten = interactionData.r;
  vInteraction = interactionFlatten;

  // 2. Base Position & World Position Offset (WPO)
  float heightNoise = smoothNoise2D(aAnchor * 0.1);
  float wpoHeight = (heightNoise * 2.0 - 1.0) * 0.5;
  
  float elevation = depth * -1.5;
  vec3 basePosition = vec3(aAnchor.x, elevation, aAnchor.y);
  vec3 worldBasePos = (modelMatrix * vec4(basePosition, 1.0)).xyz;
  
  // GPU OPTIMIZATION: Calculate distance once for reuse
  float dist = distance(worldBasePos, uCameraPosition);

  // 3. Blade Shape
  float height = uBladeHeight * (0.7 + aHeightRandomness * 0.6 + wpoHeight) * vGrassMask;
  if (vGrassMask < 0.05 || depth > 0.18) height = 0.0;

  vec3 vPos = vec3(0.0);
  float tipness = 0.0;

  if (aVertexIndex == 0.0) { // Tip
    vPos = vec3(0.0, height, 0.0);
    tipness = 1.0;
  } else if (aVertexIndex == 1.0) { // Bottom Left
    vPos = vec3(-uBladeWidth * 0.5, 0.0, 0.0);
  } else { // Bottom Right
    vPos = vec3(uBladeWidth * 0.5, 0.0, 0.0);
  }
  
  vBladeMask = tipness;

  // 4. Billboarding
  vec3 cameraPos = cameraPosition;
  float angle = atan(worldBasePos.x - cameraPos.x, worldBasePos.z - cameraPos.z);
  float ca = cos(angle);
  float sa = sin(angle);
  mat2 rot = mat2(ca, sa, -sa, ca);
  vPos.xz = rot * vPos.xz;

  // 5. Wind & Interaction Bending
  vec2 windVector = calculateWindVector(worldBasePos, dist);
  
  float interactionBend = interactionFlatten * 1.5;
  float windMagnitude = length(windVector);
  vec3 rotationAxis = vec3(1.0, 0.0, 0.0); // Default axis
  float totalBend = interactionBend;
  
  if (windMagnitude > 0.001) {
    vec3 windDir3D = normalize(vec3(windVector.x, 0.0, windVector.y));
    rotationAxis = cross(windDir3D, vec3(0.0, 1.0, 0.0));
    totalBend += windMagnitude * 1.5;
  }
  
  if (totalBend > 0.001) {
    mat3 bendRotation = rotateAxis(rotationAxis, totalBend * tipness * tipness);
    vPos = bendRotation * vPos;
  }

  vPos.y -= interactionFlatten * height * 0.8 * tipness;

  vUv = vec2(aVertexIndex / 2.0, tipness);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(basePosition + vPos, 1.0);
}
