// The Quiet Gallery — the bootstrap. One animation frame loop, one fixed
// simulation step, one canvas. The loop reads the input, steps the world,
// and draws it; the title, win and caught screens are states of the same
// world, and ?shot=<name> stages a screenshot scene instead of the title.
import { STEP } from './config.js';
import {
  makeWorld, startGame, nextLevel, retryLevel, stepWorld,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_CAUGHT,
} from './world.js';
import { render } from './render.js';
import { makeInput, attachInput, canvasToWorld } from './input.js';
import { stageShot, shotFromUrl } from './shots.js';
import { unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const world = makeWorld();
const input = makeInput();
attachInput(input, canvas, () => unlockAudio(world.audio));

// The game is sized to the window; the renderer fits the level inside it.
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// A screenshot scene (?shot=cover|sneak|alert|win) stages the world and
// freezes it: the frame is a real render of the live game, not a picture.
const shot = shotFromUrl();
let staged = null;
if (shot) {
  staged = stageShot(shot, world);
}

let last = performance.now();
let acc = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!staged) {
    // Menu keys, read once per frame and cleared.
    if (input.pressed.has('Enter') || input.pressed.has('NumpadEnter')) {
      if (world.screen === SCREEN_TITLE) startGame(world);
      else if (world.screen === SCREEN_WIN) nextLevel(world);
    }
    if (input.pressed.has('KeyR')) {
      if (world.screen !== SCREEN_TITLE) retryLevel(world);
    }
    if (input.pressed.has('KeyN') && world.screen === SCREEN_WIN) {
      nextLevel(world);
    }
    input.pressed.clear();
    // A mouse click is a coin throw, mapped into world pixels.
    let click = null;
    if (input.click && world.screen === SCREEN_PLAY) {
      click = canvasToWorld(input.click.x, input.click.y, canvas.width, canvas.height);
    }
    if (input.click && world.screen === SCREEN_TITLE) startGame(world);
    input.click = null;
    // Fixed steps keep the simulation identical at any frame rate.
    acc += elapsed;
    while (acc >= STEP) {
      stepWorld(world, input.keys, click, STEP);
      click = null;
      acc -= STEP;
    }
  }
  render(ctx, world, canvas.width, canvas.height, now / 1000);
  // The status line, for screen readers: what is happening right now.
  const text = world.screen === SCREEN_TITLE
    ? 'The Quiet Gallery. Press Enter to begin.'
    : world.screen === SCREEN_WIN
      ? 'Clean getaway. Press N for the next wing.'
      : world.screen === SCREEN_CAUGHT
        ? 'Caught. Press R to try again.'
        : `Playing. ${world.loot} of 3 relics. Detection ${Math.round(world.meter)} percent.`;
  if (status.textContent !== text) status.textContent = text;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
