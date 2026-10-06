// Every sound in the menu, written as arithmetic and rendered into buffers at start-up.
// No audio files. The instrument is a plucked string — a panduri, the three-string
// lute of eastern Georgia — made with the Karplus–Strong loop, plus chimes, a few
// clunks and ticks made from filtered noise, and a whoosh.
//
// The music is a slow tune in D Dorian over a drone a fifth wide, the way Kartlian
// songs sit on their drone; ten bars, twenty-four seconds, looped.

import { math } from '../core/math.js';

const rnd = math.seeded(1995);

function mono(sr, seconds) { return { sr, data: new Float32Array(Math.ceil(sr * seconds)) }; }

/** Karplus–Strong: a burst of noise in a delay line, averaged as it circulates. */
function addPluck(buf, t0, freq, dur, amp, { damp = 0.996, bright = 0.55 } = {}) {
  const sr = buf.sr, N = Math.max(2, Math.round(sr / freq)), start = Math.floor(t0 * sr), len = Math.floor(dur * sr);
  const ring = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) { const w = rnd() * 2 - 1; ring[i] = w * bright + prev * (1 - bright); prev = ring[i]; }
  let idx = 0;
  const d = buf.data;
  for (let n = 0; n < len; n++) {
    const cur = ring[idx], nxt = ring[(idx + 1) % N];
    ring[idx] = damp * 0.5 * (cur + nxt);
    idx = (idx + 1) % N;
    const i = start + n;
    if (i >= d.length) break;
    const env = n < 120 ? n / 120 : 1;
    d[i] += cur * amp * env;
  }
}

/** A small bell: a few inharmonic partials, each dying at its own rate. */
function addChime(buf, t0, freq, dur, amp) {
  const sr = buf.sr, start = Math.floor(t0 * sr), len = Math.floor(dur * sr), d = buf.data;
  const partials = [[1, 1, 3.2], [2.41, 0.5, 5.5], [3.93, 0.28, 8], [5.62, 0.12, 12]];
  for (let n = 0; n < len; n++) {
    const t = n / sr; let s = 0;
    for (const [r, a, k] of partials) s += a * Math.sin(2 * Math.PI * freq * r * t) * Math.exp(-k * t);
    const i = start + n; if (i >= d.length) break;
    const env = n < 60 ? n / 60 : 1;
    d[i] += s * amp * env;
  }
}

/** Filtered noise with an envelope: cutoff sweeps from `c0` to `c1` Hz over the sound. */
function addNoise(buf, t0, dur, amp, { c0 = 800, c1 = 800, attack = 0.01, curve = 2, hp = 0 } = {}) {
  const sr = buf.sr, start = Math.floor(t0 * sr), len = Math.floor(dur * sr), d = buf.data;
  let lp = 0, hpPrev = 0, hpOut = 0;
  for (let n = 0; n < len; n++) {
    const t = n / len;
    const cutoff = c0 + (c1 - c0) * t;
    const a = 1 - Math.exp(-2 * Math.PI * cutoff / sr);
    const w = rnd() * 2 - 1;
    lp += a * (w - lp);
    let s = lp;
    if (hp > 0) { const r = 1 - 2 * Math.PI * hp / sr; hpOut = r * (hpOut + s - hpPrev); hpPrev = s; s = hpOut; }
    const ta = n / sr;
    const env = (ta < attack ? ta / attack : 1) * Math.pow(1 - t, curve);
    const i = start + n; if (i >= d.length) break;
    d[i] += s * amp * env;
  }
}

/** A tone gliding from `f0` to `f1`, with optional vibrato, a sine with a little third harmonic. */
function addTone(buf, t0, dur, amp, f0, f1, { vib = 0, vibRate = 8, decay = 4, attack = 0.005, third = 0.15 } = {}) {
  const sr = buf.sr, start = Math.floor(t0 * sr), len = Math.floor(dur * sr), d = buf.data;
  let ph = 0;
  for (let n = 0; n < len; n++) {
    const t = n / sr, u = n / len;
    const f = (f0 + (f1 - f0) * u) * (1 + vib * Math.sin(2 * Math.PI * vibRate * t) * Math.exp(-2 * t));
    ph += 2 * Math.PI * f / sr;
    const s = Math.sin(ph) + third * Math.sin(ph * 3);
    const env = (t < attack ? t / attack : 1) * Math.exp(-decay * t);
    const i = start + n; if (i >= d.length) break;
    d[i] += s * amp * env;
  }
}

