uniform float uTime;
uniform float uParticleSize;

attribute float aLife;
attribute float aBirth;
attribute float aLifespan;
attribute vec3 aVelocity;
attribute float aSeed;

varying float vAlpha;
varying float vLife;

void main() {
    float age = uTime - aBirth;
    float lifeRatio = clamp(age / aLifespan, 0.0, 1.0);

    // Skip dead particles
    if(lifeRatio > 1.0 || lifeRatio < 0.0) {
        gl_Position = vec4(9999.0, 9999.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        return;
    }

    // --- POSITION / HEIGHT ---
    vec3 pos = position; // Initial position from TS (near chimney)
    
    // --- SPEED ---
    // Velocity comes from TS: aVelocity * age = distance traveled
    // To change rise speed: modify smokeVelocities[i * 3 + 1] in Locomotive.vue
    pos += aVelocity * age;

    // --- SPREAD / WIND ---
    // Horizontal spread increases over time (sin/cos oscillation)
    // Change 0.3 to increase/decrease lateral spread
    // Change 0.5 to change oscillation frequency
    pos.x += sin(age * 0.5 + aSeed * 6.28) * 0.3 * lifeRatio;
    pos.z += cos(age * 0.5 + aSeed * 6.28) * 0.3 * lifeRatio;

    // --- SCALE ---
    // Particle grows as it ages: uParticleSize * (1.0 + lifeRatio * expansion_factor)
    // uParticleSize: base size (set in TS uniform, default 0.5)
    // 1.5: expansion multiplier - increase for bigger smoke clouds
    float size = uParticleSize * (1.0 + lifeRatio * 1.5);

    // Alpha: fade in quickly, fade out slowly
    vAlpha = smoothstep(0.0, 0.1, lifeRatio) * (1.0 - smoothstep(0.3, 1.0, lifeRatio));
    vLife = lifeRatio;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // 200.0: distance-based size attenuation - higher = larger on screen
    gl_PointSize = size * (200.0 / -mvPosition.z);
}
