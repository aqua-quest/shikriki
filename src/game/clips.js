// The animation library, written as keyframed poses on the puppet's bones.
//
// A clip is a list of keys; each key gives a time in seconds and, for any bone it cares
// to move, an [x, y, z] rotation in degrees (and optionally `root` for the hips' vertical
// bob). Bones a key leaves out hold their rest pose. The animator converts every key to
// quaternions once and slerps between them, so the motion is smooth however few keys a
// clip has. This is the set the original ships for its avatar — idle, walk, run, sprint,
// air, three ways of fidgeting when left alone — plus the ones its townsfolk use: talk,
// listen, and a wave for good measure.

// bone names: hips, spine, chest, neck, head, armL, forearmL, handL, armR, forearmR, handR,
//             legL, shinL, footL, legR, shinR, footR

const idle = {
  name: 'idle', duration: 2.6, loop: true,
  keys: [
    { t: 0.0, root: 0, spine: [1, 0, 1], chest: [1, 0, 0], head: [0, -4, 0], armL: [3, 0, 6], armR: [3, 0, -6], forearmL: [-8, 0, 0], forearmR: [-8, 0, 0] },
    { t: 1.3, root: -0.006, spine: [2, 0, -1], chest: [2.5, 0, 0], head: [2, 5, 0], armL: [5, 0, 7], armR: [5, 0, -7], forearmL: [-10, 0, 0], forearmR: [-10, 0, 0] },
    { t: 2.6, root: 0, spine: [1, 0, 1], chest: [1, 0, 0], head: [0, -4, 0], armL: [3, 0, 6], armR: [3, 0, -6], forearmL: [-8, 0, 0], forearmR: [-8, 0, 0] },
  ],
};

const walk = {
  name: 'walk', duration: 1.0, loop: true,
  keys: [
    { t: 0.00, root: 0.01, spine: [4, 4, 0], chest: [2, 0, 0], head: [0, -3, 0], legL: [-28, 0, 0], shinL: [8, 0, 0], footL: [6, 0, 0], legR: [26, 0, 0], shinR: [4, 0, 0], footR: [-4, 0, 0], armL: [22, 0, 5], forearmL: [-20, 0, 0], armR: [-24, 0, -5], forearmR: [-32, 0, 0] },
    { t: 0.25, root: -0.015, spine: [5, 0, 1], legL: [2, 0, 0], shinL: [46, 0, 0], footL: [10, 0, 0], legR: [4, 0, 0], shinR: [2, 0, 0], footR: [0, 0, 0], armL: [0, 0, 5], forearmL: [-26, 0, 0], armR: [0, 0, -5], forearmR: [-26, 0, 0] },
    { t: 0.50, root: 0.01, spine: [4, -4, 0], chest: [2, 0, 0], head: [0, 3, 0], legL: [26, 0, 0], shinL: [4, 0, 0], footL: [-4, 0, 0], legR: [-28, 0, 0], shinR: [8, 0, 0], footR: [6, 0, 0], armL: [-24, 0, 5], forearmL: [-32, 0, 0], armR: [22, 0, -5], forearmR: [-20, 0, 0] },
    { t: 0.75, root: -0.015, spine: [5, 0, -1], legL: [4, 0, 0], shinL: [2, 0, 0], footL: [0, 0, 0], legR: [2, 0, 0], shinR: [46, 0, 0], footR: [10, 0, 0], armL: [0, 0, 5], forearmL: [-26, 0, 0], armR: [0, 0, -5], forearmR: [-26, 0, 0] },
    { t: 1.00, root: 0.01, spine: [4, 4, 0], chest: [2, 0, 0], head: [0, -3, 0], legL: [-28, 0, 0], shinL: [8, 0, 0], footL: [6, 0, 0], legR: [26, 0, 0], shinR: [4, 0, 0], footR: [-4, 0, 0], armL: [22, 0, 5], forearmL: [-20, 0, 0], armR: [-24, 0, -5], forearmR: [-32, 0, 0] },
  ],
};

