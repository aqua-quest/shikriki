// The materials. All of them are one idea: a flat colour, a darker version of it in
// shadow with the hue turned a little cooler, a hard terminator between the two, and a
// note in the info buffer telling the outline pass where to ink. Shadows come from one
// directional light's shadow map, cut to two tones.

import * as THREE from 'three';
import { global } from '../core/global.js';
import { globals, colorutils, triplanar, encoding, hash, rotate, infoOut, vertexPrelude, falloff } from './chunks.js';
import { noiseTexture, cloudTexture } from './textures.js';

/**
 * The general toon material.
 *   vertexBody   — GLSL run before the world transform; may change `pos` and `nrm`
 *   fragmentBody — GLSL run after `color`, `elem`, `surfaceId`, `outline`, `tn` (triplanar noise) exist
 *   fragmentPost — GLSL run after lighting
 */
export function toonMaterial({
  color = '#ffffff', vertexColors = true, normals = false, boil = 0, boilRate = 3, noiseScale = 0.07, breakAt = 0.17,
  shadeV = 0.6, shadeHue = -0.035, shadeSat = 1.15, lightWrap = 0.0, shadows = true,
  uniforms = {}, declarations = '', vertexOnly = '', vertexBody = '', fragmentBody = '', fragmentPost = '', side = THREE.FrontSide, transparent = false, defines = {},
} = {}) {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.lights, {
    uColor: { value: new THREE.Color(color) },
    tNoise: { value: null },
    tCloud: { value: null },
    uNoiseScale: { value: noiseScale },
    uBreak: { value: breakAt },
    uShadeV: { value: shadeV },
    uShadeHue: { value: shadeHue },
    uShadeSat: { value: shadeSat },
    uLightWrap: { value: lightWrap },
    uNormals: { value: normals ? 1 : 0 },
    uBoil: { value: boil },
    uBoilRate: { value: boilRate },
    uSeed: { value: Math.random() },
    uShow: { value: 1 },
  }]);
  u.tNoise.value = noiseTexture();
  u.tCloud.value = cloudTexture();
  Object.assign(u, global.uniforms, uniforms);

  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    lights: true,
    vertexColors,
    side, transparent,
    defines: { ...(shadows ? {} : { NO_SHADOW: 1 }), ...defines },
    uniforms: u,
    vertexShader: /* glsl */`
      ${globals}
      ${hash}
      ${rotate}
      ${falloff}
      ${triplanar}
      ${vertexPrelude}
      attribute vec4 aux;
      uniform float uBoil, uBoilRate, uSeed, uShow;
      uniform sampler2D tNoise, tCloud;
      varying vec3 vColor;
      varying vec4 vAux;
      varying vec3 vNormalW, vNormalV, vPosL, vPosW;
      varying float vDepth;
      varying float vInst;
      varying vec2 vUv;
      ${declarations}
      ${vertexOnly}
      #include <shadowmap_pars_vertex>
      void main() {
          vUv = uv;
          vAux = aux;
          #ifdef USE_INSTANCING
              vInst = float(gl_InstanceID);
          #else
              vInst = 0.0;
          #endif
          #ifdef USE_COLOR
              vColor = color;
          #else
              vColor = vec3(1.0);
          #endif
          #ifdef USE_INSTANCING_COLOR
              vColor *= instanceColor;
          #endif
          vec3 pos = position;
          vec3 nrm = normal;
          ${vertexBody}
          #ifdef USE_INSTANCING
              mat4 mm = modelMatrix * instanceMatrix;
          #else
              mat4 mm = modelMatrix;
          #endif
          if (uBoil > 0.0) {
              float t = floor(time * uBoilRate);
              vec3 axis = normalize(hash31(uSeed * 7.13 + t) * 2.0 - 1.0);
              mat4 r = rotation3D(axis, uBoil);
              pos = (r * vec4(pos, 1.0)).xyz;
              nrm = mat3(r) * nrm;
          }
          vec4 worldPosition = mm * vec4(pos, 1.0);
          vPosL = pos;
          vPosW = worldPosition.xyz;
          vNormalW = normalize(mat3(mm) * nrm);
          vNormalV = normalize((viewMatrix * vec4(vNormalW, 0.0)).xyz);
          vec3 transformedNormal = vNormalV;
          #include <shadowmap_vertex>
          vec4 mvPosition = viewMatrix * worldPosition;
          vDepth = -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */`
      ${infoOut}
      ${globals}
      ${colorutils}
      ${triplanar}
      ${encoding}
      ${hash}
      ${falloff}
      uniform sampler2D tNoise, tCloud;
      uniform vec3 uColor;
      uniform float uNoiseScale, uBreak, uShadeV, uShadeHue, uShadeSat, uLightWrap, uNormals, uSeed, uShow;
      uniform bool receiveShadow;
      varying vec3 vColor;
      varying vec4 vAux;
      varying vec3 vNormalW, vNormalV, vPosL, vPosW;
      varying float vDepth;
      varying float vInst;
      varying vec2 vUv;
      ${declarations}
      #include <packing>
      #include <shadowmap_pars_fragment>
      vec3 shadeOf(vec3 c) {
          vec3 h = rgb2hsv(c);
          h.x = fract(h.x + uShadeHue);
          h.y = clamp(h.y * uShadeSat, 0.0, 1.0);
          h.z *= uShadeV;
          return hsv2rgb(h);
      }
      void main() {
          vec3 color = vColor * uColor;
          float elem = vAux.x;
          float seed = vAux.y;
          float outline = 1.0 - vAux.z;
          float surfaceId = vAux.w;
          vec3 nW = normalize(vNormalW);
          vec4 tn = triplanar(tNoise, nW, vPosL * uNoiseScale, 1.0);
          vec3 emissive = vec3(0.0);
          float emissiveAmt = 0.0;
          ${fragmentBody}
          vec3 shade = shadeOf(color);
          float ndl = dot(nW, lightDir);
          float lit = smoothstep(-0.04 - uLightWrap, 0.1 - uLightWrap, ndl + (tn.r - 0.5) * 0.12);
          #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0 && !defined(NO_SHADOW)
              if (receiveShadow) {
                  DirectionalLightShadow s = directionalLightShadows[0];
                  float sh = getShadow(directionalShadowMap[0], s.shadowMapSize, s.shadowIntensity, s.shadowBias, s.shadowRadius, vDirectionalShadowCoord[0]);
                  lit = min(lit, smoothstep(0.2, 0.4, sh));
              }
          #endif
          color = mix(shade, color, lit);
          color = mix(color, emissive, emissiveAmt);
          ${fragmentPost}
          outline *= step(uBreak, tn.g * tn.b);
          gl_FragColor = vec4(color, surfaceId);
          gInfo = vec4(vDepth / 1000.0, uNormals > 0.5 ? encodeNormal(normalize(vNormalV)) : vec2(0.0), step(0.5, outline));
      }
    `,
  });
  return mat;
}

/** A flat gradient sky: apricot at the horizon, dusty teal overhead, the far wall of the outline pass. */
export function skyMaterial({ horizon = '#efc09a', zenith = '#6f9fb0', low = '#b9a58f' } = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uHorizon: { value: new THREE.Color(horizon) }, uZenith: { value: new THREE.Color(zenith) }, uLow: { value: new THREE.Color(low) }, ...global.uniforms },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      ${infoOut}
      ${globals}
      uniform vec3 uHorizon, uZenith, uLow;
      varying vec3 vDir;
      void main() {
          float y = vDir.y;
          vec3 c = mix(uHorizon, uZenith, smoothstep(0.02, 0.55, y));
          c = mix(uLow, c, smoothstep(-0.5, 0.02, y));
          // a faint band of warm light where the sun sits
          float sun = max(0.0, dot(vDir, lightDir));
          c += vec3(0.16, 0.09, 0.02) * pow(sun, 6.0);
          gl_FragColor = vec4(c, 1.0);
          gInfo = vec4(1.0, vec2(0.0), 1.0);
      }
    `,
  });
}

