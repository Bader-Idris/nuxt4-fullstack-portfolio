uniform vec3 uColor;
uniform sampler2D uTexture;

varying float vAlpha;
varying float vLife;

void main() {
    // Sample smoke puff texture (radial gradient)
    vec4 texel = texture2D(uTexture, gl_PointCoord);

    // --- COLOR ---
    // Set in TS: uColor uniform (default 0.85, 0.82, 0.8 = warm gray)
    vec3 col = uColor;

    // Color shifts darker/cooler as smoke ages
    // 0.3: intensity of the color shift
    col = mix(col, col * 0.8, vLife * 0.3);

    // --- ALPHA / OPACITY ---
    // 0.4: base opacity multiplier - lower = more transparent
    // Combined with vAlpha (from vertex shader fade curve)
    float alpha = texel.a * vAlpha * 0.4;

    if(alpha < 0.01) discard;

    gl_FragColor = vec4(col, alpha);
}
