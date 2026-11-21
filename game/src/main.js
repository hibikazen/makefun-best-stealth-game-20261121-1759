// Shadow Line — game state, loop and rules. Top-down stealth across three
// levels: reach the green exit while the guards' vision cones sweep the map.
// Detection fills when a guard sees you and drains when you break line of
// sight, so a near miss is recoverable; a full meter means the guard chases,
// and being touched means caught.

import { TILE, LEVELS, parseLevel } from './levels.js';
import { createGuard, updateGuard } from './guards.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput();
const audio = createAudio();

const WALK_SPEED = 135;
const RUN_SPEED = 205;
const CROUCH_SPEED = 72;

const game = {
  screen: 'title', // title | playing | caught | levelclear | win
  paused: false,
  levelIndex: 0,
  parsed: null,
  blockers: new Set(),
  guards: [],
  player: null,
  elapsed: 0,
  timesSpotted: 0,
  maxSuspicion: 0,
  noiseLabel: '—',
  stanceLabel: 'STILL',
  rating: '',
  // Screenshot staging only: when set, guard 0's meter is held at this
  // value so a staged near-miss frame stays half full.
  pinSuspicion: null,
};

function tileAt(px, py) {
  return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
}

function tileIsBush(t) {
  return game.parsed.bushes.some((b) => b.x === t.x && b.y === t.y);
}

function tileIsShadow(t) {
  return game.parsed.shadows.some((s) => s.x === t.x && s.y === t.y);
}

function solidAt(px, py) {
  const t = tileAt(px, py);
  return game.blockers.has(t.x + ',' + t.y);
}

function circleHitsSolid(x, y, r) {
  return (
    solidAt(x - r, y - r) ||
    solidAt(x + r, y - r) ||
    solidAt(x - r, y + r) ||
    solidAt(x + r, y + r)
  );
}

function loadLevel(index) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.parsed = parseLevel(level);
  game.blockers = new Set();
  for (const w of game.parsed.walls) game.blockers.add(w.x + ',' + w.y);
  for (const c of game.parsed.crates) game.blockers.add(c.x + ',' + c.y);
  game.guards = level.guards.map((def) => createGuard(def));
  const start = game.parsed.player;
  game.player = {
    x: (start.x + 0.5) * TILE,
    y: (start.y + 0.5) * TILE,
    facing: 0,
    crouching: false,
    hiddenInBush: false,
    inShadow: false,
    noiseRadius: 0,
    rings: [],
    stepTimer: 0,
  };
  game.maxSuspicion = 0;
  game.pinSuspicion = null;
  game.screen = 'playing';
  game.paused = false;
  announce(`${level.name}. ${level.hint}`);
}

function announce(text) {
  statusEl.textContent = text;
}

function startGame() {
  game.elapsed = 0;
  game.timesSpotted = 0;
  loadLevel(0);
}

function ratingFor() {
  if (game.timesSpotted === 0 && game.elapsed < 360) return 'GHOST — never seen';
  if (game.timesSpotted <= 2) return 'SHADOW — barely a whisper';
  return 'ROOKIE — loud, but alive';
}

function reachExit() {
  const e = game.parsed.exit;
  const ex = (e.x + 0.5) * TILE;
  const ey = (e.y + 0.5) * TILE;
  return Math.hypot(game.player.x - ex, game.player.y - ey) < TILE * 0.55;
}

