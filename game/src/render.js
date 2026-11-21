// The Quiet Gallery — drawing. Everything the player sees is drawn here
// on one canvas: the museum floor, its walls and cases, the shadows that
// hide you, the guards and their vision cones, the thief, the relics, the
// exit, and the HUD. The cones are the game's language: yellow means a
// guard is calm, orange means it is suspicious, red means it is chasing
// you — and the floor's light tells you where it is safe to stand.
import { TILE, COLS, ROWS, PLAYER, GUARD, DETECT } from './config.js';
import { SCREEN_TITLE, SCREEN_WIN, SCREEN_CAUGHT, artifactsLeft, exitOpen, currentLevel } from './world.js';
import { coneColor, coneEdgeColor, STATE_ALERT } from './guard.js';
import { tileCenter } from './world.js';

// Fit the level into the canvas and centre it. Returns { scale, ox, oy }.
export function computeView(canvasWidth, canvasHeight) {
  const scale = Math.min(canvasWidth / (COLS * TILE), canvasHeight / (ROWS * TILE));
  const ox = (canvasWidth - COLS * TILE * scale) / 2;
  const oy = (canvasHeight - ROWS * TILE * scale) / 2;
  return { scale, ox, oy };
}

function px(view, x, y) {
  return { x: view.ox + x * view.scale, y: view.oy + y * view.scale };
}

function drawFloor(ctx, world, view) {
  const data = world.levelData;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const key = `${x},${y}`;
      const p = px(view, x * TILE, y * TILE);
      const s = TILE * view.scale;
      if (data.walls.has(key)) {
        // Wall: dark stone with a lighter top edge, so the room reads.
        ctx.fillStyle = '#2a2f3d';
        ctx.fillRect(p.x, p.y, s, s);
        ctx.fillStyle = '#3d4457';
        ctx.fillRect(p.x, p.y, s, Math.max(2, s * 0.12));
        continue;
      }
      const shadow = data.shadows.has(key);
      const even = (x + y) % 2 === 0;
      if (shadow) {
        ctx.fillStyle = even ? '#1a2233' : '#182031';
      } else {
        ctx.fillStyle = even ? '#4a3f31' : '#453b2d';
      }
      ctx.fillRect(p.x, p.y, s, s);
      // A faint grout line between the marble tiles.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, s - 1, s - 1);
    }
  }
}

