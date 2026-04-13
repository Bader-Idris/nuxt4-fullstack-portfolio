// Procedural Sky Shader
// Renders a full-dome sky using a large inverted sphere (BackSide).
//
// Features:
// - Sunset gradient (zenith indigo to horizon amber)
// - Sun disk + multi-layer glow
// - Animated cloud layer using 4D simplex noise
// - Horizon haze + Reinhard tone mapping + gamma
//
// uTime  : elapsed seconds
// uSunDir: normalized world-space sun direction

#include ../includes/simplexNoise4d.glsl;

uniform float uTime;
uniform vec3 uSunDir;

varying vec3 vRayDir;

// Cloud noise: 4-octave FBM using 4D simplex noise
float cloudNoise(vec2 uv) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.5;

    for (int i = 0; i < 4; i++) {
        // Cloud animation speed per FBM octave.
        // Lower these values to make the cloud shape evolution slower.
        // Example:
        // Normal/subtle speed: 0.05 + float(i) * 0.025
        // Faster wind:         0.15 + float(i) * 0.08
        float timeDrift = 0.05 + float(i) * 0.025;
        vec4 p = vec4(uv * frequency, 0.0, uTime * timeDrift);
        value += simplexNoise4d(p) * amplitude;
        frequency *= 2.1;
        amplitude *= 0.48;
    }

    return value * 0.5 + 0.5;
}

void main() {
    vec3 rd = normalize(vRayDir);
    float elev = rd.y;

    // Base sky gradient (sunset 4-7 PM)
    vec3 zenith = vec3(0.18, 0.22, 0.55);
    vec3 midSky = vec3(0.72, 0.42, 0.35);
    vec3 horizon = vec3(0.95, 0.60, 0.25);
    vec3 belowHorizon = vec3(0.45, 0.32, 0.20);

    float upper = smoothstep(0.0, 0.6, elev);
    float lower = smoothstep(0.0, 0.25, elev);
    vec3 col = mix(horizon, midSky, lower);
    col = mix(col, zenith, upper);
    col = mix(belowHorizon, col, smoothstep(-0.15, 0.05, elev));

    // Sun
    float sunDot = max(dot(rd, uSunDir), 0.0);

    float sunDisk = smoothstep(0.9985, 0.9995, sunDot);
    col += vec3(1.0, 0.82, 0.45) * 3.5 * sunDisk;

    float sunGlow = pow(sunDot, 64.0) * 0.4;
    col += vec3(1.0, 0.75, 0.35) * sunGlow;

    float sunGlow2 = pow(sunDot, 8.0) * 0.18;
    col += vec3(1.0, 0.55, 0.25) * sunGlow2;

    // Clouds
    if (elev > 0.03) {
        float cloudAlt = 800.0;
        float cloudDist = cloudAlt / max(elev, 0.001);
        vec2 cloudUV = rd.xz * cloudDist * 0.0006;
        // Cloud travel speed across the sky dome.
        // Lower these multipliers to slow horizontal drift.
        // Example:
        // Normal/subtle speed: vec2(uTime * 0.12, uTime * 0.05)
        // Faster wind:         vec2(uTime * 0.35, uTime * 0.15)
        cloudUV += vec2(uTime * 0.12, uTime * 0.05);

        float cloud = cloudNoise(cloudUV);
        cloud = smoothstep(0.38, 0.72, cloud);

        float cloudFade = smoothstep(0.05, 0.25, elev);
        cloud *= cloudFade;

        vec3 cloudCol = vec3(0.95, 0.88, 0.80);
        cloudCol += vec3(1.0, 0.70, 0.40) * sunDot * 0.4;
        cloudCol *= 0.7 + 0.3 * (1.0 - cloud);

        float cloudAlpha = cloud * 0.55;
        col = mix(col, cloudCol, cloudAlpha);
    }

    // Horizon haze
    float haze = exp(-abs(elev) * 4.5);
    col += vec3(0.85, 0.55, 0.25) * haze * 0.2;

    // Post-processing
    col = col / (col + 1.0);
    col = pow(col, vec3(1.0 / 2.2));

    gl_FragColor = vec4(col, 1.0);
}
