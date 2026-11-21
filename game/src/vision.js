// The Quiet Gallery — seeing. A guard sees the player only when three
// things are true: the player is inside the guard's vision cone, nothing
// solid stands between them, and the player is close enough that the cone's
// edge still matters. This file answers those questions and nothing else.

// Is the straight line from (x0, y0) to (x1, y1) blocked by a wall or a
// case? Walks the line in small steps and asks the level whether each
// sample point is solid. Tile coordinates are converted with tileOf.
export function hasLineOfSight(levelData, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    if (levelData.solidAtPx(x, y)) return false;
  }
  return true;
}

// Is the point (px, py) inside the guard's cone? The cone is the guard's
// facing direction, a half-angle on each side, and a maximum range.
export function inCone(guard, px, py, range, halfAngle) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return { seen: false, closeness: 0 };
  if (dist < 4) return { seen: true, closeness: 1 };
  const angle = Math.atan2(dy, dx);
  let diff = angle - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return { seen: false, closeness: 0 };
  // Closeness is 1 at the guard's feet and 0 at the cone's far edge: the
  // nearer the player, the faster the detection meter fills.
  return { seen: true, closeness: 1 - dist / range };
}

// The full question a guard asks every step: can I see the player?
// Returns { seen, closeness } — closeness 0 when unseen.
export function canSee(levelData, guard, player, range, halfAngle) {
  const cone = inCone(guard, player.x, player.y, range, halfAngle);
  if (!cone.seen) return { seen: false, closeness: 0 };
  if (!hasLineOfSight(levelData, guard.x, guard.y, player.x, player.y)) {
    return { seen: false, closeness: 0 };
  }
  return cone;
}