/** The Mtkvari and the reservoir: teal water with stepped white wave bands near the banks. */
export function waterMaterial() {
  return toonMaterial({
    color: '#ffffff', normals: false, shadeV: 0.7, shadeHue: 0.02,
    declarations: 'varying float vDist;',
    vertexOnly: 'attribute float dist;',
    vertexBody: /* glsl */`
      vDist = dist;
    `,
    fragmentBody: /* glsl */`
      if (vDist > 1.06) discard;
      vec4 tw = triplanar(tNoise, nW, vPosL * 0.07 + time * 0.05, 1.0);
      vec3 deep = vec3(0.34, 0.55, 0.57);
      vec3 shallow = vec3(0.55, 0.74, 0.72);
      color = mix(deep, shallow, smoothstep(0.55, 1.0, vDist));
      float waves = fract(tw.r * 0.7 + vDist * 3.0 + time * 0.1);
      waves *= step(0.3, vDist) * (1.0 - step(0.85, vDist)) * tw.r;
      waves = step(0.3, waves);
      color = mix(color, vec3(0.94, 0.93, 0.86), waves);
      surfaceId = 0.5 + waves * 0.2;
    `,
  });
}

/** Clouds: a blob pushed in and out by stepped noise, so they boil at four frames a second. */
export function cloudMaterial() {
  return toonMaterial({
    color: '#fbf4e6', normals: false, shadeV: 0.82, shadeHue: 0.0, shadeSat: 0.8, shadows: false, breakAt: 0.12,
    vertexBody: /* glsl */`
      vec4 n4 = triplanar(tNoise, nrm, pos * 0.07 + uSeed, 1.0);
      pos += sin(n4.r * 180.0 + floor(time * 6.0) * 0.25) * normalize(pos) * 0.2;
    `,
  });
}