function softClip(buf, drive = 1) {
  const d = buf.data;
  for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * drive);
}

function normalize(buf, peak = 0.9) {
  const d = buf.data; let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m;
}

const NOTE = (semitonesFromD4) => 293.66 * Math.pow(2, semitonesFromD4 / 12);
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const degree = (deg) => { const o = Math.floor(deg / 7), k = ((deg % 7) + 7) % 7; return DORIAN[k] + o * 12; };

// ---------------------------------------------------------------- the sounds

const makers = {
  whoosh(sr) { const b = mono(sr, 1.1); addNoise(b, 0, 1.05, 0.9, { c0: 250, c1: 2200, attack: 0.25, curve: 1.6 }); addNoise(b, 0.15, 0.8, 0.5, { c0: 1800, c1: 300, attack: 0.1, curve: 2.5 }); normalize(b, 0.7); return b; },
  'intro-letters'(sr) {
    const b = mono(sr, 1.9);
    const seq = [0, 1, 2, 4, 5, 7, 8];
    seq.forEach((deg, i) => addPluck(b, i * 0.075, NOTE(degree(deg) + 12), 0.9, 0.5, { damp: 0.994, bright: 0.65 }));
    addChime(b, 0.55, NOTE(degree(8) + 12), 1.2, 0.18);
    normalize(b, 0.8); return b;
  },
  rune1(sr) { const b = mono(sr, 0.9); addChime(b, 0, NOTE(degree(4) + 12), 0.9, 0.6); addPluck(b, 0, NOTE(degree(4)), 0.5, 0.3); normalize(b, 0.7); return b; },
  rune2(sr) { const b = mono(sr, 0.9); addChime(b, 0, NOTE(degree(5) + 12), 0.9, 0.6); addPluck(b, 0, NOTE(degree(2)), 0.5, 0.3); normalize(b, 0.7); return b; },
  rune3(sr) { const b = mono(sr, 0.9); addChime(b, 0, NOTE(degree(7) + 12), 0.9, 0.6); addPluck(b, 0, NOTE(degree(0)), 0.5, 0.3); normalize(b, 0.7); return b; },
  rune4(sr) { const b = mono(sr, 0.9); addChime(b, 0, NOTE(degree(9) + 12), 0.9, 0.6); addPluck(b, 0, NOTE(degree(4)), 0.5, 0.3); normalize(b, 0.7); return b; },
  'button-turn'(sr) {
    const b = mono(sr, 0.6);
    addNoise(b, 0, 0.04, 1.0, { c0: 1400, c1: 500, attack: 0.002, curve: 3 });          // the latch
    addTone(b, 0.02, 0.45, 0.5, 260, 170, { vib: 0.08, vibRate: 14, decay: 6 });          // the spring
    addNoise(b, 0.12, 0.05, 0.5, { c0: 900, c1: 400, attack: 0.002, curve: 3 });
    normalize(b, 0.75); return b;
  },
  'button-out'(sr) { const b = mono(sr, 0.7); addTone(b, 0, 0.65, 0.6, 720, 110, { decay: 3, third: 0.3 }); addNoise(b, 0, 0.6, 0.5, { c0: 2000, c1: 200, attack: 0.02, curve: 2 }); normalize(b, 0.7); return b; },
  hover2(sr) { const b = mono(sr, 0.05); addNoise(b, 0, 0.03, 1, { c0: 3000, c1: 1500, attack: 0.001, curve: 2, hp: 1200 }); normalize(b, 0.5); return b; },
  click2(sr) { const b = mono(sr, 0.08); addNoise(b, 0, 0.03, 1, { c0: 700, c1: 300, attack: 0.001, curve: 2 }); addTone(b, 0, 0.05, 0.6, 180, 150, { decay: 40 }); normalize(b, 0.7); return b; },
  click3(sr) { const b = mono(sr, 0.08); addNoise(b, 0, 0.025, 1, { c0: 1200, c1: 500, attack: 0.001, curve: 2 }); addTone(b, 0, 0.04, 0.5, 260, 220, { decay: 50 }); normalize(b, 0.6); return b; },
  title(sr) { const b = mono(sr, 2.2); [0, 4, 7, 11].forEach((deg, i) => addPluck(b, i * 0.05, NOTE(degree(deg)), 2, 0.5, { damp: 0.997, bright: 0.5 })); normalize(b, 0.8); return b; },

  bgmusic(sr) {
    const bpm = 100, beat = 60 / bpm, eighth = beat / 2, bars = 10, total = bars * 4 * beat;
    const b = mono(sr, total);
    // the drone: D and A, soft, breathing
    const droneLen = Math.floor(total * sr), d = b.data;
    for (let n = 0; n < droneLen; n++) {
      const t = n / sr;
      const breathe = 0.7 + 0.3 * Math.sin(2 * Math.PI * t / 6);
      const fadeIn = Math.min(1, t / 1.5), fadeOut = Math.min(1, (total - t) / 1.5);
      const s = Math.sin(2 * Math.PI * NOTE(-12) * t) + 0.5 * Math.sin(2 * Math.PI * NOTE(-5) * t) + 0.15 * Math.sin(2 * Math.PI * NOTE(-12) * 3 * t);
      d[n] += s * 0.045 * breathe * fadeIn * fadeOut;
    }
    // the bass string on beats one and three
    for (let bar = 0; bar < bars; bar++) for (const k of [0, 2]) {
      const deg = bar % 4 === 3 ? -7 : -14;
      addPluck(b, bar * 4 * beat + k * beat, NOTE(degree(deg)), 1.1, 0.16, { damp: 0.997, bright: 0.35 });
    }
    // the tune, in eighths; null is a rest
    const A = [0, 1, 2, 4, 2, 1, 0, -1, 0, 2, 4, 5, 4, 2, 1, 0];
    const B = [4, 5, 6, 7, 6, 5, 4, 2, 4, 2, 1, 0, -1, 0, 1, 0];
    const B2 = [4, 5, 6, 7, 6, 5, 4, 2, 4, 5, 4, 2, 1, 2, 1, 0];
    const C = [2, 4, 2, 1, 0, -1, -3, 0, 0, null, null, null, null, null, null, null];
    const phrase = [...A, ...B, ...A, ...B2, ...C];
    phrase.forEach((deg, i) => {
      if (deg === null) return;
      const t = i * eighth + (rnd() - 0.5) * 0.012;
      const long = phrase[i + 1] === null;
      addPluck(b, t, NOTE(degree(deg)), long ? 2.2 : 0.7, 0.2 + rnd() * 0.04, { damp: 0.995, bright: 0.55 });
      // a second voice a third below on the second and last phrases, the way the songs go
      const inB = (i >= 16 && i < 32) || i >= 48;
      if (inB && i % 2 === 0) addPluck(b, t + 0.004, NOTE(degree(deg - 2)), long ? 2.2 : 0.7, 0.1, { damp: 0.995, bright: 0.45 });
    });
    softClip(b, 1.4);
    normalize(b, 0.85);
    return b;
  },

  'ambiance-base'(sr) {
    const total = 16;
    const b = mono(sr, total);
    const d = b.data, len = d.length;
    // the low hum of a city and a generator two streets away
    let lp = 0, lp2 = 0;
    for (let n = 0; n < len; n++) {
      const t = n / sr;
      const w = rnd() * 2 - 1;
      lp += 0.012 * (w - lp);
      lp2 += 0.05 * (w - lp2);
      const wind = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / 7.3) * Math.sin(2 * Math.PI * t / 3.1 + 1);
      const gen = (Math.sin(2 * Math.PI * 50 * t) + 0.5 * Math.sin(2 * Math.PI * 100 * t) + 0.3 * Math.sin(2 * Math.PI * 150 * t)) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.4 * t));
      const edge = Math.min(1, t / 0.5, (total - t) / 0.5);
      d[n] += (lp * 2.2 + lp2 * 0.35 * wind + gen * 0.05) * edge;
    }
    // crows, three times
    for (const t0 of [3.1, 3.4, 11.2]) {
      const start = Math.floor(t0 * sr), l = Math.floor(0.16 * sr);
      let ph = 0;
      for (let n = 0; n < l; n++) {
        const t = n / sr, u = n / l;
        const f = 620 - 180 * u;
        ph += 2 * Math.PI * f / sr;
        let s = 0; for (let h = 1; h <= 5; h++) s += Math.sin(ph * h) / h;
        const am = 0.6 + 0.4 * Math.sin(2 * Math.PI * 24 * t);
        const env = Math.sin(Math.PI * u);
        if (start + n < len) d[start + n] += s * am * env * 0.12;
      }
    }
    normalize(b, 0.6);
    return b;
  },

  // ---------------------------------------------------------------- the city
  footsteps(sr) {
    // four soft steps on stone in a one-second loop, slightly uneven
    const b = mono(sr, 1.0);
    [0, 0.26, 0.5, 0.76].forEach((t, i) => { addNoise(b, t, 0.09, 0.9 + (i % 2) * 0.15, { c0: 500, c1: 160, attack: 0.004, curve: 2.5 }); addTone(b, t, 0.06, 0.25, 110, 80, { decay: 40 }); });
    normalize(b, 0.7); return b;
  },
  'footsteps-water'(sr) {
    const b = mono(sr, 1.0);
    [0, 0.26, 0.5, 0.76].forEach((t) => { addNoise(b, t, 0.16, 1, { c0: 2600, c1: 700, attack: 0.01, curve: 2 }); addNoise(b, t + 0.05, 0.1, 0.5, { c0: 3500, c1: 1500, attack: 0.005, curve: 2, hp: 800 }); });
    normalize(b, 0.6); return b;
  },
  jump(sr) { const b = mono(sr, 0.3); addNoise(b, 0, 0.12, 0.8, { c0: 600, c1: 2000, attack: 0.01, curve: 1.5 }); addTone(b, 0, 0.2, 0.5, 220, 440, { decay: 10 }); normalize(b, 0.6); return b; },
  land(sr) { const b = mono(sr, 0.25); addNoise(b, 0, 0.12, 1, { c0: 700, c1: 150, attack: 0.003, curve: 2.5 }); addTone(b, 0, 0.1, 0.5, 120, 70, { decay: 25 }); normalize(b, 0.7); return b; },
  'emoji-starts1'(sr) { const b = mono(sr, 0.5); addTone(b, 0, 0.25, 0.6, 400, 800, { decay: 6, third: 0.2 }); addChime(b, 0.05, 1200, 0.4, 0.3); normalize(b, 0.6); return b; },
  'emoji-starts2'(sr) { const b = mono(sr, 0.5); addTone(b, 0, 0.25, 0.6, 500, 950, { decay: 6, third: 0.2 }); addChime(b, 0.05, 1500, 0.4, 0.3); normalize(b, 0.6); return b; },
  'emoji-starts3'(sr) { const b = mono(sr, 0.5); addTone(b, 0, 0.2, 0.6, 350, 700, { decay: 7 }); addTone(b, 0.12, 0.2, 0.5, 700, 1000, { decay: 8 }); normalize(b, 0.6); return b; },
  'emoji-ends1'(sr) { const b = mono(sr, 0.35); addTone(b, 0, 0.3, 0.6, 700, 300, { decay: 8, third: 0.2 }); normalize(b, 0.5); return b; },
  'emoji-ends2'(sr) { const b = mono(sr, 0.35); addTone(b, 0, 0.3, 0.6, 800, 350, { decay: 8 }); normalize(b, 0.5); return b; },
  'emoji-ends3'(sr) { const b = mono(sr, 0.35); addNoise(b, 0, 0.2, 0.6, { c0: 1500, c1: 300, attack: 0.01, curve: 2 }); addTone(b, 0, 0.2, 0.4, 500, 250, { decay: 10 }); normalize(b, 0.5); return b; },
  clothes(sr) { const b = mono(sr, 0.45); addNoise(b, 0, 0.18, 0.8, { c0: 2200, c1: 900, attack: 0.02, curve: 1.5, hp: 300 }); addNoise(b, 0.2, 0.22, 0.6, { c0: 1800, c1: 600, attack: 0.03, curve: 1.5, hp: 300 }); normalize(b, 0.6); return b; },
  'zoom-off'(sr) { const b = mono(sr, 0.5); addTone(b, 0, 0.45, 0.6, 500, 180, { decay: 5 }); addNoise(b, 0, 0.4, 0.4, { c0: 1800, c1: 300, attack: 0.02, curve: 2 }); normalize(b, 0.6); return b; },
  buttons(sr) { const b = mono(sr, 0.5); [0, 0.08, 0.16, 0.24].forEach((t, i) => addNoise(b, t, 0.06, 0.8, { c0: 1800 + i * 300, c1: 600, attack: 0.003, curve: 2, hp: 400 })); normalize(b, 0.6); return b; },
  'open-box1'(sr) { const b = mono(sr, 0.4); addNoise(b, 0, 0.25, 0.7, { c0: 2500, c1: 800, attack: 0.01, curve: 1.6, hp: 500 }); addPluck(b, 0.02, NOTE(degree(4) + 12), 0.35, 0.4); normalize(b, 0.6); return b; },
  'open-box2'(sr) { const b = mono(sr, 0.4); addNoise(b, 0, 0.2, 0.7, { c0: 2000, c1: 600, attack: 0.01, curve: 1.6, hp: 500 }); addPluck(b, 0.02, NOTE(degree(0) + 12), 0.3, 0.35); normalize(b, 0.6); return b; },
  'open-box-checklist'(sr) { const b = mono(sr, 0.6); addNoise(b, 0, 0.3, 0.6, { c0: 2800, c1: 900, attack: 0.02, curve: 1.6, hp: 500 }); [0, 2, 4].forEach((d, i) => addPluck(b, i * 0.07, NOTE(degree(d) + 12), 0.5, 0.3)); normalize(b, 0.5); return b; },
  paper(sr) {
    // a loop of paper being handled, for while a card is on screen
    const b = mono(sr, 3.0);
    for (let i = 0; i < 9; i++) addNoise(b, i * 0.33 + (rnd() - 0.5) * 0.1, 0.25, 0.5 + rnd() * 0.4, { c0: 3000, c1: 900, attack: 0.03, curve: 1.3, hp: 600 });
    normalize(b, 0.5); return b;
  },
  customize(sr) { const b = mono(sr, 1.4); [0, 2, 4, 7, 9].forEach((d, i) => addPluck(b, i * 0.06, NOTE(degree(d) + 12), 1.2, 0.4, { damp: 0.997, bright: 0.6 })); normalize(b, 0.6); return b; },
  'quest-complete'(sr) {
    const b = mono(sr, 2.6);
    [[0, 0], [0.18, 2], [0.36, 4], [0.54, 7], [0.9, 9], [1.26, 7]].forEach(([t, d]) => addPluck(b, t, NOTE(degree(d)), 1.4, 0.45, { damp: 0.997, bright: 0.6 }));
    addChime(b, 0.9, NOTE(degree(9) + 12), 1.6, 0.3); addChime(b, 1.26, NOTE(degree(7) + 12), 1.4, 0.25);
    normalize(b, 0.8); return b;
  },
  'dialogue-quest'(sr) {
    // a soft loop for the ending: the drone and a slow arpeggio
    const b = mono(sr, 12);
    const d = b.data;
    for (let n = 0; n < d.length; n++) { const t = n / sr; const edge = Math.min(1, t / 1.0, (12 - t) / 1.0); d[n] += (Math.sin(2 * Math.PI * NOTE(-12) * t) + 0.5 * Math.sin(2 * Math.PI * NOTE(-5) * t)) * 0.05 * edge; }
    for (let i = 0; i < 16; i++) addPluck(b, i * 0.75, NOTE(degree([0, 2, 4, 7, 9, 7, 4, 2][i % 8])), 1.2, 0.18, { damp: 0.997, bright: 0.45 });
    normalize(b, 0.6); return b;
  },
  musician(sr) {
    // the duduk by the waterfall: a breathy reed tone wandering a slow melody
    const total = 16;
    const b = mono(sr, total);
    const melody = [0, 2, 3, 2, 0, -2, 0, 3, 5, 3, 2, 0, -2, -3, -2, 0];
    melody.forEach((deg, i) => {
      const t0 = i, dur = 1.0;
      const f = NOTE(degree(deg)) * 0.5;
      const start = Math.floor(t0 * sr), len = Math.floor(dur * sr), dd = b.data;
      let ph = 0;
      for (let n = 0; n < len; n++) {
        const t = n / sr, u = n / len;
        const vib = 1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t * 2);
        ph += 2 * Math.PI * f * vib / sr;
        let s = 0; for (let h = 1; h <= 6; h++) s += Math.sin(ph * h) / (h * h * 0.6 + 0.4);
        const env = Math.min(1, t / 0.12) * Math.min(1, (dur - t) / 0.15);
        if (start + n < dd.length) dd[start + n] += s * env * 0.22;
      }
    });
    addNoise(b, 0, total, 0.03, { c0: 1200, c1: 1200, attack: 0.5, curve: 0.2 });
    normalize(b, 0.5); return b;
  },
  'ambiance-city'(sr) {
    const total = 16, b = mono(sr, total), d = b.data;
    let lp = 0;
    for (let n = 0; n < d.length; n++) { const t = n / sr; const w = rnd() * 2 - 1; lp += 0.02 * (w - lp); const edge = Math.min(1, t / 0.5, (total - t) / 0.5); d[n] += lp * 2.0 * (0.8 + 0.2 * Math.sin(2 * Math.PI * t / 5.2)) * edge; }
    // a trolleybus hum, two car horns far off, pigeons
    for (let n = 0; n < d.length; n++) { const t = n / sr; d[n] += (Math.sin(2 * Math.PI * 90 * t) + 0.4 * Math.sin(2 * Math.PI * 180 * t)) * 0.02 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / 8)); }
    addTone(b, 4.2, 0.35, 0.12, 420, 400, { decay: 2, third: 0.5 }); addTone(b, 4.65, 0.25, 0.1, 420, 400, { decay: 3, third: 0.5 });
    addTone(b, 11.3, 0.5, 0.1, 330, 320, { decay: 2, third: 0.5 });
    for (const t of [2.0, 2.3, 9.0, 9.4, 9.7]) addTone(b, t, 0.18, 0.08, 480, 380, { vib: 0.1, vibRate: 30, decay: 6, third: 0.3 });
    normalize(b, 0.5); return b;
  },
  'ambiance-water'(sr) {
    const total = 12, b = mono(sr, total), d = b.data;
    let lp = 0, lp2 = 0;
    for (let n = 0; n < d.length; n++) { const t = n / sr; const w = rnd() * 2 - 1; lp += 0.08 * (w - lp); lp2 += 0.3 * (w - lp2); const edge = Math.min(1, t / 0.5, (total - t) / 0.5); d[n] += (lp * 1.2 + lp2 * 0.35 * (0.7 + 0.3 * Math.sin(2 * Math.PI * t / 1.7))) * edge; }
    normalize(b, 0.5); return b;
  },
  'ambiance-forest'(sr) {
    const total = 14, b = mono(sr, total), d = b.data;
    let lp = 0;
    for (let n = 0; n < d.length; n++) { const t = n / sr; const w = rnd() * 2 - 1; lp += 0.04 * (w - lp); const gust = 0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * t / 6.1 + Math.sin(t)), 2); const edge = Math.min(1, t / 0.5, (total - t) / 0.5); d[n] += lp * 1.6 * gust * edge; }
    for (const [t, f] of [[1.2, 2400], [1.5, 2600], [1.7, 2300], [6.4, 3000], [6.6, 3200], [10.1, 2100], [10.35, 2500]]) addTone(b, t, 0.12, 0.08, f, f * 1.2, { vib: 0.05, vibRate: 40, decay: 12 });
    normalize(b, 0.5); return b;
  },
  'ambiance-sea'(sr) {
    const total = 14, b = mono(sr, total), d = b.data;
    let lp = 0;
    for (let n = 0; n < d.length; n++) { const t = n / sr; const w = rnd() * 2 - 1; lp += 0.06 * (w - lp); const wave = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * t / 4.5), 3); const edge = Math.min(1, t / 0.5, (total - t) / 0.5); d[n] += lp * 1.8 * (0.25 + wave) * edge; }
    for (const t of [3.0, 3.4, 8.2]) addTone(b, t, 0.3, 0.07, 900, 700, { vib: 0.08, vibRate: 12, decay: 4, third: 0.3 });
    normalize(b, 0.5); return b;
  },
  'ambiance-wind'(sr) {
    const total = 12, b = mono(sr, total), d = b.data;
    let lp = 0;
    for (let n = 0; n < d.length; n++) { const t = n / sr; const w = rnd() * 2 - 1; lp += 0.03 * (w - lp); const gust = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / 7.3); const edge = Math.min(1, t / 0.5, (total - t) / 0.5); d[n] += lp * 1.8 * gust * edge; }
    normalize(b, 0.5); return b;
  },
  // the voices: a short formant-ish blip per syllable, each person at their own pitch
  'voice-male1'(sr) { return voiceBlip(sr, 140, 0.5); },
  'voice-male2'(sr) { return voiceBlip(sr, 165, 0.6); },
  'voice-male3'(sr) { return voiceBlip(sr, 120, 0.4); },
  'voice-female1'(sr) { return voiceBlip(sr, 230, 0.7); },
  'voice-female2'(sr) { return voiceBlip(sr, 265, 0.8); },
  'voice-female3'(sr) { return voiceBlip(sr, 300, 0.9); },
  'voice-wtf'(sr) { const b = mono(sr, 0.12); addTone(b, 0, 0.11, 0.6, 90, 60, { vib: 0.3, vibRate: 25, decay: 8, third: 0.6 }); normalize(b, 0.6); return b; },
  'voice-quest'(sr) { return voiceBlip(sr, 190, 0.55); },
};

function voiceBlip(sr, f, bright) {
  const b = mono(sr, 0.09), d = b.data, len = d.length;
  const f1 = f * (0.9 + rnd() * 0.2);
  let ph = 0;
  for (let n = 0; n < len; n++) {
    const t = n / sr, u = n / len;
    ph += 2 * Math.PI * f1 * (1 + 0.1 * Math.sin(u * Math.PI)) / sr;
    let s = Math.sin(ph) + 0.5 * bright * Math.sin(ph * 2) + 0.3 * bright * Math.sin(ph * 3);
    const env = Math.sin(Math.PI * u);
    d[n] = s * env * 0.6;
  }
  return b;
}

/** Render every sound into AudioBuffers. About a tenth of a second, all told. */
export async function renderSounds(ctx, onProgress) {
  const out = {};
  const names = Object.keys(makers);
  let i = 0;
  for (const name of names) {
    const m = makers[name](ctx.sampleRate);
    const buffer = ctx.createBuffer(1, m.data.length, ctx.sampleRate);
    buffer.copyToChannel(m.data, 0);
    out[name] = buffer;
    i++;
    if (onProgress) onProgress(i / names.length);
    await Promise.resolve();
  }
  return out;
}
