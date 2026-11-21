// The Quiet Gallery — the guards. A guard is a state machine with four
// moods, and the player can read every one of them from how it moves and
// what colour its cone is:
//
//   patrol      walks its waypoints, yellow cone, calm.
//   suspicious  something caught its eye (or ear): walks to the spot,
//               orange cone, looks around, then goes back to patrol.
//   alert       it knows where you are: chases, red cone, and the alarm
//               is up until you break line of sight for a while.
//   search      it lost you mid-chase: stands at your last seen spot and
//               scans, then gives up and returns to patrol.
//
// The guard never teleports and never sees through walls: every decision
// goes through vision.js. And it never walks through a wall either: when
// it has somewhere to go, it follows a path of open tiles (breadth-first
// search over the level grid), not a straight line.
import { GUARD, TILE } from './config.js';
import { canSee } from './vision.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_ALERT = 'alert';
export const STATE_SEARCH = 'search';

// A guard is made from a patrol definition: waypoints in tile units and a
// speed multiplier. Position is in pixels, centred on the first waypoint.
export function makeGuard(def, tileToPx) {
  const [sx, sy] = def.points[0];
  const [tx, ty] = def.points[1] || def.points[0];
  return {
    name: def.name,
    points: def.points.map(([x, y]) => tileToPx(x, y)),
    pointIndex: 1,
    x: tileToPx(sx, sy).x,
    y: tileToPx(sx, sy).y,
    facing: Math.atan2(ty - sy, tx - sx),
    state: STATE_PATROL,
    speedMul: def.speed || 1,
    // Where the guard is heading when it is not patrolling.
    targetX: null,
    targetY: null,
    // The tile path it is following to that target, and how long until
    // the path is recomputed (the player keeps moving).
    path: null,
    pathTimer: 0,
    // Seconds spent standing at a searched spot, and seconds since the
    // guard last had line of sight while the alarm is up.
    searchTimer: 0,
    calmTimer: 0,
    // The last place the guard saw (or heard) the player.
    lastSeenX: null,
    lastSeenY: null,
  };
}

// Breadth-first search over the level's open tiles, from the guard's tile
// to the target tile. Returns a list of pixel centres to walk through
// (not including the guard's own tile), or null when there is no route.
export function findPath(levelData, fromX, fromY, toX, toY) {
  const start = { x: Math.floor(fromX / TILE), y: Math.floor(fromY / TILE) };
  const goal = { x: Math.floor(toX / TILE), y: Math.floor(toY / TILE) };
  if (start.x === goal.x && start.y === goal.y) return [];
  const key = (x, y) => `${x},${y}`;
  const cameFrom = new Map();
  const queue = [start];
  cameFrom.set(key(start.x, start.y), null);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === goal.x && cur.y === goal.y) break;
    const neighbours = [
      [cur.x + 1, cur.y], [cur.x - 1, cur.y],
      [cur.x, cur.y + 1], [cur.x, cur.y - 1],
    ];
    for (const [nx, ny] of neighbours) {
      if (cameFrom.has(key(nx, ny))) continue;
      if (levelData.solidAtTile(nx, ny)) continue;
      cameFrom.set(key(nx, ny), cur);
      queue.push({ x: nx, y: ny });
    }
  }
  if (!cameFrom.has(key(goal.x, goal.y))) return null;
  const tiles = [];
  let cur = goal;
  while (cur) {
    tiles.push(cur);
    cur = cameFrom.get(key(cur.x, cur.y));
  }
  tiles.reverse();
  tiles.shift();
  return tiles.map((t) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 }));
}

// Move toward (tx, ty) at speed, turning to face the direction of travel.
// Returns true when the guard arrives (within 2px).
export function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  return dist - step < 2;
}

// Follow the guard's tile path toward its target. Recomputes the path
// when it runs out or when `repath` seconds have passed. Returns true
// when the guard arrives at the target.
function followPath(guard, levelData, speed, dt, repath) {
  guard.pathTimer -= dt;
  if (!guard.path || guard.pathTimer <= 0) {
    guard.path = findPath(levelData, guard.x, guard.y, guard.targetX, guard.targetY);
    guard.pathTimer = repath;
  }
  if (!guard.path) {
    // No route (should not happen on a connected level): walk straight.
    return moveToward(guard, guard.targetX, guard.targetY, speed, dt);
  }
  if (guard.path.length === 0) {
    // Already on the target's tile: walk straight to the exact spot.
    return moveToward(guard, guard.targetX, guard.targetY, speed, dt);
  }
  const next = guard.path[0];
  if (moveToward(guard, next.x, next.y, speed, dt)) guard.path.shift();
  return guard.path.length === 0;
}

