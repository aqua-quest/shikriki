// GLSL fragments shared by every material.

export const globals = /* glsl */`
uniform float time;
uniform float dtRatio;
uniform vec2 resolution;
uniform vec3 lightDir;
`;

export const colorutils = /* glsl */`
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 vibrance(vec3 c, float v) {
    float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
    float sat = mx - mn;
    return mix(c, vec3(mx), -v * (1.0 - sat));
}
vec3 brightnessContrast(vec3 c, float b, float k) {
    return (c - 0.5) * k + 0.5 + b;
}
`;

export const triplanar = /* glsl */`
vec4 triplanar(sampler2D t, vec3 n, vec3 p, float sharpness) {
    vec3 w = pow(abs(n), vec3(sharpness));
    w /= max(1e-4, w.x + w.y + w.z);
    return texture(t, p.yz) * w.x + texture(t, p.xz) * w.y + texture(t, p.xy) * w.z;
}
`;

export const encoding = /* glsl */`
vec2 encodeNormal(vec3 n) { return n.xy * 0.5 + 0.5; }
vec3 decodeNormal(vec2 e) { vec2 xy = e * 2.0 - 1.0; return vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy)))); }
`;

export const falloff = /* glsl */`
float linearstep(float a, float b, float x) { return clamp((x - a) / (b - a), 0.0, 1.0); }
float falloff(float x, float a, float b, float w, float t) {
    float o = w * sign(b - a);
    float l = mix(a - o, b, t);
    return linearstep(l + o, l, x);
}
`;

export const hash = /* glsl */`
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash31(float p) { vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec2 hash23(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
`;

export const rotate = /* glsl */`
mat2 rotation2D(float a) { float s = sin(a), c = cos(a); return mat2(c, s, -s, c); }
mat4 rotation3D(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle), c = cos(angle), oc = 1.0 - c;
    return mat4(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
                oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
                oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
                0.0, 0.0, 0.0, 1.0);
}
`;

// what every scene material writes into the second attachment: view depth over 1000,
// the view-space normal (or zero for surfaces that want no crease lines) and whether
// this pixel takes an outline at all
export const infoOut = /* glsl */`
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
layout(location = 1) out highp vec4 gInfo;
`;

// a full-screen pass writes one colour only
export const fragOut = /* glsl */`
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
`;

export const vertexPrelude = /* glsl */`
vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) { return normalize((vec4(dir, 0.0) * matrix).xyz); }
`;
