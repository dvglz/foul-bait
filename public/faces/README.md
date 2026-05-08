# Reference face photos

One JPG per caricature. Currently `Frame1.jpg`–`Frame10.jpg`; they map by index to entries in `src/game/caricatures.ts`.

## Framing rules

- **Square**, ~512–1024px on the long edge.
- **Face fills 60–80% of the frame**, forehead to chin and ear to ear visible.
- **Upright** — head within ~10° of vertical. MediaPipe blendshapes drift fast with roll.
- **Roughly facing camera** — yaw under ~20°. No profile shots.
- **Even, frontal lighting** — no harsh side shadow across one eye.
- **Hold the peak of the expression** with eyes open (unless the expression itself is a squint).

## Crop out NBA chrome

Tight crop on the face only:

- **No headband** — crop above the brow if the headband intrudes.
- **No jersey, collar, or shoulder logos** — crop at the neck/jawline.
- **No team-color background** — neutral or blurred is fine.

## Workflow

1. Drop the JPG in this folder.
2. `npm run dev`, then open `?extract=1` in the browser.
3. Drag the same JPG onto the page; verify the landmark dots overlay the face cleanly.
4. Copy the snippet into `src/game/caricatures.ts`.
5. Tune `activeKeys` (3–5 highest-signal blendshapes) and add `overrides` only if the extracted value clearly underrepresents the expression.
