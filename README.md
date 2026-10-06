# ᲨᲘᲙᲠᲘᲙᲘ

**Tbilisi, 1995. It's a small city, but someone's gotta make the deliveries.**

*Shikriki* is the old Georgian word for a messenger on foot — the boy sent running across the
district with a letter, a loaf, a message that couldn't wait. This is a recreation of the
browser game *Messenger*, rebuilt aspect by aspect in its own style and moved to Tbilisi in
the years after the Soviet Union: the years of power cuts, coupons, generators humming in
courtyards and candles in half the windows. It is playable from the menu to the ending.

---

## The game

A small planet rises out of the ground: Old Tbilisi folded into a ball. The Mtkvari winds
round it in a gorge; on the right bank the old town climbs from the sulfur-bath domes at
Abanotubani to the walls of Narikala, with the Leghvtakhevi waterfall pouring out of the gorge
behind the baths; Sololaki and Vera lean against the Mtatsminda slope, where the funicular
climbs to the television tower and Kartlis Deda stands on the ridge with her sword and her bowl;
Metekhi church stands on its cliff over the water; further round, the five-storey blocks of
Saburtalo, the institute, orchards, a village, and the reservoir everyone calls the Tbilisi Sea.
Washing hangs between the wooden galleries. Pigeons circle. It is dusk, the sun is low over the
western ridge, and some of the windows are lit and some are not.

You are the courier, a kid in a tracksuit with a satchel, and you slept in. Five deliveries
are on the list. You find the people with a mark over their head, you talk, you carry what
they give you to whoever it is for, across the districts, and when all five are done the city
tells you so.

## Controls

| | |
|---|---|
| `W A S D` / arrows, or **drag the left mouse button** | run — the courier runs toward where the pointer is |
| `SHIFT` | sprint |
| `SPACE`, or a quick right-click | jump |
| right-drag, mouse wheel | turn and zoom the camera |
| `E` / `SPACE` / click, next to someone | talk; `SPACE` or the arrow advances a line, `ESC` ends it |
| the four buttons, top right | the delivery list, sound, the wardrobe, the emoji |
| `M` | mute · `ESC` back to the menu |
| phone | first finger steers, second finger turns the camera, a tap jumps |

Serve the folder as its own root and open it. It needs WebGL 2, and nothing from the network.

```bash
python3 -m http.server 8960 --directory "path/to/shikriki"
```

`?timer=1` runs the frame loop on a timer instead of animation frames, for automated
browsers whose pane is hidden; `?low` forces the lighter planet; `?dev` exposes `window._scene`.

## Parity with the original

The brief was: keep every aspect of the original, detail by detail, at the same level, but
different and in our style. These tables are the checklist. Everything in the left columns
was read out of the original's code; everything on the right is what this game does instead.

### The menu

