// The Quiet Gallery — the world. One object holds the whole game: the
// level, the thief, the guards, the detection meter, the loot and the
// screen the player is on (title, play, win, caught). The update step
// moves the player, the guards and the coin, fills or drains the meter,
// and decides when the alarm, the win and the catch happen.
//
// The detection meter is the heart of the game: it fills when any guard
// can see you and drains when none can. A glimpse only makes the nearest
// guard suspicious; a clear look at close range raises the alarm for
// everyone. Break line of sight and the alarm cools down — you always
// get a chance to recover.
import { TILE, STEP, PLAYER, GUARD, DETECT, COIN, GOAL } from './config.js';
import { LEVELS, parseLevel, isSolid } from './levels.js';
import { makeGuard, stepGuard, raiseAlarm, investigate } from './guard.js';
import { makePlayer, stepPlayer, throwCoin, stepCoin } from './player.js';
import {
  makeAudio, unlockAudio, playStep, playAlert, playSuspicious,
  playCoin, playPickup, playUnlock, playWin, playCaught,
} from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

export function tileCenter(x, y) {
  return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
}

// The level data the vision and movement code asks about: solid tiles,
// shadow tiles, and the artifact and exit positions.
export function makeLevelData(level) {
  const parsed = parseLevel(level);
  const data = {
    ...parsed,
    width: level.grid[0].length,
    height: level.grid.length,
    solidAtTile(x, y) {
      return isSolid(data, x, y);
    },
    solidAtPx(px, py) {
      return isSolid(data, Math.floor(px / TILE), Math.floor(py / TILE));
    },
    inShadowAtPx(px, py) {
      const key = `${Math.floor(px / TILE)},${Math.floor(py / TILE)}`;
      return data.shadows.has(key);
    },
  };
  return data;
}

export function makeWorld() {
  return {
    audio: makeAudio(),
    levelIndex: 0,
    levelData: null,
    player: null,
    guards: [],
    screen: SCREEN_TITLE,
    // Detection meter 0..100, shared by every guard's eyes.
    meter: 0,
    alarm: false,
    alarmWasUp: false,
    // Seconds the alarm has been cooling with no guard seeing you.
    calmTime: 0,
    loot: 0,
    time: 0,
    // How many times the alarm went up this level (shown on the win card).
    alarms: 0,
    message: '',
    messageTimer: 0,
    // A coin's ring pulls guards: the world remembers the ringing coin.
    coinRing: null,
    // Best (lowest) time per level, kept in memory for this session.
    bestTimes: {},
  };
}

export function loadLevel(world, index) {
  const level = LEVELS[index % LEVELS.length];
  world.levelIndex = index % LEVELS.length;
  world.levelData = makeLevelData(level);
  const start = tileCenter(world.levelData.start.x, world.levelData.start.y);
  world.player = makePlayer(start);
  world.guards = level.patrols.map((def) => makeGuard(def, tileCenter));
  world.screen = SCREEN_PLAY;
  world.meter = 0;
  world.alarm = false;
  world.alarmWasUp = false;
  world.calmTime = 0;
  world.loot = 0;
  world.time = 0;
  world.alarms = 0;
  world.message = '';
  world.messageTimer = 0;
  world.coinRing = null;
}

export function currentLevel(world) {
  return LEVELS[world.levelIndex];
}

export function artifactsLeft(world) {
  return world.levelData.artifacts.filter((a) => !a.taken).length;
}

export function exitOpen(world) {
  return artifactsLeft(world) === 0;
}

export function showMessage(world, text, seconds = 2.5) {
  world.message = text;
  world.messageTimer = seconds;
}

// Called by a guard when it gets a clear look at close range.
function onSpotted(world, guard, closeness) {
  if (world.alarm) return;
  world.alarm = true;
  world.alarms += 1;
  playAlert(world.audio);
  for (const other of world.guards) {
    if (other !== guard) raiseAlarm(other, world.player.x, world.player.y);
  }
  showMessage(world, 'SPOTTED! Break line of sight!', 2);
}

// Called by a guard when it only glimpses the player at the cone's edge.
function onGlimpse(world, guard, closeness) {
  if (world.alarm) return;
  // The meter does the talking here; the guard just walks over to look.
  if (world.meter >= DETECT.suspiciousAt && world.meter < DETECT.alarmAt) {
    playSuspicious(world.audio);
  }
}