function drawCases(ctx, world, view) {
  for (const key of world.levelData.cover) {
    const [x, y] = key.split(',').map(Number);
    const p = px(view, x * TILE, y * TILE);
    const s = TILE * view.scale;
    const inset = s * 0.12;
    // A glass display case: a dark plinth, a pale glass box, a glint.
    ctx.fillStyle = '#1d212b';
    ctx.fillRect(p.x + inset, p.y + inset, s - inset * 2, s - inset * 2);
    ctx.fillStyle = 'rgba(190, 220, 255, 0.28)';
    ctx.fillRect(p.x + inset + 2, p.y + inset + 2, s - inset * 2 - 4, s - inset * 2 - 4);
    ctx.strokeStyle = 'rgba(220, 235, 255, 0.55)';
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.strokeRect(p.x + inset, p.y + inset, s - inset * 2, s - inset * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(p.x + s * 0.3, p.y + s * 0.7);
    ctx.lineTo(p.x + s * 0.5, p.y + s * 0.3);
    ctx.stroke();
  }
}

function drawArtifacts(ctx, world, view, time) {
  for (const artifact of world.levelData.artifacts) {
    if (artifact.taken) continue;
    const c = tileCenter(artifact.x, artifact.y);
    const p = px(view, c.x, c.y);
    const r = TILE * view.scale * 0.32;
    const pulse = 0.75 + 0.25 * Math.sin(time * 3 + artifact.x);
    // The glow that marks a relic worth stealing.
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * 2.4);
    glow.addColorStop(0, `rgba(255, 215, 120, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 215, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    // The relic itself: a small golden diamond on its pedestal.
    ctx.fillStyle = '#2a2f3d';
    ctx.fillRect(p.x - r * 0.7, p.y + r * 0.4, r * 1.4, r * 0.5);
    ctx.save();
    ctx.translate(p.x, p.y - r * 0.2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd778';
    ctx.fillRect(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9);
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9);
    ctx.restore();
  }
}

function drawExit(ctx, world, view, time) {
  const c = tileCenter(world.levelData.exit.x, world.levelData.exit.y);
  const p = px(view, c.x, c.y);
  const open = exitOpen(world);
  const s = TILE * view.scale;
  const pulse = open ? 0.7 + 0.3 * Math.sin(time * 4) : 0.35;
  const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, s * 1.1);
  glow.addColorStop(0, open ? `rgba(80, 255, 140, ${0.45 * pulse})` : 'rgba(120, 120, 120, 0.25)');
  glow.addColorStop(1, 'rgba(80, 255, 140, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, s * 1.1, 0, Math.PI * 2);
  ctx.fill();
  // The door: a green frame with EXIT above it.
  ctx.fillStyle = open ? '#1d7a44' : '#3a3f4a';
  ctx.fillRect(p.x - s * 0.32, p.y - s * 0.32, s * 0.64, s * 0.64);
  ctx.fillStyle = open ? '#5cff8f' : '#6a7080';
  ctx.fillRect(p.x - s * 0.2, p.y - s * 0.2, s * 0.4, s * 0.4);
  ctx.fillStyle = open ? '#0b2e18' : '#c9cedb';
  ctx.font = `bold ${Math.max(9, s * 0.22)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', p.x, p.y - s * 0.48);
}

function drawCone(ctx, guard, view) {
  const p = px(view, guard.x, guard.y);
  const range = GUARD.viewRange * view.scale;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, range, guard.facing - GUARD.viewHalfAngle, guard.facing + GUARD.viewHalfAngle);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard);
  ctx.fill();
  ctx.strokeStyle = coneEdgeColor(guard);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, guard, view, time) {
  const p = px(view, guard.x, guard.y);
  const r = GUARD.radius * view.scale;
  // The guard: a navy uniform with a cap, and a white question or
  // exclamation mark when it is suspicious or chasing.
  ctx.fillStyle = '#232a3d';
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d5a80';
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9e2f2';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(guard.facing) * r * 0.3, p.y + Math.sin(guard.facing) * r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Cap brim in the facing direction.
  ctx.strokeStyle = '#10131c';
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(guard.facing) * r * 0.5, p.y + Math.sin(guard.facing) * r * 0.5);
  ctx.lineTo(p.x + Math.cos(guard.facing) * r * 1.05, p.y + Math.sin(guard.facing) * r * 1.05);
  ctx.stroke();
  if (guard.state !== 'patrol') {
    const mark = guard.state === STATE_ALERT ? '!' : '?';
    const bob = Math.sin(time * 5) * r * 0.12;
    ctx.fillStyle = guard.state === STATE_ALERT ? '#ff4040' : '#ffa628';
    ctx.font = `bold ${Math.max(12, r * 1.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mark, p.x, p.y - r * 1.7 + bob);
  }
}

function drawPlayer(ctx, world, view, time) {
  const player = world.player;
  const p = px(view, player.x, player.y);
  const r = PLAYER.radius * view.scale;
  const sneak = player.sneaking;
  const bob = player.moving ? Math.sin(time * (sneak ? 6 : 11)) * r * 0.08 : 0;
  // The thief: a dark hooded cloak, drawn low when sneaking. A pale rim
  // keeps the thief readable against the brown floor at a glance.
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.fillStyle = '#14100c';
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.05);
  ctx.quadraticCurveTo(r * 1.05, -r * 0.2, r * 0.85, r * 0.8);
  ctx.quadraticCurveTo(0, r * 1.15, -r * 0.85, r * 0.8);
  ctx.quadraticCurveTo(-r * 1.05, -r * 0.2, 0, -r * 1.05);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 220, 192, 0.75)';
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.stroke();
  // The hood's opening, facing the direction of travel.
  const fx = Math.cos(Math.atan2(player.facingY, player.facingX));
  const fy = Math.sin(Math.atan2(player.facingY, player.facingX));
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.arc(fx * r * 0.3, fy * r * 0.3 - r * 0.1, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The detection eye: an arc over the thief that fills as guards see you.
  if (world.meter > 1) {
    const frac = world.meter / DETECT.alarmAt;
    ctx.save();
    ctx.translate(p.x, p.y - r * 1.9);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = world.alarm ? '#ff4040' : frac > 0.45 ? '#ffa628' : '#ffd65a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCoin(ctx, world, view, time) {
  const coin = world.player.thrownCoin;
  if (!coin) return;
  const p = px(view, coin.x, coin.y);
  const r = TILE * view.scale * 0.16;
  if (!coin.landed) {
    ctx.fillStyle = '#ffd778';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const pulse = 0.6 + 0.4 * Math.sin(time * 6);
  ctx.strokeStyle = `rgba(255, 215, 120, ${0.7 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * (1.6 + 0.5 * pulse), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd778';
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx, world, canvasWidth, canvasHeight) {
  const pad = 14;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
  ctx.fillRect(0, 0, canvasWidth, 46);
  ctx.fillStyle = '#e8e2d2';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(currentLevel(world).name, pad, 24);
  // Relics taken, as small diamonds.
  for (let i = 0; i < 3; i += 1) {
    const cx = 210 + i * 26;
    ctx.save();
    ctx.translate(cx, 23);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < world.loot ? '#ffd778' : 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
  // Coins left.
  ctx.fillStyle = '#ffd778';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`coins ${world.player.coins}`, 300, 24);
  // The detection meter: an eye bar that fills as guards see you.
  const mx = canvasWidth - 250;
  ctx.fillStyle = '#e8e2d2';
  ctx.fillText('SEEN', mx, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(mx + 48, 16, 130, 14);
  const frac = world.meter / DETECT.alarmAt;
  ctx.fillStyle = world.alarm ? '#ff4040' : frac > 0.45 ? '#ffa628' : '#ffd65a';
  ctx.fillRect(mx + 48, 16, 130 * frac, 14);
  // Timer.
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  ctx.fillStyle = '#e8e2d2';
  ctx.textAlign = 'right';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, canvasWidth - pad, 24);
  ctx.restore();
  // A message line under the bar.
  if (world.messageTimer > 0 && world.message) {
    ctx.save();
    ctx.fillStyle = world.alarm ? '#ff8080' : '#ffe9a8';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(world.message, canvasWidth / 2, 66);
    ctx.restore();
  }
  // Controls reminder along the bottom.
  ctx.save();
  ctx.fillStyle = 'rgba(232, 226, 210, 0.55)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WASD / arrows — move    Shift — sneak    Click — throw a coin    R — restart', canvasWidth / 2, canvasHeight - 14);
  ctx.restore();
}

function drawOverlay(ctx, canvasWidth, canvasHeight, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 14, 0.78)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, canvasWidth / 2, canvasHeight / 2 - 90);
  ctx.fillStyle = '#e8e2d2';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, canvasWidth / 2, canvasHeight / 2 - 30 + i * 28);
  });
  ctx.restore();
}