| The original menu | ᲨᲘᲙᲠᲘᲙᲘ |
|---|---|
| A toon-shaded pastel planet with houses, trees, water, cables, a waterfall, birds and clouds, lit by one shadow-casting light | A papercut Old Tbilisi: generated terrain with the Mtkvari and the reservoir, seven districts of instanced houses with wooden galleries, khrushchyovkas, bath domes, three churches, Narikala's wall and towers, the TV tower with its guy wires, the funicular with a car that climbs and descends, laundry lines with washing, the Leghvtakhevi waterfall, plane trees, cypresses and poplars, boiling clouds, pigeons on a flight ring |
| Flat colour + shadow-map cut to two tones, hue-shifted shadow colour | The same two-tone rule, shadow colour turned cooler and darker, plus a stepped speckle of pale grass and rock striations |
| Ink outlines from a second render target (depth, normal, outline mask), broken up by noise | The same two-attachment pipeline; outlines from depth, surface id and normal edges, broken by noise per surface; lines thin with distance |
| A colour LUT grade | A sun-faded print: lifted blacks, warm highlights, slight desaturation, vignette, grain that flickers at eight frames a second |
| Flat teal sky, green haze shell fading in at 1.45 s | Apricot-to-teal dusk gradient brushed warm toward the sun; warm haze shell with the same fresnel-and-noise rule, in at 1.45 s |
| Stars: sprite points with a 16-frame sheet, stepped rotation, fade at 0.5 s, wheel round over 4 s | Poplar fluff and ash: the same point sprite scheme with sixteen hand-scribbled shapes, drifting on warm air, same timings |
| Galaxies: noise-eaten flat cards turning in stepped time, fade in at 2.2 s | The Trialeti ridges and low cloud wisps behind the city, eaten by noise, turning in stepped time, plus the setting sun with a wobbling edge; in at 2.2 s |
| Birds: fifteen in five groups chasing a curve, spring + noise + friction, flapping in the shader, in at 2.7 s | Pigeons: the same simulation and shader flap, on a tilted ring around the planet, in at 2.7 s |
| Nine letter blocks in a 3×3 grid; hover swells a letter (1.05, elastic back); sweeping across flips it half a turn on the axis you crossed with a random elastic period and a rune chime; stepped micro-rotation every ⅓ s; letters pop in from the centre staggered 75 ms with random spin, elastic | Seven letters in 2/3/2, extruded from Noto Sans Georgian Black Mtavruli with painted-enamel sides in seven colours; identical hover, sweep-flip, chime, boil and pop-in rules; a ᲗᲑᲘᲚᲘᲡᲘ · 1995 line pops in after the last letter |
| A 3-D button with "BEGIN" / "ENTER"; mouse hover jolts it (uHover 0.07 s) with a tick; sweeping across turns it a quarter turn with an elastic settle and a clunk while the text wipes out and back in stepped increments staggered across the letters; press squashes to 0.95 with click sounds; pop-in scales from 0 and turns from −π over 3.25 s; on click spins out −2π over 1.5 s with a sound at 0.3 s | A blue enamel street plate, square in section so every quarter turn shows an identical face with its white border and chips; ᲓᲐᲬᲧᲔᲑᲐ / ᲨᲔᲡᲕᲚᲐ in cream with a shadow copy; identical jolt, turn, text wipe, press, pop-in and spin-out rules and timings |
| Planet arrives from y −80 over 2.25 s, scales 0.3→1 over 6.3 s, rolls over once; whoosh at 0.16 s and 1.8 s, letter chime at 2.5 s, button clunk at 3.45 s; interaction unlocks at 3 s | The same timeline to the hundredth of a second |
| Leaving: button spins, orbit stops over 1 s, camera swings −45° and down to phi 1.7 over 2.5 s on a custom curve, dives from 120 to 40 over 2.75 s, rolls −45° over 3.35 s; flash at 1 s, second wipe at 0.85 s, loader at 1.5 s, first wipe lifts over 2 s on the new scene | The same, with the same custom `tweaked` and `inOut1` curves |
| Orbit camera with pointer parallax, auto-rotating once a minute | The same camera, and the sun stays over its right shoulder so the city is always lit from the upper right on screen |
| Two diagonal white wipes, a flash, a dim overlay | The same wipes in paper cream, with a torn edge while they move |
| A hand-drawn envelope boiling in eight frames at eight a second as the loader | A shoti — the canoe-shaped bread from every tone oven — steaming, in eight jittered frames at eight a second |
| Mobile layout: portrait under 700 px zooms the camera 0.8, title 1.2×, button 1.5× and lower | The same, with the title and button scaled to fit the screen's width |

### The city

| The original game | ᲨᲘᲙᲠᲘᲙᲘ |
|---|---|
| A skinned avatar with seven clips — idle, run, sprint, air, three ways of fidgeting when left alone for 30 s — and four clothing slots: 7 hairs, 9 tops, 7 bottoms, 7 shoes | A seventeen-bone papercut puppet with thirteen keyed clips — idle, walk, run, sprint, air, three fidgets after 30 s, and talk, listen, wave, sit, work for the townsfolk — cross-faded, speed-matched, leaning into speed and squashing on landing; four slots: 11 hairs, 12 tops, 8 bottoms, 7 shoes, all 1995 Tbilisi (the tracksuit with stripes, the leather jacket, the kepka, the mullet, the headscarf), saved between visits |
| Capsule physics against a BVH collider: positionForce 0.005, gravity −0.0098, damping 0.92 / 0.65 idle, jumpForce 0.15, sprint ×1.3, auto-step, floor detection | Movement on the planet's own height field: acceleration, damping, gravity along the local up, jump, sprint ×1.37, steps and down-slopes stay on the ground, round obstacles for every building and landmark, wading in the river and the reservoir |
| WASD/arrows, mouse drag toward the pointer, Space / quick right-click to jump, Shift to sprint, touch joystick with a second finger for the camera | The same |
| A follow camera: spherical around the character, right-drag or second finger to turn, kept out of the ground | The same, carried on a parallel-transported frame so it never flips going round the planet; eases round behind the courier while running; kept out of the ground and out of the houses |
| Footsteps looping with the run weight, water footsteps near the sea, jump and land sounds | The same four sound hooks |
| Twenty named townsfolk with idle lines, four placed on walking curves, two animals; the ones with a quest wear an icon that grows when you are close; within 2.5 units they turn to face you; click to talk | Twenty-one people of 1995 Tbilisi — the bank clerk, the director in Sololaki, the man hiding at the baths, the flower seller on Freedom Square, the two doctors, the monk at Mama Daviti, the fisherman at the Tbilisi Sea, Dato the musician at the smelly falls, the sunflower-seed grandmother, the gas-canister man, the girl who has heard of the internet — plus a stray dog and a cat; three walk loops, four sit or work; a "!" tag in the delivery's colour over quest people, bigger when you are close; they turn and look at you within 2.6 units; click, E or Space to talk |
| A dialog box with a coloured name tag, text typed at 35 characters a second with a voice blip per syllable in eight voices, an arrow that pulses when the line is done; Space advances, Escape closes; the box animates in stepped scale with the paper sound | The same box on paper, the same speed, eight synthesised voices, the same keys, the paper loop while it is open |
| Five quests of 2–3 ordered steps, each step a conversation; a card after each step — "next up", "package received", "completed" — with an icon, a colour and a six-second timeout; the item handed over flies into the character's hand in an arc; a chime a second after the last step; progress saved and reset once everything is done | The same engine, the same five shapes: the letter to the director, the postcard and the clean clothes for the man at the baths, the seismic report and 63 boxes of humanitarian macaroni, the grandmother's offering of nazuki and chacha for the monk, the fisherman's letter from the reservoir for Dato; every word in Georgian; the same cards, timings, arcs and chime |
| A checklist of the five quests with a red dot on its button when something changed | The same |
| Nine district titles popping in letter by letter when you walk into their sphere, with a sound | Fourteen districts: Vera, Sololaki, the old town, Freedom Square, Abanotubani, Narikala, Mtatsminda, Avlabari, Metekhi, the Dry Bridge, Saburtalo, the institute, the Tbilisi Sea, the village |
| Six zone ambiences crossfaded by sphere | Five: city, water, forest, sea, wind, crossfaded by district, under a base loop and the music |
| A positional tune at the musician that stops while he talks | Dato's reed tune carries a few streets and stops while he talks |
| Four side buttons in 3-D with a jolt on hover and a squash on press: list, sound, t-shirt, poo | Four paper squares with the same jolt and squash and sounds: the list, the sound, the wardrobe, the emoji |
| Ten emojis in a wheel, popping over the head, spinning, scaled by life, throttled, a sound at each end | Ten signs — a heart, a laugh, a sad face, a question, a bang, a khinkali, a shoti, a candle, a note, a star — the same pop, spin, life, throttle and sounds |
| A customise panel of arrows per slot, with a clothes sound | The wardrobe panel with arrows per slot, a clothes sound and a squash as the look changes |
| An intro of three lines ("Looks like I slept in…") in the dialog box before control is given | The same three lines, in Georgian |
| An end screen — "YOU MADE IT!" — over a dim overlay with a continue underline button | "შენ შეძელი!", the same overlay and continue |
| Escape at a quiet moment returns to the menu through the wipes | The same |