// One fixed step of the game. `keys` is the input state; `click` is a
// pixel position to throw a coin at, or null.
export function stepWorld(world, keys, click, dt = STEP) {
  if (world.screen !== SCREEN_PLAY) return;
  world.time += dt;
  if (world.messageTimer > 0) world.messageTimer -= dt;

  // The player walks, sneaks, and throws coins.
  const walked = stepPlayer(world.player, keys, world.levelData, dt);
  if (walked > 0) {
    world.player.stepAcc += walked;
    const stride = world.player.sneaking ? 26 : 34;
    if (world.player.stepAcc > stride) {
      world.player.stepAcc = 0;
      playStep(world.audio, world.player.sneaking);
      // Running footsteps carry: guards nearby turn toward the noise.
      if (!world.player.sneaking) {
        for (const guard of world.guards) {
          const d = Math.hypot(guard.x - world.player.x, guard.y - world.player.y);
          if (d < GUARD.hearRange && guard.state === 'patrol') {
            investigate(guard, world.player.x, world.player.y);
          }
        }
      }
    }
  }
  if (click) {
    const coin = throwCoin(world.player, click.x, click.y);
    if (coin) playCoin(world.audio);
  }
  const coinState = stepCoin(world.player, world.levelData, dt);
  if (coinState === 'landed') {
    world.coinRing = world.player.thrownCoin;
    for (const guard of world.guards) {
      const d = Math.hypot(guard.x - world.player.thrownCoin.x, guard.y - world.player.thrownCoin.y);
      if (d < GUARD.coinHearRange) investigate(guard, world.player.thrownCoin.x, world.player.thrownCoin.y);
    }
  }
  if (coinState === null) world.coinRing = null;

  // The guards watch, patrol, chase and search.
  const view = {
    levelData: world.levelData,
    player: world.player,
    onSpotted: (guard, closeness) => onSpotted(world, guard, closeness),
    onGlimpse: (guard, closeness) => onGlimpse(world, guard, closeness),
    alarm: world.alarm,
  };
  let anySees = false;
  let bestCloseness = 0;
  for (const guard of world.guards) {
    stepGuard(guard, view, dt);
  }
  // Re-ask who can see the player, to fill or drain the shared meter.
  for (const guard of world.guards) {
    const seen = guardSeeing(world, guard);
    if (seen.seen) {
      anySees = true;
      bestCloseness = Math.max(bestCloseness, seen.closeness);
    }
  }
  if (anySees) {
    let rate = GUARD.detectPerSecond * bestCloseness;
    if (world.levelData.inShadowAtPx(world.player.x, world.player.y)) rate *= PLAYER.shadowFactor;
    if (world.player.sneaking) rate *= PLAYER.sneakFactor;
    if (!world.player.moving) rate *= 0.6;
    world.meter = Math.min(DETECT.alarmAt, world.meter + rate * dt);
    world.calmTime = 0;
  } else {
    world.meter = Math.max(0, world.meter - DETECT.drainPerSecond * dt);
    if (world.alarm) {
      world.calmTime += dt;
      if (world.calmTime > GUARD.calmSeconds) {
        world.alarm = false;
        world.calmTime = 0;
        showMessage(world, 'The alarm dies down. Stay quiet.', 2);
      }
    }
  }
  if (world.meter >= DETECT.suspiciousAt && !world.alarmWasUp && world.meter < DETECT.alarmAt) {
    world.alarmWasUp = true;
  }
  if (world.meter < DETECT.suspiciousAt) world.alarmWasUp = false;

  // Picking up relics.
  for (const artifact of world.levelData.artifacts) {
    if (artifact.taken) continue;
    const c = tileCenter(artifact.x, artifact.y);
    if (Math.hypot(world.player.x - c.x, world.player.y - c.y) < 24) {
      artifact.taken = true;
      world.loot += 1;
      playPickup(world.audio);
      if (exitOpen(world)) {
        playUnlock(world.audio);
        showMessage(world, 'All relics taken — the exit is open!', 3);
      } else {
        showMessage(world, `Relic ${world.loot} of ${GOAL.artifactsToWin} taken.`, 2);
      }
    }
  }

  // The exit: locked until every relic is taken.
  const exit = tileCenter(world.levelData.exit.x, world.levelData.exit.y);
  if (Math.hypot(world.player.x - exit.x, world.player.y - exit.y) < 26) {
    if (exitOpen(world)) {
      world.screen = SCREEN_WIN;
      playWin(world.audio);
      const key = currentLevel(world).name;
      if (!world.bestTimes[key] || world.time < world.bestTimes[key]) {
        world.bestTimes[key] = world.time;
      }
    } else if (world.messageTimer <= 0) {
      showMessage(world, `Locked — take all ${GOAL.artifactsToWin} relics first.`, 2);
    }
  }

  // Caught: a guard in alarm (or any guard at all) touches the thief.
  for (const guard of world.guards) {
    if (Math.hypot(guard.x - world.player.x, guard.y - world.player.y) < GUARD.radius + PLAYER.radius - 2) {
      world.screen = SCREEN_CAUGHT;
      playCaught(world.audio);
      break;
    }
  }
}

// Does this guard see the player right now? (Used for the shared meter;
// stepGuard already ran the same question for its own decisions.)
import { canSee } from './vision.js';
function guardSeeing(world, guard) {
  return canSee(world.levelData, guard, world.player, GUARD.viewRange, GUARD.viewHalfAngle);
}

// Start (or restart) the game from the title screen.
export function startGame(world) {
  unlockAudio(world.audio);
  loadLevel(world, world.levelIndex);
}

export function nextLevel(world) {
  unlockAudio(world.audio);
  loadLevel(world, world.levelIndex + 1);
}

export function retryLevel(world) {
  unlockAudio(world.audio);
  loadLevel(world, world.levelIndex);
}
