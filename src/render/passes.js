// The frame. A scene is drawn into two attachments at once — colour with a surface id
// in its alpha, and an "info" buffer holding depth, normal and an outline mask — and a
// full-screen pass finds the edges in that info buffer and inks them. That is the whole
// hand-drawn look: flat colour, then a pen line wherever depth or surface changes,
// broken up where the surface asked for it. A last pass owns the wipes between scenes.

import * as THREE from 'three';
import { global } from '../core/global.js';
import { events } from '../core/events.js';
import { globals, colorutils, encoding, falloff, hash, fragOut } from './chunks.js';

export class FullscreenPass {
  constructor(material) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  get material() { return this.mesh.material; }
  set material(m) { this.mesh.material = m; }
  render(target = null) {
    const r = global.renderer;
    r.setRenderTarget(target);
    r.render(this.scene, this.camera);
  }
  dispose() { this.mesh.geometry.dispose(); }
}

const passVertex = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export class OutlineMaterial extends THREE.ShaderMaterial {
  constructor(opts = {}) {
    super({
      glslVersion: THREE.GLSL3,
      uniforms: {
        tDiffuse: { value: null },
        tInfo: { value: null },
        time: global.uniforms.time,
        resolution: global.uniforms.resolution,
        uOutlineColor: { value: new THREE.Color(opts.color || '#3a2723') },
        uThickness: { value: opts.thickness ?? 1.4 },
        uDepthThreshold: { value: opts.depthThreshold ?? 0.35 },
        uDepthSlope: { value: opts.depthSlope ?? 0.012 },
        uNormalThreshold: { value: opts.normalThreshold ?? 0.55 },
        uIdThreshold: { value: opts.idThreshold ?? 0.04 },
        uFade: { value: new THREE.Vector2(opts.fadeStart ?? 300, opts.fadeEnd ?? 700) },
        uOutlineScale: { value: 1 },
        uGrain: { value: opts.grain ?? 0.03 },
        uVignette: { value: opts.vignette ?? 0.16 },
        uLift: { value: opts.lift ?? 0.035 },
        uWarm: { value: opts.warm ?? 1 },
      },
      vertexShader: passVertex,
      fragmentShader: /* glsl */`
        ${fragOut}
        ${globals}
        ${encoding}
        ${hash}
        ${colorutils}
        uniform sampler2D tDiffuse;
        uniform sampler2D tInfo;
        uniform vec3 uOutlineColor;
        uniform float uThickness, uDepthThreshold, uDepthSlope, uNormalThreshold, uIdThreshold, uOutlineScale, uGrain, uVignette, uLift, uWarm;
        uniform vec2 uFade;
        varying vec2 vUv;

        // an edge exists between the centre pixel and a neighbour when depth jumps, the
        // surface id changes, or (for surfaces that publish a normal) the normal turns
        float edgeAt(vec2 uv, vec2 off, vec4 i0, float id0, vec3 n0, bool hasN0, out float contrib) {
            vec4 i1 = texture(tInfo, uv + off);
            float id1 = texture(tDiffuse, uv + off).a;
            float d0 = i0.r * 1000.0, d1 = i1.r * 1000.0;
            float dmin = min(d0, d1);
            float depthEdge = step(uDepthThreshold + dmin * uDepthSlope, abs(d1 - d0));
            float idEdge = step(uIdThreshold, abs(id1 - id0)) * step(abs(d1 - d0), 2.5);
            bool hasN1 = i1.g + i1.b > 0.001;
            float normalEdge = 0.0;
            if (hasN0 && hasN1) {
                vec3 n1 = decodeNormal(i1.gb);
                normalEdge = step(uNormalThreshold, 1.0 - dot(n0, n1)) * step(abs(d1 - d0), 6.0);
            }
            // the ink goes on the nearer surface, and only if that surface takes ink there
            contrib = d1 < d0 ? i1.a : i0.a;
            return max(depthEdge, max(idEdge, normalEdge));
        }

        void main() {
            vec2 uv = vUv;
            vec4 scene = texture(tDiffuse, uv);
            vec4 info = texture(tInfo, uv);
            float depth = info.r * 1000.0;
            float id0 = scene.a;
            bool hasN0 = info.g + info.b > 0.001;
            vec3 n0 = hasN0 ? decodeNormal(info.gb) : vec3(0.0, 0.0, 1.0);

            float resScale = clamp(resolution.y / 900.0, 0.75, 1.8) * uOutlineScale;
            vec2 px = uThickness * resScale / resolution;

            float outline = 0.0, c;
            float e;
            e = edgeAt(uv, vec2( px.x, 0.0), info, id0, n0, hasN0, c); outline = max(outline, e * c);
            e = edgeAt(uv, vec2(-px.x, 0.0), info, id0, n0, hasN0, c); outline = max(outline, e * c);
            e = edgeAt(uv, vec2(0.0,  px.y), info, id0, n0, hasN0, c); outline = max(outline, e * c);
            e = edgeAt(uv, vec2(0.0, -px.y), info, id0, n0, hasN0, c); outline = max(outline, e * c);
            e = edgeAt(uv, vec2( px.x,  px.y) * 0.7, info, id0, n0, hasN0, c); outline = max(outline, e * c);
            e = edgeAt(uv, vec2(-px.x, -px.y) * 0.7, info, id0, n0, hasN0, c); outline = max(outline, e * c);

            // lines thin out with distance, like a pen lifted
            outline *= 1.0 - smoothstep(uFade.x, uFade.y, depth);
            outline = step(0.5, outline);

            vec3 color = mix(scene.rgb, uOutlineColor, outline);

            // the grade: a sun-faded print. lifted blacks, warm highlights, a breath of
            // desaturation, a vignette and grain that flickers at eight frames a second
            float lum = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(vec3(lum), color, 0.93);
            color = color * (1.0 - uLift) + uLift;
            color = pow(color, mix(vec3(1.0), vec3(0.98, 1.0, 1.05), uWarm));
            float aspect = resolution.x / resolution.y;
            float v = length((uv - 0.5) * vec2(aspect, 1.0));
            color *= 1.0 - uVignette * smoothstep(0.45, 1.15, v);
            float grain = hash12(floor(uv * resolution * 0.5) + floor(time * 8.0) * 17.0) - 0.5;
            color += grain * uGrain;

            gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthTest: false, depthWrite: false,
    });
  }
}

/** The transition layer: two diagonal wipes in the paper colour, a flash and a dim overlay. */
export class WipeMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      glslVersion: THREE.GLSL3,
      uniforms: {
        tScene: { value: null },
        uWipe1: { value: 1 },
        uWipe2: { value: 0 },
        uWipeColor: { value: new THREE.Color('#f3e7cf') },
        uFlash: { value: 0 },
        uOverlay: { value: 0 },
        uOverlayColor: { value: new THREE.Color('#2b2320') },
        time: global.uniforms.time,
        resolution: global.uniforms.resolution,
      },
      vertexShader: passVertex,
      fragmentShader: /* glsl */`
        ${fragOut}
        ${globals}
        ${falloff}
        ${colorutils}
        ${hash}
        uniform sampler2D tScene;
        uniform float uWipe1, uWipe2, uFlash, uOverlay;
        uniform vec3 uWipeColor, uOverlayColor;
        varying vec2 vUv;
        void main() {
            vec3 color = texture(tScene, vUv).rgb;
            color = mix(color, uOverlayColor, clamp(uOverlay, 0.0, 1.0) * 0.9);
            if (uFlash > 0.0) {
                color = vibrance(color, uFlash);
                color = brightnessContrast(color, uFlash, 1.0);
            }
            // the wipes' edges are torn paper: a little noise along the diagonal, only while a wipe is moving
            float tear = (hash12(floor(vUv * vec2(90.0, 50.0))) - 0.5) * 0.02;
            float tear1 = tear * clamp(uWipe1 * (1.0 - uWipe1) * 6.0, 0.0, 1.0);
            float tear2 = tear * clamp(uWipe2 * (1.0 - uWipe2) * 6.0, 0.0, 1.0);
            float inclination1 = 0.3 * uWipe1;
            float uv1 = vUv.y - (1.0 - vUv.x) * inclination1 + tear1;
            float wipe1 = falloff(uv1, 1.0, -inclination1, 1e-6, uWipe1) * step(0.0005, uWipe1);
            float inclination2 = 0.3 * (1.0 - uWipe2);
            float uv2 = vUv.y - vUv.x * inclination2 + tear2;
            float wipe2 = falloff(uv2, -inclination2, 1.0, 1e-6, uWipe2) * step(0.0005, uWipe2);
            color = mix(color, uWipeColor, wipe1);
            color = mix(color, uWipeColor, wipe2);
            gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthTest: false, depthWrite: false,
    });
  }
}

/** Draws one scene: MRT render, then the outline/grade pass into a texture the wipe layer composes. */
export class SceneComposer {
  constructor(scene, outlineOptions = {}) {
    this.scene = scene;
    const res = global.uniforms.resolution.value;
    this.mrt = new THREE.WebGLRenderTarget(res.x, res.y, { count: 2, type: THREE.HalfFloatType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    this.mrt.textures[0].name = 'color';
    this.mrt.textures[1].name = 'info';
    this.out = new THREE.WebGLRenderTarget(res.x, res.y, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    this.outline = new OutlineMaterial(outlineOptions);
    this.outline.uniforms.tDiffuse.value = this.mrt.textures[0];
    this.outline.uniforms.tInfo.value = this.mrt.textures[1];
    this.pass = new FullscreenPass(this.outline);
    events.on('resize_renderer', this._resize, this);
  }
  _resize(res) {
    this.mrt.setSize(res.x, res.y);
    this.out.setSize(res.x, res.y);
  }
  get texture() { return this.out.texture; }
  render() {
    const r = global.renderer;
    r.setRenderTarget(this.mrt);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, false);
    r.render(this.scene, this.scene.camera);
    this.pass.render(this.out);
  }
  dispose() {
    events.off('resize_renderer', this._resize, this);
    this.mrt.dispose(); this.out.dispose(); this.outline.dispose(); this.pass.dispose();
    if (this.scene.dispose) this.scene.dispose();
  }
}
