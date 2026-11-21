// The Quiet Gallery — screenshot scenes. The game takes its own pictures
// through ?shot=<name>: each scene sets the world to a real, playable
// state — positions, guard moods, the detection meter — steps the rules
// forward a few ticks so the frame is what a short game really looks like,
// and returns the screen to draw over it. Nothing here is staged art: the
// renderer draws the live world, and the same code draws it for a player.
//
//   ?shot=cover   the cover: mid-game in the hall, the thief crouched
//                 behind a case while a guard's cone sweeps past, a
//                 relic glowing and the exit in view.
//   ?shot=sneak   a near miss: the thief flat in a shadow while a guard
//                 walks past, the detection eye half full.
//   ?shot=alert   the alarm: a guard chasing, the meter full, the thief
//                 breaking for cover.
//   ?shot=win     the clean getaway card after the exit is reached.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_WIN, loadLevel, stepWorld, tileCenter } from './world.js';
import { raiseAlarm, investigate } from './guard.js';

function setPositions(world, playerTile, guardTiles) {
  const p = tileCenter(playerTile[0], playerTile[1]);
  world.player.x = p.x;
  world.player.y = p.y;
  world.guards.forEach((guard, i) => {
    const t = guardTiles[i % guardTiles.length];
    const c = tileCenter(t[0], t[1]);
    guard.x = c.x;
    guard.y = c.y;
    if (t[2] !== undefined) guard.facing = t[2];
  });
}

function runSteps(world, seconds, keys = {}) {
  const empty = { up: false, down: false, left: false, right: false, sneak: false };
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    stepWorld(world, { ...empty, ...keys }, null, STEP);
  }
}

export function stageShot(name, world) {
  loadLevel(world, 0);
  world.screen = SCREEN_PLAY;
  if (name === 'sneak') {
    // The thief flat in the top-left shadow; the West guard walks the
    // wing's edge and has just glimpsed something. The meter sits at
    // half — a near miss, not a catch.
    setPositions(world, [4, 2], [[5, 5, Math.PI / 2], [12, 8, 0], [21, 6, -Math.PI / 2], [10, 11, Math.PI / 2]]);
    world.player.sneaking = true;
    world.player.facingX = 1;
    world.player.facingY = 0;
    investigate(world.guards[0], world.player.x, world.player.y);
    world.meter = 52;
    runSteps(world, 0.5, { sneak: true });
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alert') {
    // The alarm is up: the Hall guard chases the thief across the middle
    // corridor while the thief breaks for the cases. The meter is full.
    setPositions(world, [8, 8], [[5, 8, 0], [5, 3, Math.PI / 2], [21, 10, -Math.PI / 2], [10, 5, Math.PI / 2]]);
    raiseAlarm(world.guards[0], world.player.x, world.player.y);
    world.alarm = true;
    world.meter = 100;
    runSteps(world, 1.2, { right: true });
    world.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    // The getaway: every relic taken, the thief on the exit, the card up.
    for (const artifact of world.levelData.artifacts) artifact.taken = true;
    world.loot = 3;
    const exit = tileCenter(world.levelData.exit.x, world.levelData.exit.y);
    world.player.x = exit.x;
    world.player.y = exit.y;
    world.time = 187;
    world.alarms = 1;
    world.screen = SCREEN_WIN;
    return { screen: SCREEN_WIN };
  }
  // The cover: the thief behind a case in the hall, the Hall guard's cone
  // sweeping the corridor, a relic glowing in the middle wing, the exit
  // lit at the far end. The player has one relic already.
  setPositions(world, [9, 9], [[13, 8, Math.PI], [5, 4, Math.PI / 2], [21, 11, -Math.PI / 2], [10, 6, Math.PI / 2]]);
  world.levelData.artifacts[2].taken = true;
  world.loot = 1;
  world.player.sneaking = true;
  world.player.facingX = 1;
  world.player.facingY = 0;
  runSteps(world, 0.8, { sneak: true, right: true });
  world.screen = SCREEN_PLAY;
  return { screen: SCREEN_PLAY };
}

export function shotFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}