const run = {
  name: 'run', duration: 0.62, loop: true,
  keys: [
    { t: 0.000, root: 0.02, spine: [14, 6, 0], chest: [4, 0, 0], head: [-6, -2, 0], legL: [-44, 0, 0], shinL: [14, 0, 0], footL: [10, 0, 0], legR: [38, 0, 0], shinR: [20, 0, 0], footR: [-8, 0, 0], armL: [40, 0, 8], forearmL: [-70, 0, 0], armR: [-48, 0, -8], forearmR: [-80, 0, 0] },
    { t: 0.155, root: -0.03, spine: [15, 0, 2], legL: [-6, 0, 0], shinL: [78, 0, 0], footL: [18, 0, 0], legR: [10, 0, 0], shinR: [4, 0, 0], footR: [2, 0, 0], armL: [-4, 0, 8], forearmL: [-80, 0, 0], armR: [-4, 0, -8], forearmR: [-80, 0, 0] },
    { t: 0.310, root: 0.02, spine: [14, -6, 0], chest: [4, 0, 0], head: [-6, 2, 0], legL: [38, 0, 0], shinL: [20, 0, 0], footL: [-8, 0, 0], legR: [-44, 0, 0], shinR: [14, 0, 0], footR: [10, 0, 0], armL: [-48, 0, 8], forearmL: [-80, 0, 0], armR: [40, 0, -8], forearmR: [-70, 0, 0] },
    { t: 0.465, root: -0.03, spine: [15, 0, -2], legL: [10, 0, 0], shinL: [4, 0, 0], footL: [2, 0, 0], legR: [-6, 0, 0], shinR: [78, 0, 0], footR: [18, 0, 0], armL: [-4, 0, 8], forearmL: [-80, 0, 0], armR: [-4, 0, -8], forearmR: [-80, 0, 0] },
    { t: 0.620, root: 0.02, spine: [14, 6, 0], chest: [4, 0, 0], head: [-6, -2, 0], legL: [-44, 0, 0], shinL: [14, 0, 0], footL: [10, 0, 0], legR: [38, 0, 0], shinR: [20, 0, 0], footR: [-8, 0, 0], armL: [40, 0, 8], forearmL: [-70, 0, 0], armR: [-48, 0, -8], forearmR: [-80, 0, 0] },
  ],
};

const sprint = {
  name: 'sprint', duration: 0.5, loop: true,
  keys: [
    { t: 0.000, root: 0.03, spine: [22, 8, 0], chest: [6, 0, 0], head: [-10, -2, 0], legL: [-54, 0, 0], shinL: [18, 0, 0], footL: [14, 0, 0], legR: [46, 0, 0], shinR: [26, 0, 0], footR: [-10, 0, 0], armL: [52, 0, 10], forearmL: [-84, 0, 0], armR: [-58, 0, -10], forearmR: [-92, 0, 0] },
    { t: 0.125, root: -0.04, spine: [24, 0, 3], legL: [-10, 0, 0], shinL: [92, 0, 0], footL: [22, 0, 0], legR: [14, 0, 0], shinR: [6, 0, 0], footR: [4, 0, 0], armL: [-6, 0, 10], forearmL: [-92, 0, 0], armR: [-6, 0, -10], forearmR: [-92, 0, 0] },
    { t: 0.250, root: 0.03, spine: [22, -8, 0], chest: [6, 0, 0], head: [-10, 2, 0], legL: [46, 0, 0], shinL: [26, 0, 0], footL: [-10, 0, 0], legR: [-54, 0, 0], shinR: [18, 0, 0], footR: [14, 0, 0], armL: [-58, 0, 10], forearmL: [-92, 0, 0], armR: [52, 0, -10], forearmR: [-84, 0, 0] },
    { t: 0.375, root: -0.04, spine: [24, 0, -3], legL: [14, 0, 0], shinL: [6, 0, 0], footL: [4, 0, 0], legR: [-10, 0, 0], shinR: [92, 0, 0], footR: [22, 0, 0], armL: [-6, 0, 10], forearmL: [-92, 0, 0], armR: [-6, 0, -10], forearmR: [-92, 0, 0] },
    { t: 0.500, root: 0.03, spine: [22, 8, 0], chest: [6, 0, 0], head: [-10, -2, 0], legL: [-54, 0, 0], shinL: [18, 0, 0], footL: [14, 0, 0], legR: [46, 0, 0], shinR: [26, 0, 0], footR: [-10, 0, 0], armL: [52, 0, 10], forearmL: [-84, 0, 0], armR: [-58, 0, -10], forearmR: [-92, 0, 0] },
  ],
};

