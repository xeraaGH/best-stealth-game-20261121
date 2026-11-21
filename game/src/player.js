// The Quiet Gallery — the thief. The player moves with WASD or the arrow
// keys, holds Shift to sneak (slow and quiet, harder to spot), and clicks
// to throw a coin that rings on the floor and pulls guards toward it.
// Movement is circle-vs-tile collision: the player slides along walls
// instead of sticking to them.
import { PLAYER, TILE, COIN } from './config.js';

export function makePlayer(startPx) {
  return {
    x: startPx.x,
    y: startPx.y,
    // Facing direction, for drawing the cloak and the sneak pose.
    facingX: 0,
    facingY: 1,
    sneaking: false,
    moving: false,
    // Steps taken since the last footstep sound (audio.js listens).
    stepAcc: 0,
    coins: COIN.maxCarried,
    // A coin currently flying through the air, or null.
    thrownCoin: null,
  };
}

// Try to move the player by (dx, dy) pixels, sliding along solid tiles.
// Returns whether the player actually moved.
export function movePlayer(player, dx, dy, levelData) {
  let moved = false;
  if (dx !== 0 && !collides(levelData, player.x + dx, player.y, PLAYER.radius)) {
    player.x += dx;
    moved = true;
  }
  if (dy !== 0 && !collides(levelData, player.x, player.y + dy, PLAYER.radius)) {
    player.y += dy;
    moved = true;
  }
  return moved;
}

// Would a circle of `radius` at (x, y) overlap a solid tile?
export function collides(levelData, x, y, radius) {
  const minTx = Math.floor((x - radius) / TILE);
  const maxTx = Math.floor((x + radius) / TILE);
  const minTy = Math.floor((y - radius) / TILE);
  const maxTy = Math.floor((y + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (!levelData.solidAtTile(tx, ty)) continue;
      // The closest point of the tile to the circle's centre.
      const cx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
      const cy = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < radius * radius) return true;
    }
  }
  return false;
}

// One step of player input: keys is {up, down, left, right, sneak}.
// Returns the distance walked this step (for footstep sounds).
export function stepPlayer(player, keys, levelData, dt) {
  let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const len = Math.hypot(ix, iy);
  player.moving = len > 0;
  player.sneaking = Boolean(keys.sneak) && player.moving;
  if (!player.moving) return 0;
  ix /= len;
  iy /= len;
  player.facingX = ix;
  player.facingY = iy;
  const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const dx = ix * speed * dt;
  const dy = iy * speed * dt;
  movePlayer(player, dx, dy, levelData);
  return Math.hypot(dx, dy);
}

// Throw a coin toward the pixel (tx, ty). The coin flies in a straight
// line and lands where it stops (a wall, or its full range). Returns the
// coin or null when the player has none left.
export function throwCoin(player, tx, ty) {
  if (player.coins <= 0 || player.thrownCoin) return null;
  player.coins -= 1;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.hypot(dx, dy) || 1;
  const range = Math.min(dist, 260);
  player.thrownCoin = {
    x: player.x,
    y: player.y,
    vx: (dx / dist) * COIN.throwSpeed,
    vy: (dy / dist) * COIN.throwSpeed,
    travelled: 0,
    range,
    landed: false,
    ringTimer: 0,
  };
  return player.thrownCoin;
}

// Advance a flying coin; when it lands it keeps ringing for a while and
// guards inside earshot come to investigate. Returns 'landed' the step it
// stops, 'ringing' while it rings, or null when it is spent.
export function stepCoin(player, levelData, dt) {
  const coin = player.thrownCoin;
  if (!coin) return null;
  if (!coin.landed) {
    const step = COIN.throwSpeed * dt;
    const nx = coin.x + (coin.vx / COIN.throwSpeed) * step;
    const ny = coin.y + (coin.vy / COIN.throwSpeed) * step;
    if (collides(levelData, nx, ny, 4) || coin.travelled + step >= coin.range) {
      coin.landed = true;
      coin.ringTimer = COIN.ringSeconds;
      return 'landed';
    }
    coin.x = nx;
    coin.y = ny;
    coin.travelled += step;
    return 'flying';
  }
  coin.ringTimer -= dt;
  if (coin.ringTimer <= 0) {
    player.thrownCoin = null;
    return null;
  }
  return 'ringing';
}
