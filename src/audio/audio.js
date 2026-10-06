// The audio controller: named sounds with their own volume, loop and throttle, played
// through one master gain. Nothing plays until the page has had a click or a key,
// because browsers insist; the music and the ambience loops start the moment it has.
// M mutes.

import { events } from '../core/events.js';
import { renderSounds } from './synth.js';

const SETTINGS = [
  { name: 'bgmusic', volume: 0.1, autoPlay: true, loop: true },
  { name: 'intro-letters', volume: 0.1 },
  { name: 'button-turn', volume: 0.1, minTimeBetweenPlays: 0.2 },
  { name: 'button-out', volume: 0.075 },
  { name: 'rune1', volume: 0.1, minTimeBetweenPlays: 0.2 },
  { name: 'rune2', volume: 0.1, minTimeBetweenPlays: 0.2 },
  { name: 'rune3', volume: 0.1, minTimeBetweenPlays: 0.2 },
  { name: 'rune4', volume: 0.1, minTimeBetweenPlays: 0.2 },
  { name: 'ambiance-base', volume: 0, autoPlay: true, loop: true },
  { name: 'whoosh', volume: 0.2 },
  { name: 'title', volume: 0.25 },
  { name: 'hover2', volume: 0.2 },
  { name: 'click2', volume: 0.15 },
  { name: 'click3', volume: 0.05 },
  // the city
  { name: 'footsteps', volume: 0, autoPlay: true, loop: true },
  { name: 'footsteps-water', volume: 0, autoPlay: true, loop: true },
  { name: 'jump', volume: 0.1 },
  { name: 'land', volume: 0.125 },
  { name: 'emoji-starts1', volume: 0.15 }, { name: 'emoji-starts2', volume: 0.15 }, { name: 'emoji-starts3', volume: 0.15 },
  { name: 'emoji-ends1', volume: 0.1 }, { name: 'emoji-ends2', volume: 0.1 }, { name: 'emoji-ends3', volume: 0.1 },
  { name: 'clothes', volume: 0.2 },
  { name: 'zoom-off', volume: 0.1 },
  { name: 'buttons', volume: 0.05 },
  { name: 'open-box1', volume: 0.1 }, { name: 'open-box2', volume: 0.15 }, { name: 'open-box-checklist', volume: 0.6 },
  { name: 'paper', volume: 0, autoPlay: true, loop: true },
  { name: 'customize', volume: 0.06 },
  { name: 'quest-complete', volume: 0.25 },
  { name: 'dialogue-quest', volume: 0, autoPlay: true, loop: true },
  { name: 'musician', volume: 0, autoPlay: true, loop: true },
  { name: 'ambiance-city', volume: 0, autoPlay: true, loop: true },
  { name: 'ambiance-water', volume: 0, autoPlay: true, loop: true },
  { name: 'ambiance-forest', volume: 0, autoPlay: true, loop: true },
  { name: 'ambiance-sea', volume: 0, autoPlay: true, loop: true },
  { name: 'ambiance-wind', volume: 0, autoPlay: true, loop: true },
  { name: 'voice-male1', volume: 0.12, minTimeBetweenPlays: 0.04 }, { name: 'voice-male2', volume: 0.12, minTimeBetweenPlays: 0.04 }, { name: 'voice-male3', volume: 0.12, minTimeBetweenPlays: 0.04 },
  { name: 'voice-female1', volume: 0.12, minTimeBetweenPlays: 0.04 }, { name: 'voice-female2', volume: 0.12, minTimeBetweenPlays: 0.04 }, { name: 'voice-female3', volume: 0.12, minTimeBetweenPlays: 0.04 },
  { name: 'voice-wtf', volume: 0.12, minTimeBetweenPlays: 0.04 }, { name: 'voice-quest', volume: 0.1, minTimeBetweenPlays: 0.04 },
];

export class AudioController {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sounds = new Map();
    this.unlocked = false;
    this.userMuted = false;
    this.ready = false;
    events.on('play_audio', this.play, this);
    events.on('stop_audio', this.stop, this);
    events.on('set_audio_volume', this.setVolume, this);
  }
  async init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    const buffers = await renderSounds(this.ctx);
    for (const s of SETTINGS) this.add({ ...s, buffer: buffers[s.name] });
    this.ready = true;
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      this.ctx.resume().then(() => this._startLoops());
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') this.toggleMute(); });
    if (this.ctx.state === 'running') { this.unlocked = true; this._startLoops(); }
  }
  add({ name, buffer, volume = 1, loop = false, autoPlay = false, minTimeBetweenPlays = 0, offset = 0 }) {
    if (!buffer) return;
    this.sounds.set(name, { name, buffer, volume, loop, autoPlay, minTime: minTimeBetweenPlays, offset, lastPlay: -1e9, source: null, gain: null });
  }
  _startLoops() {
    for (const s of this.sounds.values()) if (s.autoPlay && s.loop && !s.source) this._startLoop(s);
  }
  _startLoop(s) {
    const src = this.ctx.createBufferSource();
    src.buffer = s.buffer; src.loop = true;
    const g = this.ctx.createGain(); g.gain.value = s.volume;
    src.connect(g); g.connect(this.master);
    src.start(0, s.offset);
    s.source = src; s.gain = g;
  }
  get muted() { return this.userMuted; }
  toggleMute() {
    this.userMuted = !this.userMuted;
    if (this.master) this.master.gain.setTargetAtTime(this.userMuted ? 0 : 1, this.ctx.currentTime, 0.05);
    events.emit('audio_muted', this.userMuted);
  }
  play(name) {
    const s = this.sounds.get(name);
    if (!s || !this.ctx || !this.unlocked || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - s.lastPlay < s.minTime) return;
    s.lastPlay = now;
    if (s.loop) { if (!s.source) this._startLoop(s); return; }
    const src = this.ctx.createBufferSource();
    src.buffer = s.buffer;
    const g = this.ctx.createGain(); g.gain.value = s.volume;
    src.connect(g); g.connect(this.master);
    src.start();
    src.onended = () => { src.disconnect(); g.disconnect(); };
  }
  stop(name) {
    const s = this.sounds.get(name);
    if (!s || !s.source) return;
    try { s.source.stop(); } catch {}
    s.source.disconnect(); s.gain.disconnect();
    s.source = null; s.gain = null;
  }
  setVolume(name, v, ramp = 0.08) {
    const s = this.sounds.get(name);
    if (!s) return;
    s.volume = v;
    if (s.gain && this.ctx) s.gain.gain.setTargetAtTime(v, this.ctx.currentTime, ramp);
  }
}