// in the air: legs tucked, arms out, a little lean back, held with a slow float
const air = {
  name: 'air', duration: 1.2, loop: true,
  keys: [
    { t: 0.0, root: 0, spine: [-6, 0, 0], chest: [-4, 0, 0], head: [6, 0, 0], legL: [-30, 0, 0], shinL: [50, 0, 0], footL: [20, 0, 0], legR: [18, 0, 0], shinR: [62, 0, 0], footR: [24, 0, 0], armL: [-20, 0, 55], forearmL: [-30, 0, 0], armR: [-20, 0, -55], forearmR: [-30, 0, 0] },
    { t: 0.6, root: 0, spine: [-4, 0, 0], chest: [-3, 0, 0], head: [4, 0, 0], legL: [-24, 0, 0], shinL: [44, 0, 0], footL: [16, 0, 0], legR: [22, 0, 0], shinR: [56, 0, 0], footR: [20, 0, 0], armL: [-24, 0, 62], forearmL: [-26, 0, 0], armR: [-24, 0, -62], forearmR: [-26, 0, 0] },
    { t: 1.2, root: 0, spine: [-6, 0, 0], chest: [-4, 0, 0], head: [6, 0, 0], legL: [-30, 0, 0], shinL: [50, 0, 0], footL: [20, 0, 0], legR: [18, 0, 0], shinR: [62, 0, 0], footR: [24, 0, 0], armL: [-20, 0, 55], forearmL: [-30, 0, 0], armR: [-20, 0, -55], forearmR: [-30, 0, 0] },
  ],
};

// left alone, one: a look around with the hands on the hips
const afk1 = {
  name: 'afk1', duration: 4.0, loop: false,
  keys: [
    { t: 0.0, spine: [1, 0, 0], head: [0, 0, 0], armL: [3, 0, 6], armR: [3, 0, -6], forearmL: [-8, 0, 0], forearmR: [-8, 0, 0] },
    { t: 0.6, spine: [2, 6, 0], head: [-4, 40, 0], armL: [10, 0, 62], armR: [10, 0, -62], forearmL: [-110, 0, 20], forearmR: [-110, 0, -20] },
    { t: 1.8, spine: [2, 6, 0], head: [-4, 42, 0], armL: [10, 0, 62], armR: [10, 0, -62], forearmL: [-110, 0, 20], forearmR: [-110, 0, -20] },
    { t: 2.4, spine: [2, -6, 0], head: [-4, -44, 0], armL: [10, 0, 62], armR: [10, 0, -62], forearmL: [-110, 0, 20], forearmR: [-110, 0, -20] },
    { t: 3.3, spine: [2, -6, 0], head: [-4, -40, 0], armL: [10, 0, 62], armR: [10, 0, -62], forearmL: [-110, 0, 20], forearmR: [-110, 0, -20] },
    { t: 4.0, spine: [1, 0, 0], head: [0, 0, 0], armL: [3, 0, 6], armR: [3, 0, -6], forearmL: [-8, 0, 0], forearmR: [-8, 0, 0] },
  ],
};

// two: a stretch, arms up, back arched, then a shake out
const afk2 = {
  name: 'afk2', duration: 4.0, loop: false,
  keys: [
    { t: 0.0, spine: [1, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], armL: [3, 0, 6], armR: [3, 0, -6], forearmL: [-8, 0, 0], forearmR: [-8, 0, 0] },
    { t: 0.9, spine: [-10, 0, 0], chest: [-8, 0, 0], head: [-18, 0, 0], armL: [-160, 0, 20], armR: [-160, 0, -20], forearmL: [-20, 0, 0], forearmR: [-20, 0, 0] },
    { t: 2.0, spine: [-12, 0, 0], chest: [-9, 0, 0], head: [-20, 0, 0], armL: [-165, 0, 25], armR: [-165, 0, -25], forearmL: [-15, 0, 0], forearmR: [-15, 0, 0] },
    { t: 2.6, spine: [4, 0, 0], chest: [2, 0, 0], head: [6, 0, 0], armL: [10, 0, 30], armR: [10, 0, -30], forearmL: [-20, 0, 0], forearmR: [-20, 0, 0] },
    { t: 2.9, spine: [4, 0, -3], armL: [10, 0, 40], armR: [10, 0, -40] },
    { t: 3.2, spine: [4, 0, 3], armL: [10, 0, 30], armR: [10, 0, -30] },
    { t: 4.0, spine: [1, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], armL: [3, 0, 6], armR: [3, 0, -6], forearmL: [-8, 0, 0], forearmR: [-8, 0, 0] },
  ],
};