function updatePlaying(dt) {
  const player = game.player;
  const move = input.moveVector();
  player.crouching = input.crouching();
  const moving = move.x !== 0 || move.y !== 0;
  const running = moving && input.running() && !player.crouching;
  const speed = player.crouching ? CROUCH_SPEED : running ? RUN_SPEED : WALK_SPEED;
  if (moving) {
    player.facing = Math.atan2(move.y, move.x);
    const nx = player.x + move.x * speed * dt;
    if (!circleHitsSolid(nx, player.y, 11)) player.x = nx;
    const ny = player.y + move.y * speed * dt;
    if (!circleHitsSolid(player.x, ny, 11)) player.y = ny;
    player.noiseRadius = player.crouching ? 14 : running ? 95 : 45;
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = running ? 0.22 : 0.34;
      player.rings.push({ born: performance.now() / 1000, radius: player.noiseRadius });
      audio.footstep(running);
    }
  } else {
    player.noiseRadius = 0;
  }
  player.rings = player.rings.filter((r) => performance.now() / 1000 - r.born < 0.7);

  const under = tileAt(player.x, player.y);
  player.hiddenInBush = tileIsBush(under);
  player.inShadow = tileIsShadow(under);

  game.elapsed += dt;
  game.noiseLabel = !moving ? '—' : running ? 'LOUD' : player.crouching ? 'quiet' : 'soft';
  game.stanceLabel = !moving ? 'STILL' : player.crouching ? 'CROUCHED' : running ? 'RUNNING' : 'WALKING';

  let maxSuspicion = 0;
  for (const guard of game.guards) {
    const wasChasing = guard.state === 'chase';
    const result = updateGuard(guard, dt, player, game.blockers);
    if (guard.state === 'chase' && !wasChasing) {
      game.timesSpotted += 1;
      audio.alarm();
      announce('Spotted! Break line of sight!');
    }
    if (result === 'caught') {
      game.screen = 'caught';
      announce('Caught! Press R to try the level again.');
      return;
    }
    maxSuspicion = Math.max(maxSuspicion, guard.suspicion);
  }
  game.maxSuspicion = maxSuspicion;
  if (game.pinSuspicion !== null) {
    const guard = game.guards[0];
    guard.suspicion = game.pinSuspicion;
    guard.state = 'suspicious';
    game.maxSuspicion = game.pinSuspicion;
  }

  if (reachExit()) {
    if (game.levelIndex >= LEVELS.length - 1) {
      game.rating = ratingFor();
      game.screen = 'win';
      announce(`You escaped! Rating: ${game.rating}`);
    } else {
      game.screen = 'levelclear';
      announce(`${LEVELS[game.levelIndex].name} clear. Press Enter for the next level.`);
    }
  }
}

function update(dt) {
  if (input.wasPressed('KeyP') && game.screen === 'playing') {
    game.paused = !game.paused;
  }
  if (input.wasPressed('KeyR') && (game.screen === 'playing' || game.screen === 'caught')) {
    loadLevel(game.levelIndex);
    return;
  }
  if (input.wasPressed('Enter')) {
    if (game.screen === 'title' || game.screen === 'win') startGame();
    else if (game.screen === 'levelclear') loadLevel(game.levelIndex + 1);
    else if (game.screen === 'caught') loadLevel(game.levelIndex);
  }
  if (game.screen === 'playing' && !game.paused) updatePlaying(dt);
}

// Screenshot staging: ?shot=cover shows level 1 mid-patrol, ?shot=nearmiss
// puts the player inside a guard's cone with the meter half full, and
// ?shot=win shows the win screen. Plain loads show the title screen.
function applyShotStaging() {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!shot || shot === 'start') return;
  if (shot === 'cover') {
    startGame();
    game.player.x = 4.5 * TILE;
    game.player.y = 5.5 * TILE;
    game.player.facing = 0.6;
    game.elapsed = 42;
  } else if (shot === 'nearmiss') {
    startGame();
    // Just off the guard's patrol lane, at the edge of its cone: a near
    // miss, with the meter pinned half full for the frame.
    game.player.x = 17.5 * TILE;
    game.player.y = 2.5 * TILE;
    game.player.facing = -0.8;
    game.pinSuspicion = 0.55;
    game.maxSuspicion = 0.55;
    game.elapsed = 67;
  } else if (shot === 'win') {
    startGame();
    game.elapsed = 187;
    game.timesSpotted = 1;
    game.rating = 'SHADOW — barely a whisper';
    game.screen = 'win';
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render(ctx, game, now / 1000);
  input.endFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', () => audio.unlock(), { once: true });

// Small debug hook for play-testing: move the player, read the state.
window.__stealth = {
  game,
  start: startGame,
  setPlayer(tx, ty) {
    game.player.x = (tx + 0.5) * TILE;
    game.player.y = (ty + 0.5) * TILE;
  },
  setPlayerPx(x, y) {
    game.player.x = x;
    game.player.y = y;
  },
  suspicion() {
    return game.maxSuspicion;
  },
  screen() {
    return game.screen;
  },
};

applyShotStaging();
requestAnimationFrame(frame);