// Tell a guard to go and look at (x, y) — a noise, a glimpse, a coin.
export function investigate(guard, x, y) {
  if (guard.state === STATE_ALERT) return;
  guard.state = STATE_SUSPICIOUS;
  guard.targetX = x;
  guard.targetY = y;
  guard.path = null;
  guard.pathTimer = 0;
  guard.searchTimer = 0;
}

// The alarm goes up: every guard chases the player's position.
export function raiseAlarm(guard, x, y) {
  guard.state = STATE_ALERT;
  guard.targetX = x;
  guard.targetY = y;
  guard.lastSeenX = x;
  guard.lastSeenY = y;
  guard.path = null;
  guard.pathTimer = 0;
  guard.calmTimer = 0;
}

// One simulation step for one guard. `world` carries the level, the player
// and the shared detection meter; the guard reads them and may change the
// meter's fate (world.alarm is set by world.js, not here).
export function stepGuard(guard, world, dt) {
  const seen = canSee(
    world.levelData, guard, world.player, GUARD.viewRange, GUARD.viewHalfAngle,
  );
  if (seen.seen) {
    guard.lastSeenX = world.player.x;
    guard.lastSeenY = world.player.y;
    if (seen.closeness > 0.55) {
      // A clear look at close range: the guard knows, and so does everyone.
      raiseAlarm(guard, world.player.x, world.player.y);
      world.onSpotted(guard, seen.closeness);
    } else {
      // A glimpse at the cone's edge: walk over and check it out.
      investigate(guard, world.player.x, world.player.y);
      world.onGlimpse(guard, seen.closeness);
    }
  }

  switch (guard.state) {
    case STATE_PATROL: {
      const target = guard.points[guard.pointIndex];
      if (moveToward(guard, target.x, target.y, GUARD.patrolSpeed * guard.speedMul, dt)) {
        guard.pointIndex = (guard.pointIndex + 1) % guard.points.length;
      }
      break;
    }
    case STATE_SUSPICIOUS: {
      if (guard.targetX === null) { guard.state = STATE_PATROL; break; }
      if (followPath(guard, world.levelData, GUARD.investigateSpeed * guard.speedMul, dt, 1.5)) {
        // Arrived: stand and scan the area before giving up.
        guard.searchTimer += dt;
        guard.facing += dt * 1.6;
        if (guard.searchTimer > GUARD.searchSeconds) {
          guard.state = STATE_PATROL;
          guard.targetX = null;
          guard.path = null;
          guard.searchTimer = 0;
        }
      }
      break;
    }
    case STATE_ALERT: {
      if (seen.seen) {
        guard.calmTimer = 0;
        guard.targetX = world.player.x;
        guard.targetY = world.player.y;
      } else {
        guard.calmTimer += dt;
      }
      // Chase the last seen spot; if the player stays hidden long enough,
      // drop to searching that spot instead of chasing forever.
      if (guard.calmTimer > GUARD.calmSeconds) {
        guard.state = STATE_SEARCH;
        guard.searchTimer = 0;
        guard.targetX = guard.lastSeenX;
        guard.targetY = guard.lastSeenY;
        guard.path = null;
        guard.pathTimer = 0;
        break;
      }
      followPath(guard, world.levelData, GUARD.chaseSpeed * guard.speedMul, dt, 0.4);
      break;
    }
    case STATE_SEARCH: {
      if (guard.targetX === null) { guard.state = STATE_PATROL; break; }
      if (followPath(guard, world.levelData, GUARD.investigateSpeed * guard.speedMul, dt, 1.5)) {
        guard.searchTimer += dt;
        guard.facing += dt * 2.2;
        if (guard.searchTimer > GUARD.searchSeconds) {
          guard.state = STATE_PATROL;
          guard.targetX = null;
          guard.path = null;
          guard.searchTimer = 0;
        }
      }
      break;
    }
    default:
      guard.state = STATE_PATROL;
  }
}

// The cone's colour tells the player the guard's mood at a glance.
export function coneColor(guard) {
  if (guard.state === STATE_ALERT) return 'rgba(255, 64, 64, 0.30)';
  if (guard.state === STATE_SUSPICIOUS || guard.state === STATE_SEARCH) return 'rgba(255, 166, 40, 0.28)';
  return 'rgba(255, 214, 90, 0.20)';
}

export function coneEdgeColor(guard) {
  if (guard.state === STATE_ALERT) return 'rgba(255, 64, 64, 0.55)';
  if (guard.state === STATE_SUSPICIOUS || guard.state === STATE_SEARCH) return 'rgba(255, 166, 40, 0.5)';
  return 'rgba(255, 214, 90, 0.4)';
}