// three: a scratch of the head and a shift of weight, foot tapping
const afk3 = {
  name: 'afk3', duration: 4.2, loop: false,
  keys: [
    { t: 0.0, spine: [1, 0, 0], head: [0, 0, 0], armR: [3, 0, -6], forearmR: [-8, 0, 0], handR: [0, 0, 0], legL: [0, 0, 0], footL: [0, 0, 0] },
    { t: 0.7, spine: [2, 0, -4], head: [8, 0, -10], armR: [-40, 0, -70], forearmR: [-125, 0, -30], handR: [-20, 0, 0], legL: [-8, 0, 0], footL: [-16, 0, 0] },
    { t: 1.1, spine: [2, 0, -4], head: [10, 0, -12], armR: [-44, 0, -72], forearmR: [-120, 0, -30], footL: [0, 0, 0] },
    { t: 1.5, spine: [2, 0, -4], head: [8, 0, -10], armR: [-40, 0, -70], forearmR: [-125, 0, -30], footL: [-16, 0, 0] },
    { t: 1.9, spine: [2, 0, -4], head: [10, 0, -12], armR: [-44, 0, -72], forearmR: [-120, 0, -30], footL: [0, 0, 0] },
    { t: 2.3, spine: [2, 0, -4], head: [8, 0, -10], armR: [-40, 0, -70], forearmR: [-125, 0, -30], footL: [-16, 0, 0] },
    { t: 3.0, spine: [2, 0, 3], head: [0, 0, 6], armR: [3, 0, -6], forearmR: [-8, 0, 0], handR: [0, 0, 0], legL: [0, 0, 0], footL: [0, 0, 0] },
    { t: 4.2, spine: [1, 0, 0], head: [0, 0, 0], armR: [3, 0, -6], forearmR: [-8, 0, 0] },
  ],
};

// talking: hands that move with the words, a nod
const talk = {
  name: 'talk', duration: 2.0, loop: true,
  keys: [
    { t: 0.0, spine: [2, 0, 0], head: [2, 0, 0], armL: [3, 0, 6], forearmL: [-8, 0, 0], armR: [-20, 0, -14], forearmR: [-70, 0, -10], handR: [-10, 0, 0] },
    { t: 0.5, spine: [3, 3, 0], head: [-3, 5, 0], armL: [-10, 0, 10], forearmL: [-60, 0, 10], armR: [-36, 0, -20], forearmR: [-80, 0, -10], handR: [10, 0, 0] },
    { t: 1.0, spine: [2, -2, 0], head: [4, -4, 0], armL: [-20, 0, 14], forearmL: [-75, 0, 10], armR: [-12, 0, -12], forearmR: [-60, 0, -10], handR: [-10, 0, 0] },
    { t: 1.5, spine: [3, 2, 0], head: [-2, 3, 0], armL: [-6, 0, 8], forearmL: [-40, 0, 6], armR: [-40, 0, -24], forearmR: [-90, 0, -12], handR: [12, 0, 0] },
    { t: 2.0, spine: [2, 0, 0], head: [2, 0, 0], armL: [3, 0, 6], forearmL: [-8, 0, 0], armR: [-20, 0, -14], forearmR: [-70, 0, -10], handR: [-10, 0, 0] },
  ],
};

// listening: a small nod now and then, hands clasped
const idleTalk = {
  name: 'idleTalk', duration: 3.0, loop: true,
  keys: [
    { t: 0.0, spine: [2, 0, 0], head: [4, 0, 0], armL: [8, 0, 8], forearmL: [-80, 30, 0], armR: [8, 0, -8], forearmR: [-80, -30, 0] },
    { t: 1.2, spine: [2, 0, 0], head: [10, 3, 0], armL: [8, 0, 8], forearmL: [-80, 30, 0], armR: [8, 0, -8], forearmR: [-80, -30, 0] },
    { t: 1.6, spine: [2, 0, 0], head: [3, 3, 0], armL: [8, 0, 8], forearmL: [-80, 30, 0], armR: [8, 0, -8], forearmR: [-80, -30, 0] },
    { t: 3.0, spine: [2, 0, 0], head: [4, 0, 0], armL: [8, 0, 8], forearmL: [-80, 30, 0], armR: [8, 0, -8], forearmR: [-80, -30, 0] },
  ],
};

