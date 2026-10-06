// Saved state, in localStorage under one key. Today it only remembers whether a game
// was ever started, which changes the button from "begin" to "enter".

const KEY = 'shikriki_data';
let data = {};
try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { data = {}; }

export const storage = {
  get(k) { return data[k]; },
  set(k, v) { data[k] = v; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} },
  clear() { data = {}; try { localStorage.removeItem(KEY); } catch {} },
};
