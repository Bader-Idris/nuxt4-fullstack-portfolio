
      uniform vec3 uGrassColorDark;
      uniform vec3 uGrassColorLight;
      uniform vec3 uShadowColor;
      uniform sampler2D uSplatTexture;
      uniform float uTerrainNormalScale;

      varying vec2 vUv;
      varying float vGrassMask;
      varying float vRandom;
      varying float vBladeMask;
      varying vec2 vGrassUv;

      void main() {
        if (vGrassMask < 0.05) discard;
        
        // Heightmap data from blue channel (used as displacement/variation)
        vec4 heightMap = texture2D(uSplatTexture, vGrassUv * uTerrainNormalScale);
        
        // Mix dark and light colors based on heightmap and randomness
        vec3 grassColor = mix(uGrassColorDark, uGrassColorLight, heightMap.b * 0.5 + vRandom * 0.5);
        
        // Blade vertical gradient (darker at bottom)
        float mask = smoothstep(0.0, 1.0, vBladeMask);
        mask = pow(mask, 0.5);
        float finalMask = clamp(mask, 0.0, 1.0);
        
        // Final color mix with shadow color at base
        vec3 finalColor = mix(uShadowColor, grassColor, finalMask);
        
        // --- SUN REFLECTION / HIGHLIGHT TUNING ---
        // To reduce the "too strong" reflection:
        // 1. Decrease the 0.4 multiplier below to dim the highlights.
        // 2. Adjust the 0.8 base factor to change overall brightness.
        // 3. You could also multiply by (1.0 - some_factor) to dampen the light's impact.
        finalColor *= (0.8 + vBladeMask * 0.4);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    