// a wave, for the people who greet you
const wave = {
  name: 'wave', duration: 1.6, loop: true,
  keys: [
    { t: 0.0, head: [0, 0, 0], armR: [-150, 0, -30], forearmR: [-30, 0, 20], handR: [0, 0, 0] },
    { t: 0.4, head: [0, 0, 4], armR: [-155, 0, -40], forearmR: [-20, 0, 35], handR: [0, 0, 10] },
    { t: 0.8, head: [0, 0, 0], armR: [-150, 0, -30], forearmR: [-30, 0, 5], handR: [0, 0, -10] },
    { t: 1.2, head: [0, 0, -4], armR: [-155, 0, -40], forearmR: [-20, 0, 35], handR: [0, 0, 10] },
    { t: 1.6, head: [0, 0, 0], armR: [-150, 0, -30], forearmR: [-30, 0, 20], handR: [0, 0, 0] },
  ],
};

// sitting, for the ones on the steps and the walls
const sit = {
  name: 'sit', duration: 3.0, loop: true,
  keys: [
    { t: 0.0, root: -0.2, spine: [8, 0, 0], head: [-4, 0, 0], legL: [-88, 6, 0], shinL: [90, 0, 0], footL: [10, 0, 0], legR: [-88, -6, 0], shinR: [90, 0, 0], footR: [10, 0, 0], armL: [-20, 0, 8], forearmL: [-60, 10, 0], armR: [-20, 0, -8], forearmR: [-60, -10, 0] },
    { t: 1.5, root: -0.2, spine: [9, 0, 0], head: [-2, 6, 0], legL: [-88, 6, 0], shinL: [90, 0, 0], footL: [10, 0, 0], legR: [-88, -6, 0], shinR: [90, 0, 0], footR: [10, 0, 0], armL: [-22, 0, 8], forearmL: [-62, 10, 0], armR: [-22, 0, -8], forearmR: [-62, -10, 0] },
    { t: 3.0, root: -0.2, spine: [8, 0, 0], head: [-4, 0, 0], legL: [-88, 6, 0], shinL: [90, 0, 0], footL: [10, 0, 0], legR: [-88, -6, 0], shinR: [90, 0, 0], footR: [10, 0, 0], armL: [-20, 0, 8], forearmL: [-60, 10, 0], armR: [-20, 0, -8], forearmR: [-60, -10, 0] },
  ],
};

// working with the hands: kneading, hammering, strumming
const work = {
  name: 'work', duration: 1.2, loop: true,
  keys: [
    { t: 0.0, spine: [12, 0, 0], head: [10, 0, 0], armL: [-50, 0, 10], forearmL: [-60, 0, 0], armR: [-50, 0, -10], forearmR: [-60, 0, 0] },
    { t: 0.3, spine: [14, 0, 0], head: [12, 0, 0], armL: [-40, 0, 10], forearmL: [-90, 0, 0], armR: [-60, 0, -10], forearmR: [-40, 0, 0] },
    { t: 0.6, spine: [12, 0, 0], head: [10, 0, 0], armL: [-60, 0, 10], forearmL: [-40, 0, 0], armR: [-40, 0, -10], forearmR: [-90, 0, 0] },
    { t: 0.9, spine: [14, 0, 0], head: [12, 0, 0], armL: [-40, 0, 10], forearmL: [-90, 0, 0], armR: [-60, 0, -10], forearmR: [-40, 0, 0] },
    { t: 1.2, spine: [12, 0, 0], head: [10, 0, 0], armL: [-50, 0, 10], forearmL: [-60, 0, 0], armR: [-50, 0, -10], forearmR: [-60, 0, 0] },
  ],
};

export const CLIPS = { idle, walk, run, sprint, air, afk1, afk2, afk3, talk, idleTalk, wave, sit, work };