/** The warm haze around the city: a shell that only shows at the rim, eroded by cloud noise. */
export function atmosphereMaterial({ color = '#f4d2a4', alpha = 0.2 } = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.BackSide, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: alpha }, tCloud: { value: cloudTexture() }, uShow: { value: 0 }, ...global.uniforms },
    vertexShader: /* glsl */`
      varying vec3 vNormal, vPos, vMvPos;
      void main() {
          vPos = position;
          vMvPos = vec3(modelViewMatrix * vec4(position, 1.0));
          gl_Position = projectionMatrix * vec4(vMvPos, 1.0);
          vNormal = normalize(normalMatrix * normal);
      }
    `,
    fragmentShader: /* glsl */`
      ${infoOut}
      ${globals}
      ${triplanar}
      uniform vec3 uColor;
      uniform sampler2D tCloud;
      uniform float uShow, uAlpha;
      varying vec3 vNormal, vPos, vMvPos;
      void main() {
          float fresnel = abs(dot(normalize(vNormal), normalize(vMvPos)));
          float noise = triplanar(tCloud, vNormal, vPos * 0.015 + vec3(0.0, time * 0.004, 0.0), 1.0).x;
          noise *= 1.0 - pow(1.0 - fresnel, 2.0);
          noise *= uShow;
          if (noise < 0.36) discard;
          gl_FragColor = vec4(uColor, uAlpha);
          gInfo = vec4(0.0);
      }
    `,
  });
}

/** Distant ridges and the sun: flat cards eaten into silhouettes by noise, turning in stepped time. */
export function backdropMaterial() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    uniforms: {
      uColor1: { value: new THREE.Color('#a9a2b5') }, uColor2: { value: new THREE.Color('#cbbcc3') }, uColor3: { value: new THREE.Color('#f6d9a6') },
      tCloud: { value: cloudTexture() }, uShow: { value: 0 }, ...global.uniforms,
    },
    vertexShader: /* glsl */`
      attribute float kind;
      varying vec2 vUv; varying float vKind; varying float vDepth;
      void main() {
          vUv = uv; vKind = kind;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      ${infoOut}
      ${globals}
      ${hash}
      uniform vec3 uColor1, uColor2, uColor3;
      uniform sampler2D tCloud;
      uniform float uShow;
      varying vec2 vUv; varying float vKind; varying float vDepth;
      mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, s, -s, c); }
      void main() {
          float k = vKind;
          vec2 uv = vUv;
          float value;
          vec3 color;
          float alphaMul = 0.92;
          if (k < 0.5) {
              // a ridge: a noisy skyline in the top third of the card, fading into haze below
              float t = floor(time * 2.0) * 0.01;
              float ridge = 0.5 + 0.3 * texture(tCloud, vec2(uv.x * 0.8 + t + hash11(k + 3.0), 0.3)).x + 0.12 * texture(tCloud, vec2(uv.x * 3.0 + t, 0.7)).y;
              value = step(uv.y, ridge);
              float erosion = texture(tCloud, uv * 1.7 + t).y;
              value *= step(0.2, erosion + uv.y * 0.4);
              color = mix(uColor2, uColor1, smoothstep(0.2, 0.75, uv.y));
              // the haze below the crest fades out at the card's foot and at both its sides,
              // so neighbouring cards melt into one range instead of showing their edges
              alphaMul = mix(0.0, 0.8, smoothstep(0.0, 0.4, uv.y)) * smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x);
          } else if (k < 1.5) {
              // the sun, a pale disc with a wobbling edge
              vec2 p = uv - 0.5;
              p = rot(floor(time * 2.0) * 0.4) * p;
              float r = length(p) * 2.0;
              float wob = (texture(tCloud, vec2(atan(p.y, p.x) / 6.2832 + 0.5, 0.5)).x - 0.5) * 0.08;
              value = step(r + wob, 0.72);
              color = uColor3;
          } else {
              // a low wisp of cloud
              float t = floor(time * 2.0) * 0.02;
              float n = texture(tCloud, uv * vec2(1.2, 2.0) + vec2(t, 0.0)).x;
              value = step(0.56, n * (1.0 - abs(uv.y - 0.5) * 1.9) * 1.4);
              color = mix(uColor2, vec3(0.98, 0.95, 0.9), 0.7);
              alphaMul = 0.55;
          }
          float alpha = step(0.5, value * uShow);
          if (alpha < 0.5) discard;
          gl_FragColor = vec4(color, alphaMul);
          gInfo = vec4(0.0);
      }
    `,
  });
}

