[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/hibikazen/makefun-best-stealth-game-20261121-1759/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/hibikazen/makefun-best-stealth-game-20261121-1759/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

# Shadow Line

A top-down stealth game for the [make.fun best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759). Sneak through three guarded compounds, stay out of the guards' vision cones, and reach the glowing green exit unseen.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with any static server). No build step, no network requests, no external assets — everything is drawn on canvas.

- **WASD / arrow keys** — move
- **Shift** — run (faster, but loud: guards hear your footsteps)
- **C** — crouch (slow and quiet, harder to spot)
- **P** — pause, **R** — restart the level

Guards patrol routes you can learn. Their yellow vision cones fill a detection meter while they can see you — break line of sight behind a crate or in a bush and the meter drains, giving you a chance to recover. A full meter means the guard chases you; being touched means caught. Bushes hide you, crates block sight, and shadow floor slows detection. Three levels, a timer, and a rating (Ghost / Shadow / Rookie) when you escape.

## Files

- `game/` — the game itself (`index.html` + ES modules in `src/`)
- `screenshots/` — gameplay screenshots taken with Playwright
- `main.ts` — the make.fun hand-in program (copies `game/` + `screenshots/` and writes `dossier.json`)
- `vendor/makefun-game.ts` — the vendored make.fun dossier library
