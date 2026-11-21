// The Quiet Gallery — input. Keyboard movement (WASD or the arrow keys),
// Shift to sneak, R to restart, Enter to start, N for the next level, and
// the mouse: a click throws a coin at that spot. The state is plain data
// the world reads every step, so the same code drives both a human player
// and the scripted screenshot scenes.
export function makeInput() {
  return {
    keys: { up: false, down: false, left: false, right: false, sneak: false },
    // A click waiting to be consumed by the next world step, or null.
    click: null,
    // Keys pressed since the last step (Enter, R, N): the main loop reads
    // and clears them.
    pressed: new Set(),
  };
}

const KEY_MAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

export function attachInput(input, canvas, onFirstGesture) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    const mapped = KEY_MAP[event.code];
    if (mapped) input.keys[mapped] = true;
    if (!event.repeat) {
      input.pressed.add(event.code);
      if (onFirstGesture) onFirstGesture();
    }
  });
  window.addEventListener('keyup', (event) => {
    const mapped = KEY_MAP[event.code];
    if (mapped) input.keys[mapped] = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (onFirstGesture) onFirstGesture();
  });
  // Losing the window clears held keys, so the thief never walks alone.
  window.addEventListener('blur', () => {
    for (const key of Object.keys(input.keys)) input.keys[key] = false;
  });
}

// Convert a click in canvas pixels to game-world pixels, given the view
// the renderer used. The world only needs the raw canvas point for the
// coin's target, and the coin flies in world pixels — so this maps the
// click through the same scale and offset render.js uses.
export function canvasToWorld(canvasX, canvasY, canvasWidth, canvasHeight) {
  const { TILE, COLS, ROWS } = { TILE: 40, COLS: 23, ROWS: 15 };
  const scale = Math.min(canvasWidth / (COLS * TILE), canvasHeight / (ROWS * TILE));
  const ox = (canvasWidth - COLS * TILE * scale) / 2;
  const oy = (canvasHeight - ROWS * TILE * scale) / 2;
  return { x: (canvasX - ox) / scale, y: (canvasY - oy) / scale };
}