/** Drifting specks: poplar fluff, ash from the bakeries, whatever floats over a city at dusk. */
export function speckMaterial(sprites) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    uniforms: { tSprites: { value: sprites }, uColor: { value: new THREE.Color('#f7e6c6') }, uShow: { value: 0 }, ...global.uniforms },
    vertexShader: /* glsl */`
      ${globals}
      attribute vec3 color;
      uniform float uShow;
      varying vec3 vNoise; varying float vProgress, vRotation, vSize;
      void main() {
          vNoise = color;
          float steppedTime = floor(time * 2.0) / 2.0;
          vec3 pos = position;
          vRotation = sin(steppedTime + vNoise.r * 20.0) * 3.14 * vNoise.g;
          pos.y += vRotation * 0.1;
          // a slow drift, like something carried on warm air
          pos += vec3(sin(time * 0.15 + vNoise.r * 9.0), cos(time * 0.11 + vNoise.g * 7.0), sin(time * 0.13 + vNoise.b * 5.0)) * 0.6;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          vProgress = floor(fract(vNoise.g * 20.0) * 16.0) / 16.0;
          vSize = vNoise.b;
          if (vSize > 0.5) vSize *= 2.0;
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = (resolution.y / mix(70.0, 50.0, vSize)) * uShow;
      }
    `,
    fragmentShader: /* glsl */`
      ${infoOut}
      ${globals}
      uniform sampler2D tSprites;
      uniform vec3 uColor;
      uniform float uShow;
      varying vec3 vNoise; varying float vProgress, vRotation, vSize;
      mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, s, -s, c); }
      void main() {
          vec2 uv = gl_PointCoord.xy - 0.5;
          uv = rot(vRotation) * uv + 0.5;
          uv.y = 1.0 - uv.y;
          uv.x = uv.x / 16.0 + vProgress;
          float sprite = texture(tSprites, uv).r;
          if (sprite < 0.5) discard;
          float alpha = smoothstep(0.0, 0.1, uShow);
          vec3 color = mix(uColor, uColor * vec3(0.9, 0.82, 0.7), vNoise.r);
          gl_FragColor = vec4(color, alpha);
          gInfo = vec4(0.0);
      }
    `,
  });
}

