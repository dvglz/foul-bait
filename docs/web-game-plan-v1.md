# Foul Bait — Web Game Plan

## Context

A casual web game built as a one-time stunt for the NBA playoffs, hosted on **ClutchPlay** (a web games platform). The premise riffs on the genre of NBA stars pulling exaggerated faces to bait fouls (Shai-style bewilderment, Trae's head-snap, Embiid's cosmic disbelief). The player sees an AI-generated caricature face and has to mimic it on their webcam; when the camera detects a close-enough match held for half a second, a whistle blows and the next face appears.

Scored by **total time to clear all 10 faces** — a speedrun. Lower is better. Leaderboard is the social hook; an end-of-run screenshot grid (target caricature + the player's whistle-frame face, side-by-side, 10 cells) is the shareable artifact.

This is a short-lived promotional build. No daily content rotation, no long-tail product. Lean MVP, ship before playoffs, do not over-engineer.

## Scope

**In scope**
- Single-player web game, mobile + desktop browser
- 10 fixed caricatures, hand-authored, never rotated
- Client-side face detection and scoring via MediaPipe FaceLandmarker (blendshapes mode)
- Per-face "hold to whistle" mechanic with visible match meter
- Total run timer, end screen with time + downloadable 10-tile screenshot grid
- All-time leaderboard (top N) via ClutchPlay's auth/leaderboard API

**Out of scope (for v1)**
- ClutchPlay platform integration (auth, leaderboard submission) — built behind a stub, wired up once API is documented
- Auto-stitched MP4 highlight reel (users can screen-record)
- Multiplayer / head-to-head
- Daily-changing face sets
- Server-side scoring or anti-cheat
- Caricature artwork production (sourced separately by an illustrator; dev plan covers integration only)

## Approach

**Stack:** Vite + React + TypeScript. Static build, deployable to any CDN or ClutchPlay's hosting. Zero own backend — ClutchPlay handles leaderboard persistence when integrated.

**Face matching:** MediaPipe FaceLandmarker in **blendshapes mode**. The model returns 52 named expression coefficients (`jawOpen`, `eyeWideLeft`, `browInnerUp`, `mouthPucker`, etc., each 0–1). Each caricature is authored as a sparse target vector of 6–10 dominant blendshapes with per-axis weights. Match score = weighted cosine similarity between live blendshape vector and target vector, clamped to 0–1.

**Whistle trigger:** match score ≥ threshold (start at ~0.85, tune) sustained for 500ms. The 500ms hold is what produces the screenshottable "lock-in" moment. The screenshot grabbed for the end-of-run grid is taken at the exact moment of whistle.

**Architecture (state machine):**
```
intro → camera-permission → countdown → playing(face 1..10) → results
```
- All scoring client-side (privacy + cost)
- Caricature assets = 10 PNGs + `caricatures.json` (target blendshape vectors + weights + threshold overrides per face)
- No skip, no fail — timer simply keeps running until all 10 are whistled

## PoC milestones (build in this order)

### Milestone 1 — Tech feasibility spike (1–2 days)
Goal: prove MediaPipe FaceLandmarker runs reliably in the browser at acceptable latency on a mid-range mobile and gives stable blendshape values.

- Bare Vite + React app
- Webcam permission, video element, FaceLandmarker pipeline
- Live debug overlay: render the 10 most-active blendshapes with bar values, updating ~30fps
- Verify on iOS Safari, Android Chrome, desktop Chrome/Safari

**Verification:** open the app, make exaggerated faces, watch the bars respond. Measurable: blendshape update rate ≥ 24fps on iPhone 12-class device.

### Milestone 2 — Single-face match loop (1–2 days)
Goal: prove the core gameplay feel.

- One placeholder caricature (any image is fine for PoC; final art comes later)
- Hand-authored target blendshape vector for that one face in `caricatures.json`
- Match meter UI (filling bar, 0–100%)
- "Hold for 500ms above threshold → whistle SFX → 'YOU GOT IT' state" loop
- Threshold and hold-time exposed as URL params for tuning

**Verification:** can consistently trigger the whistle within ~3 seconds of trying; doesn't trigger when making unrelated faces. Tune threshold by feel.

### Milestone 3 — Full 10-face run + end screen (2–3 days)
- 10 placeholder caricatures with authored target vectors
- Run-level timer, advance state on each whistle, results screen on face 10
- End screen: total time, "your face vs target" 10-tile grid rendered to an HTML canvas, "Download" button saves PNG
- Capture each whistle-frame webcam still into a hidden canvas for the grid

**Verification:** complete a full run; download the grid; image looks meme-postable. Time is accurate to ±100ms.

### Milestone 4 — Polish & integration stub
- Intro/onboarding screen, camera permission UX, countdown
- Whistle SFX, gentle ambient crowd loop, success/celebrate VO snippet
- Replace placeholder caricatures with final art (when delivered)
- Final tuning pass on per-face thresholds (some faces are intrinsically easier to hit than others)
- ClutchPlay integration layer behind an interface: `submitScore(timeMs)`, `getLeaderboard()`. Stub to localStorage for now; swap to platform API when documented.

**Verification:** full run feels good end to end; cold load → first whistle in under 30s; works on mid-range mobile.

## Critical files

```
foul-bait/
├── index.html
├── package.json
├── vite.config.ts
├── public/
│   ├── caricatures/face-{01..10}.png        # final art, sourced separately
│   └── audio/{whistle,crowd,success}.mp3
├── src/
│   ├── main.tsx
│   ├── App.tsx                              # state machine root
│   ├── game/
│   │   ├── caricatures.json                 # target blendshape vectors + weights + thresholds
│   │   ├── matcher.ts                       # weighted cosine similarity, hold-timer
│   │   └── runState.ts                      # state machine, timer, advance logic
│   ├── face/
│   │   └── faceLandmarker.ts                # MediaPipe wrapper, blendshape stream
│   ├── screens/
│   │   ├── Intro.tsx
│   │   ├── Permission.tsx
│   │   ├── Playing.tsx                      # caricature + webcam + match meter
│   │   └── Results.tsx                      # time, grid render, download
│   ├── capture/
│   │   └── gridRenderer.ts                  # canvas-stitch the 10-tile share image
│   └── platform/
│       └── clutchPlay.ts                    # stub interface for auth + leaderboard
└── docs/
    └── specs/
        └── 2026-05-07-foul-bait-design.md   # copy of this plan, written first
```

## Documentation

First implementation step (before any code): copy this plan's content to `docs/specs/2026-05-07-foul-bait-design.md` in the project repo and commit it, so the spec lives alongside the code. Plan mode currently restricts edits to the plan file; this step is deferred to execution.

## Open items (track but do not block PoC)

- **ClutchPlay API shape** — JS SDK? iframe postMessage? Integration layer is stubbed until documented. User confirmed auth integration can come later.
- **Caricature artwork** — sourced separately. PoC runs on placeholder images; M4 swaps in finals.
- **Per-face threshold tuning** — done by playtest after final art arrives, since the target vectors will be re-authored against the final faces.

## Verification (end-to-end)

1. `npm install && npm run dev`, open localhost on a phone via local network
2. Grant camera permission, start a run
3. Mimic each caricature, get 10 whistles, end on results screen
4. Download the screenshot grid; verify all 10 cells show target + your matching face
5. Run on iOS Safari, Android Chrome, desktop Chrome — match feel and frame rate are acceptable on each
6. Run cold-load timing: first interaction to first whistle < 30s on a mid-range phone
