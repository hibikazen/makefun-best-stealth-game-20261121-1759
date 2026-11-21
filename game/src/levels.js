// Level layouts for Shadow Line. Each map is 16 rows of 24 tiles.
// Legend: '#' wall, '.' floor, 'C' crate (blocks movement and sight),
// 'B' bush (you can stand in it and guards cannot see you), 'S' shadow
// floor (detection fills much slower while you stand in it),
// 'P' player start, 'E' exit. Guards patrol the waypoint lists below;
// every waypoint is a tile coordinate {x, y} and guards walk them in order,
// pausing a beat at each end before turning back.

export const TILE = 40;

export const LEVELS = [
  {
    name: 'The Warehouse',
    hint: 'Learn the patrols. Crates block sight, bushes hide you, shadows slow detection.',
    map: [
      '########################',
      '#P....#......#......E..#',
      '#.....#..C...#.........#',
      '#..B...#......#...C....#',
      '#......#......#...S....#',
      '#..C...#..B...#....B...#',
      '#......#......#........#',
      '###.#####.######.#######',
      '#......#......#........#',
      '#..B...#..C...#...C....#',
      '#......#......#..S.....#',
      '#..C...#......#....B...#',
      '#..............#.......#',
      '#......#......#....C...#',
      '#......#......#........#',
      '########################',
    ],
    guards: [
      { waypoints: [{ x: 16, y: 1 }, { x: 21, y: 1 }], speed: 52 },
      { waypoints: [{ x: 3, y: 9 }, { x: 3, y: 13 }], speed: 46 },
      { waypoints: [{ x: 10, y: 3 }, { x: 10, y: 6 }], speed: 50 },
    ],
  },
  {
    name: 'The Yard',
    hint: 'Four guards now. The open yard is fast but exposed — run loud and they will hear you.',
    map: [
      '########################',
      '#P...........#....E....#',
      '#..C.....B...#.........#',
      '#............#..C......#',
      '#....B.......#.........#',
      '#..C.........#....B....#',
      '#............#S........#',
      '#####.#########.########',
      '#............#.........#',
      '#..B......C..#.....C...#',
      '#......................#',
      '#....C.......#..B......#',
      '#.........B..#.........#',
      '#..C.........#....C....#',
      '#............#.........#',
      '########################',
    ],
    guards: [
      { waypoints: [{ x: 16, y: 2 }, { x: 20, y: 2 }], speed: 58 },
      { waypoints: [{ x: 4, y: 3 }, { x: 4, y: 6 }], speed: 50 },
      { waypoints: [{ x: 9, y: 9 }, { x: 9, y: 13 }], speed: 54 },
      { waypoints: [{ x: 17, y: 10 }, { x: 17, y: 13 }], speed: 56 },
    ],
  },
  {
    name: 'The Vault',
    hint: 'Five guards, tight corridors. Crouch to move quietly and wait for the gaps.',
    map: [
      '########################',
      '#P....#......#......E..#',
      '#..C..#..B...#..C......#',
      '#.....#......#.........#',
      '#..B..#..C...#....B....#',
      '#.....#......#..S......#',
      '#..C..#..B...#..C......#',
      '###.#####.######.#######',
      '#.....#......#.........#',
      '#..B..#..C...#....B....#',
      '#.....#......#.........#',
      '#..C..#..B...#..C......#',
      '#..............#.......#',
      '#.....#......#....C....#',
      '#.....#......#.........#',
      '########################',
    ],
    guards: [
      { waypoints: [{ x: 16, y: 1 }, { x: 21, y: 1 }], speed: 62 },
      { waypoints: [{ x: 3, y: 4 }, { x: 3, y: 6 }], speed: 54 },
      { waypoints: [{ x: 9, y: 2 }, { x: 9, y: 5 }], speed: 58 },
      { waypoints: [{ x: 16, y: 9 }, { x: 16, y: 13 }], speed: 60 },
      { waypoints: [{ x: 9, y: 10 }, { x: 11, y: 10 }], speed: 56 },
    ],
  },
];

// Turn a level's string map into the collision and cover grids the game uses.
export function parseLevel(level) {
  const walls = [];
  const crates = [];
  const bushes = [];
  const shadows = [];
  let player = { x: 1, y: 1 };
  let exit = { x: 22, y: 1 };
  for (let y = 0; y < level.map.length; y++) {
    const row = level.map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '#') walls.push({ x, y });
      else if (ch === 'C') crates.push({ x, y });
      else if (ch === 'B') bushes.push({ x, y });
      else if (ch === 'S') shadows.push({ x, y });
      else if (ch === 'P') player = { x, y };
      else if (ch === 'E') exit = { x, y };
    }
  }
  return { walls, crates, bushes, shadows, player, exit };
}
