// Shadow Line — the hand-in program for the make.fun best stealth game
// bounty. The game itself is plain static files in game/ (an HTML page and
// its ES modules, no libraries and no network requests at run time), and
// this program copies game/ and screenshots/ from beside this file into the
// output directory and writes dossier.json there with the vendored make.fun
// library, so the judge can read the game and its screenshots.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally while building it with a plain static server
// pointed at game/ (for example `npx serve game` or python3 -m http.server).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The entry is the game plus its screenshots; both must be present for the
// dossier to describe a complete, playable entry.
if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — nothing to hand in');
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps, as the kit's gate reads them: only text_max_bytes
// shapes the dossier bytes; the rest refuse an entry the scorer would
// refuse (more than 4 screenshots or one over 256 KiB; more than 993 files
// in game/ or 48 MiB of game files in all; a path under game/ over 1000
// bytes). game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json. The dossier is byte for byte what
// buildDossier writes from the game and screenshots on disk.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
