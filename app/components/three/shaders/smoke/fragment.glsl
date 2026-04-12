uniform float uTime;
uniform float uDelta;
uniform vec3 uColor;
uniform vec3 uSmokePos;
uniform float uSmokeRadius;

varying vec2 vUv;

float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(.1, .2, .3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z
    );
}

float smoke(vec3 p) {
    vec3 q = 1.2 * p;
    float f = 0.0, a = 0.5;
    for(int i = 0; i < 5; ++i, a *= 0.4, q *= 2.1) {
        q += uTime * vec3(0.17, -0.5, 0.0);
        f += a * noise(q);
    }
    float noiseShape = 0.5 + 0.7 * max(p.y, 0.0) - 0.15 * length(p.xz);
    return clamp(1.0 + noiseShape * f - length(p), 0.0, 1.0);
}

void main() {
    // Ray origin at camera, direction through this fragment toward smoke
    vec3 ro = cameraPosition;
    vec3 rd = normalize(uSmokePos - cameraPosition);
    
    // Add UV offset for ray direction spread
    vec2 uvOffset = (vUv - 0.5) * 2.0;
    rd += uvOffset.x * normalize(cross(rd, vec3(0.0, 1.0, 0.0)));
    rd += uvOffset.y * vec3(0.0, 1.0, 0.0);
    rd = normalize(rd);
    
    // Ray-sphere intersection
    vec3 oc = ro - uSmokePos;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - uSmokeRadius * uSmokeRadius;
    float disc = b * b - c;
    
    if(disc < 0.0 || -b + sqrt(max(disc, 0.0)) < 0.0) {
        discard;
    }
    
    float sqrtDisc = sqrt(max(disc, 0.0));
    float tMin = max(-b - sqrtDisc, 0.0);
    float tMax = -b + sqrtDisc;
    
    if(tMin > tMax) discard;
    
    // Raymarch through sphere
    float nbStep = 20.0;
    float rayLength = (tMax - tMin) / nbStep;
    
    float sumDen = 0.0, sumDif = 0.0;
    vec3 ld = normalize(vec3(0.5, 1.0, -0.7));
    
    for(float t = tMin; t < tMax; t += rayLength) {
        vec3 p = ro + t * rd;
        vec3 localP = (p - uSmokePos) / uSmokeRadius;
        
        if(dot(localP, localP) > 1.0) continue;
        
        float den = smoke(localP);
        sumDen += den;
        
        if(den > 0.02) {
            sumDif += max(0.0, den - smoke(localP + ld * 0.17));
        }
    }
    
    if(sumDen < 0.01) discard;
    
    // Lighting
    vec3 lightCol = vec3(0.95, 0.75, 0.3);
    float light = 10.0 * pow(max(0.0, dot(rd, ld)), 10.0);
    
    vec3 col = 0.01 * light * lightCol;
    col += 0.4 * sumDen * rayLength * vec3(0.8, 0.9, 1.0);
    col += 1.3 * sumDif * rayLength * lightCol;
    
    col *= uColor;
    
    float alpha = clamp(sumDen * rayLength * 3.0, 0.0, 1.0);
    
    gl_FragColor = vec4(pow(col, vec3(1.0/2.2)), alpha);
}