/** Laundry lines, the funicular cable, the tower's guy wires: a polyline extruded to a fixed screen width. */
export function lineMaterial({ color = '#4d4a48', width = 1 } = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uWidth: { value: width }, tNoise: { value: noiseTexture() }, ...global.uniforms },
    vertexShader: /* glsl */`
      ${globals}
      attribute float randomm;
      attribute vec3 nextpos, prevpos, curvepos;
      uniform float uWidth;
      varying vec2 vUv; varying float vRandom; varying float vDepth;
      void main() {
          vUv = uv; vRandom = randomm;
          vec4 worldPos = modelMatrix * vec4(curvepos, 1.0);
          vec4 worldPrev = modelMatrix * vec4(prevpos, 1.0);
          vec4 worldNext = modelMatrix * vec4(nextpos, 1.0);
          vec4 viewPos = viewMatrix * worldPos;
          vDepth = -viewPos.z;
          mat4 projView = projectionMatrix * viewMatrix;
          vec4 finalPos = projView * worldPos;
          vec4 finalPrev = projView * worldPrev;
          vec4 finalNext = projView * worldNext;
          // a point at or behind the camera plane cannot be extruded in screen space:
          // collapse it out of the view instead of letting it explode into a giant triangle
          if (finalPos.w < 0.2 || finalPrev.w < 0.2 || finalNext.w < 0.2) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vDepth = 1000.0; return; }
          float aspect = resolution.x / resolution.y;
          vec2 aspectVec = vec2(aspect, 1.0);
          vec2 posScreen = finalPos.xy / finalPos.w * aspectVec;
          vec2 prevScreen = finalPrev.xy / finalPrev.w * aspectVec;
          vec2 nextScreen = finalNext.xy / finalNext.w * aspectVec;
          vec2 dirA = normalize(posScreen - prevScreen);
          vec2 dirB = normalize(nextScreen - posScreen);
          vec2 tangent = normalize(dirA + dirB);
          vec2 normal = normalize(vec2(-tangent.y, tangent.x));
          if (uv.x > 0.5) normal = -normal;
          normal.x /= aspect;
          float width = max(-60.0, viewPos.z) * 0.0009 * aspect * uWidth;
          normal *= width;
          gl_Position = finalPos + vec4(normal.xy, 0.0, 0.0);
      }
    `,
    fragmentShader: /* glsl */`
      ${infoOut}
      ${globals}
      uniform vec3 uColor;
      uniform sampler2D tNoise;
      varying vec2 vUv; varying float vRandom; varying float vDepth;
      void main() {
          float n = texture(tNoise, vec2(0.5 + vRandom, vUv.y * 0.02)).g;
          if (n < 0.36) discard;
          gl_FragColor = vec4(uColor, 1.0);
          gInfo = vec4(vDepth / 1000.0, vec2(0.0), 0.0);
      }
    `,
  });
}

/** The waterfall in the gorge behind the baths: stepped noise pouring down a ribbon. */
export function waterfallMaterial() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide,
    uniforms: {
      uColor1: { value: new THREE.Color('#8fb9c2') }, uColor2: { value: new THREE.Color('#5a8a91') }, uColor3: { value: new THREE.Color('#e8f2f0') },
      tNoise: { value: noiseTexture() }, ...global.uniforms,
    },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying float vDepth;
      void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      ${infoOut}
      ${globals}
      uniform vec3 uColor1, uColor2, uColor3;
      uniform sampler2D tNoise;
      varying vec2 vUv; varying float vDepth;
      void main() {
          float t = floor(time * 8.0) / 8.0;
          float n = texture(tNoise, vec2(vUv.x * 1.5, vUv.y * 0.35 + t * 0.5)).g;
          float n2 = texture(tNoise, vec2(vUv.x * 3.0 + 0.3, vUv.y * 0.6 + t * 0.9)).b;
          vec3 color = mix(uColor2, uColor1, step(0.5, n));
          color = mix(color, uColor3, step(0.62, n2) * step(0.45, n));
          // the foam at the bottom
          color = mix(color, uColor3, step(0.85, vUv.y) * step(0.4, n2));
          gl_FragColor = vec4(color, 0.55 + step(0.5, n) * 0.2);
          gInfo = vec4(vDepth / 1000.0, vec2(0.0), 0.0);
      }
    `,
  });
}

/** Birds: an instanced silhouette that flaps in the vertex shader, two-toned by the light. */
export function birdMaterial() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uColor: { value: new THREE.Color('#4b3f3a') }, uShow: { value: 1 }, ...global.uniforms },
    vertexShader: /* glsl */`
      ${globals}
      ${hash}
      attribute vec3 heading;
      uniform float uShow;
      varying vec3 vNormalV; varying float vDepth; varying float vLit;
      void main() {
          vec3 rand = hash31(float(gl_InstanceID));
          vec3 pos = position * uShow;
          float wingLength = abs(position.z);
          float flap = sin(position.x * 5.0 + wingLength * 5.0 - time * mix(10.0, 17.0, rand.x));
          pos.y += flap * wingLength * 0.7;
          pos *= mix(0.7, 1.2, rand.y);
          vec4 wp = instanceMatrix * vec4(pos, 1.0);
          vec3 n = normalize(mat3(instanceMatrix) * normal);
          vLit = dot(n, lightDir);
          vNormalV = normalize((viewMatrix * vec4(n, 0.0)).xyz);
          vec4 mv = viewMatrix * modelMatrix * wp;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      ${infoOut}
      ${globals}
      ${encoding}
      uniform vec3 uColor;
      varying vec3 vNormalV; varying float vDepth; varying float vLit;
      void main() {
          vec3 c = mix(uColor * 0.7, uColor, step(0.0, vLit));
          gl_FragColor = vec4(c, 0.9);
          gInfo = vec4(vDepth / 1000.0, vec2(0.0), 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}