## The style

The world is a sun-faded print of a papercut model. Flat colour with a hard terminator, an ink
line that boils, a grain that flickers. The palette is Tbilisi's: ochre plaster, turquoise and
white galleries, brick domes, tin roofs, dry gold hills, dark cypress, teal river, apricot dusk.
Nothing is textured; everything is drawn by the shaders from noise. The interface is paper:
cream cards with an ink edge that boils at eight frames a second and a flat shadow.

Type is **Noto Sans Georgian** (SIL Open Font License): the Black weight exported to outlines
by `tools/font2glyphs.mjs` and extruded at runtime for the title, the button and the tags over
heads; the Regular and Bold weights for the interface.

## Sound

There are no audio files. `src/audio/synth.js` renders forty-eight sounds into buffers at
start-up, in under half a second:

- the instrument is a **panduri**, the three-string lute of eastern Georgia, made with the
  Karplus–Strong loop; the music is a slow tune in D Dorian over a drone a fifth wide, the way
  Kartlian songs sit on their drone, with a second voice a third below on the answering
  phrases — ten bars, twenty-four seconds, looped;
- Dato's tune is a reed tone, a duduk, wandering a slow melody by the falls;
- the letters are seven rising plucks 75 ms apart; the runes are small bells; the button's
  turn is a latch and a spring; the deliveries are a four-note phrase and a chime;
- eight voices are short vowel blips at eight pitches, one per townsperson;
- footsteps on stone and in water, a jump, a landing, paper handled, cloth, boxes opening;
- the ambiences: traffic and a trolleybus and pigeons; water; wind in the pines with birds;
  waves and gulls; wind on the ridge; and under everything the hum of a generator two streets away.

`M` mutes.

## How it is built

- `main.js` — boot: WebGL check, loader, renderer, controller.
- `src/mainController.js` — which scene is showing, the wipe layer, the two transitions.
- `src/core/` — the event bus, the frame clock, a tween engine with the original's eases,
  pointer tracking, ray-cast mesh interaction, the base and orbit cameras, the scene base
  class, the renderer, saved state.
- `src/render/` — the two-attachment scene composer, the outline and grade pass, the wipe pass,
  the toon material factory and the special materials, and the procedural textures.
- `src/intro/` — the menu: the planet and everything on it, the sky, birds, haze, backdrop,
  specks, lines, waterfall, the title, the button, and the scene with its timeline.
- `src/game/` — the city: the puppet rig and its clip library, the courier and the controls,
  the follow camera, the townsfolk, the quests, the districts, the deliveries and the emoji.
- `src/present/presentScene.js` — the street-level scene that ties them together.
- `src/ui/` — the loader, and the paper interface over the city.
- `src/audio/` — the controller and the synthesiser.
- `tools/` — the glyph exporter, and the bundle dumper used to read the original.

three.js 0.170 is vendored in `vendor/`. Nothing is loaded from the network.
