// The frame clock. Everything that moves reads `renderInfo`: `delta` in milliseconds,
// `ratio` as a multiple of a 60 Hz frame (so per-frame lerps stay stable at 30 or 120 Hz),
// `time` in seconds since start.
//
// The loop runs on requestAnimationFrame. With `?timer=1` on the URL it runs on a timer
// instead, which is how the menu is exercised from an automated browser whose pane is
// hidden and therefore never fires animation frames.

export const renderInfo = { time: 0, delta: 1000 / 60, ratio: 1, fps: 60, frame: 0 };

const callbacks = [];
let last = 0;
let useTimer = false;
let running = false;
let fpsAcc = 0, fpsN = 0;
const fpsListeners = [];

export function addToTicker(fn, priority = 0) {
  callbacks.push({ fn, priority });
  callbacks.sort((a, b) => a.priority - b.priority);
  return fn;
}

export function removeFromTicker(fn) {
  const i = callbacks.findIndex((c) => c.fn === fn);
  if (i >= 0) callbacks.splice(i, 1);
}

export function onAverageFPS(fn) { fpsListeners.push(fn); }

function step() {
  if (!running) return;
  const now = performance.now();
  let d = now - last;
  last = now;
  if (d > 100) d = 100;          // a stalled tab must not produce a giant step
  if (d < 1) d = 1;
  renderInfo.delta = d;
  renderInfo.ratio = d / (1000 / 60);
  renderInfo.time += d / 1000;
  renderInfo.frame++;
  fpsAcc += d; fpsN++;
  if (fpsAcc >= 1000) {
    renderInfo.fps = 1000 * fpsN / fpsAcc;
    fpsAcc = 0; fpsN = 0;
    for (const f of fpsListeners) f(renderInfo.fps);
  }
  for (const c of callbacks) c.fn(renderInfo);
  schedule();
}

function schedule() {
  if (useTimer) setTimeout(step, 1000 / 60);
  else requestAnimationFrame(step);
}

export function startTicker({ timer = false } = {}) {
  if (running) return;
  running = true;
  useTimer = timer;
  last = performance.now();
  schedule();
}

export function stopTicker() { running = false; }