// Draw the whole game for the current world state.
export function render(ctx, world, canvasWidth, canvasHeight, time) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  const view = computeView(canvasWidth, canvasHeight);
  if (world.levelData) {
    drawFloor(ctx, world, view);
    drawExit(ctx, world, view, time);
    drawArtifacts(ctx, world, view, time);
    drawCases(ctx, world, view);
    for (const guard of world.guards) drawCone(ctx, guard, view);
    for (const guard of world.guards) drawGuard(ctx, guard, view, time);
    drawCoin(ctx, world, view, time);
    drawPlayer(ctx, world, view, time);
  }
  // A soft vignette: the gallery is dark at its edges, lit where you are.
  const vignette = ctx.createRadialGradient(
    canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * 0.35,
    canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) * 0.75,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (world.screen === SCREEN_TITLE) {
    drawOverlay(ctx, canvasWidth, canvasHeight, 'THE QUIET GALLERY', [
      'A museum after hours. Three relics. Four guards. One quiet night.',
      'Take all three relics, then slip out through the green EXIT — unseen.',
      'WASD or arrows to move · hold Shift to sneak · click to throw a coin',
      'Shadows hide you. A yellow cone is a calm guard; red means run.',
      '',
      'Click or press Enter to begin',
    ], '#ffd778');
  } else if (world.screen === SCREEN_WIN) {
    const next = world.levelIndex + 1 < 2 ? 'Press N for the next wing — the Vault Wing.' : 'You cleared both wings. The gallery is yours.';
    drawOverlay(ctx, canvasWidth, canvasHeight, 'CLEAN GETAWAY', [
      `${currentLevel(world).name} cleared in ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')} — ${world.loot} relics, ${world.alarms} alarm${world.alarms === 1 ? '' : 's'}.`,
      next,
      'Press R to play this wing again.',
    ], '#5cff8f');
  } else if (world.screen === SCREEN_CAUGHT) {
    drawOverlay(ctx, canvasWidth, canvasHeight, 'CAUGHT', [
      'A guard laid a hand on your shoulder. The night is over.',
      `${currentLevel(world).name} — ${world.loot} of 3 relics taken.`,
      'Press R to try the wing again.',
    ], '#ff5a5a');
  } else {
    drawHud(ctx, world, canvasWidth, canvasHeight);
  }
}
