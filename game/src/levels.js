// The Quiet Gallery — the levels. Each level is a grid of characters plus
// the guard patrols that walk it. The parser below turns the grid into
// walls, cover, shadows, artifacts, the player's start and the exit, so a
// new level is just a new grid and a few waypoint lists.
//
// Legend:
//   #  wall (blocks movement and sight)
//   .  lit floor
//   ,  shadow floor (dark: a guard's detection meter fills slower there)
//   C  display case (cover: blocks movement and sight)
//   A  artifact to steal
//   S  where the thief starts
//   E  the exit (opens once every artifact is taken)

export const LEVELS = [
  {
    name: 'The Marble Wing',
    subtitle: 'Three relics. Four guards. One quiet night.',
    // 23 columns x 15 rows. Guard patrols were checked against this grid:
    // every waypoint and every tile between two waypoints is open floor.
    grid: [
      '#######################',
      '#S..,,,,#......#...A..#',
      '#..,,,,.#..C...#......#',
      '#..,,,,.#......#..C...#',
      '#.......#..C...#......#',
      '#..C....#......#..C...#',
      '#.......#..C...#......#',
      '#..C..C....C.......C..#',
      '#.....................#',
      '#..C..C....C....A..C..#',
      '#.......#..C...#......#',
      '#..C....#......#..C...#',
      '#.......#..C...#..,,,,#',
      '#..A....#......#.E,,,,#',
      '#######################',
    ],
    // Patrols: each guard walks its waypoints in order and loops.
    // [x, y] are tile columns and rows.
    patrols: [
      { name: 'Hall', points: [[2, 8], [21, 8]], speed: 1.0 },
      { name: 'West', points: [[5, 1], [5, 13]], speed: 0.9 },
      { name: 'East', points: [[21, 1], [21, 13]], speed: 0.9 },
      { name: 'Middle', points: [[10, 1], [10, 13]], speed: 1.0 },
    ],
  },
  {
    name: 'The Vault Wing',
    subtitle: 'Five guards, tighter halls, three relics.',
    grid: [
      '#######################',
      '#S.C....#.....#....A..#',
      '#..C....#..C..#..C....#',
      '#......C#.....#.......#',
      '#..C....#..C..#..C..C.#',
      '#......C#.....#.......#',
      '#..C....#..C..#..C....#',
      '#..,,,,.#.....#....C..#',
      '#..,,,,................',
      '#..,,,,.#.....#....C..#',
      '#..C....#..C..#..C....#',
      '#......C#.....#.......#',
      '#..C....#..C..#..C..C.#',
      '#..A....#.....#..A.E..#',
      '#######################',
    ],
    patrols: [
      { name: 'Hall', points: [[2, 8], [21, 8]], speed: 1.15 },
      { name: 'West', points: [[4, 1], [4, 13]], speed: 1.05 },
      { name: 'East', points: [[21, 1], [21, 13]], speed: 1.05 },
      { name: 'Middle', points: [[10, 1], [10, 13]], speed: 1.15 },
      { name: 'Vault', points: [[16, 2], [16, 12]], speed: 1.0 },
    ],
  },
];

// Turn a level's grid into the pieces the game plays with. Walls and cases
// are tile sets; shadows are a set of tiles; artifacts, the start and the
// exit are tile positions. Anything the parser does not recognise is floor.
export function parseLevel(level) {
  const walls = new Set();
  const cover = new Set();
  const shadows = new Set();
  const artifacts = [];
  let start = { x: 1, y: 1 };
  let exit = { x: 21, y: 13 };
  for (let y = 0; y < level.grid.length; y += 1) {
    const row = level.grid[y];
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      const key = `${x},${y}`;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') cover.add(key);
      else if (ch === ',') shadows.add(key);
      else if (ch === 'A') artifacts.push({ x, y, taken: false });
      else if (ch === 'S') start = { x, y };
      else if (ch === 'E') exit = { x, y };
    }
  }
  return { walls, cover, shadows, artifacts, start, exit };
}

// Is the tile at (x, y) solid — a wall or a case? Out of bounds is solid.
export function isSolid(levelData, x, y) {
  if (x < 0 || y < 0 || x >= levelData.width || y >= levelData.height) return true;
  const key = `${x},${y}`;
  return levelData.walls.has(key) || levelData.cover.has(key);
}
