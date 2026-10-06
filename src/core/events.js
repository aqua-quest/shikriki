// A tiny event bus. Every part of the menu talks through it — the audio controller
// listens for "play_audio", the loader for "toggle_loader", the intro for "resize" —
// so no object needs a reference to another to make it react.

const listeners = new Map();

export const events = {
  on(name, fn, ctx = null, once = false) {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push({ fn, ctx, once });
    return this;
  },
  once(name, fn, ctx = null) { return this.on(name, fn, ctx, true); },
  off(name, fn, ctx = null) {
    const list = listeners.get(name);
    if (!list) return this;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].fn === fn && list[i].ctx === ctx) list.splice(i, 1);
    return this;
  },
  emit(name, ...args) {
    const list = listeners.get(name);
    if (!list || !list.length) return this;
    for (const l of list.slice()) {
      if (l.once) this.off(name, l.fn, l.ctx);
      l.fn.apply(l.ctx, args);
    }
    return this;
  },
};
