// The Quiet Gallery — the hand-in program (Node 22, standard library
// only). It copies the game (game/) and its screenshots (screenshots/)
// from beside this file into /output — or $MAKEFUN_OUTPUT_DIR outside the
// grader — and writes /output/dossier.json, the summary the judge reads,
// with the kit's vendored library (vendor/makefun-game.ts, unchanged).
// Run it with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Refuse early, with a plain message, when the entry is not complete:
// the game must exist, its entry page must be present, and every
// screenshot must be a JPEG or PNG within the scorer's 256 KiB cap.
const gameDir = join(here, 'game');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing: the entry has no game to hand in');
}
const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  for (const name of readdirSync(shotsDir)) {
    const file = join(shotsDir, name);
    if (!/\.(png|jpe?g)$/i.test(name)) throw new Error(`screenshots/${name} is not a PNG or JPEG`);
    if (statSync(file).size > 262144) throw new Error(`screenshots/${name} is over the 256 KiB cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json). Only
// text_max_bytes shapes the dossier's bytes; the rest make this program
// refuse exactly where the scorer would — more than 4 screenshots or one
// over 256 KiB, more than 993 files in game/ or 48 MiB of game files, or
// a path under game/ over 1000 bytes.
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Read the dossier back and check it parses: a hand-in that cannot be
// read is no hand-in at all.
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
if (dossier.schema !== 'makefun/dossier/v1') {
  throw new Error(`dossier.json has unexpected schema ${dossier.schema}`);
}
console.log(`handed in ${dossier.images.length} screenshots, ${dossier.text.length} bytes of source outline`);

