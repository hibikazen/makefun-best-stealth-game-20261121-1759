// Guard behaviour for Shadow Line: patrol waypoints, a vision cone that
// fills a suspicion meter, investigation of the last seen spot, and hearing
// loud footsteps. A guard never teleports and never knows where you are
// unless it saw you or heard you — that is what makes the patrols learnable.

import { TILE } from './levels.js';

export const CONE_RANGE = 175;
export const CONE_HALF_ANGLE = 0.61; // about 35 degrees each side
export const CATCH_DISTANCE = 26;

export function tileCenter(t) {
  return { x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE };
}

// True when the straight line from a to b crosses a wall or crate tile.
// Bushes and shadow floor never block sight.
export function lineBlocked(a, b, blockers) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const px = a.x + (dx * i) / steps;
    const py = a.y + (dy * i) / steps;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (blockers.has(tx + ',' + ty)) return true;
  }
  return false;
}

export function createGuard(def) {
  const start = tileCenter(def.waypoints[0]);
  return {
    x: start.x,
    y: start.y,
    facing: 0,
    speed: def.speed,
    waypoints: def.waypoints.map(tileCenter),
    waypointIndex: 1,
    pauseLeft: 0,
    suspicion: 0,
    state: 'patrol', // patrol | suspicious | investigate | chase
    lastSeen: null,
    investigateTarget: null,
    hearTarget: null,
    stepPulse: 0,
  };
}

function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function moveToward(guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  const want = Math.atan2(dy, dx);
  guard.facing += angleDiff(want, guard.facing) * Math.min(1, dt * 8);
  return dist - step < 2;
}

// How fast this guard's suspicion grows while it can see the player:
// closer is faster, crouching halves it, shadow floor cuts it to 40%.
function detectionRate(dist, player) {
  const closeness = 1 - dist / CONE_RANGE;
  let rate = 0.55 + closeness * 1.5;
  if (player.crouching) rate *= 0.5;
  if (player.inShadow) rate *= 0.4;
  return rate;
}

export function updateGuard(guard, dt, player, blockers) {
  const toPlayer = { x: player.x - guard.x, y: player.y - guard.y };
  const dist = Math.hypot(toPlayer.x, toPlayer.y);
  const inRange = dist < CONE_RANGE;
  const inCone =
    inRange && Math.abs(angleDiff(angleTo(guard, player), guard.facing)) < CONE_HALF_ANGLE;
  const seen = inCone && !player.hiddenInBush && !lineBlocked(guard, player, blockers);

  if (seen) {
    guard.suspicion = Math.min(1, guard.suspicion + detectionRate(dist, player) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion >= 1) guard.state = 'chase';
    else if (guard.suspicion > 0.25) guard.state = 'suspicious';
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - 0.35 * dt);
    if (guard.state === 'suspicious' && guard.suspicion <= 0.05) {
      guard.state = 'investigate';
      guard.investigateTarget = guard.lastSeen
        ? { x: guard.lastSeen.x, y: guard.lastSeen.y }
        : { x: guard.x, y: guard.y };
    }
  }

  // Loud running reaches a guard's ears even through walls.
  if (player.noiseRadius > 0 && dist < player.noiseRadius && guard.state === 'patrol') {
    guard.state = 'investigate';
    guard.investigateTarget = { x: player.x, y: player.y };
    guard.hearTarget = { x: player.x, y: player.y };
  }

  if (guard.state === 'chase') {
    const arrived = moveToward(guard, player, guard.speed * 1.7, dt);
    if (dist < CATCH_DISTANCE) return 'caught';
    if (!seen && guard.suspicion < 0.6) {
      guard.state = 'investigate';
      guard.investigateTarget = guard.lastSeen
        ? { x: guard.lastSeen.x, y: guard.lastSeen.y }
        : { x: guard.x, y: guard.y };
    }
    return 'playing';
  }

  if (guard.state === 'investigate' && guard.investigateTarget) {
    const arrived = moveToward(guard, guard.investigateTarget, guard.speed * 1.25, dt);
    if (arrived) {
      guard.pauseLeft = 1.2;
      guard.state = 'patrol';
      guard.investigateTarget = null;
      guard.waypointIndex = nearestWaypoint(guard);
    }
    return 'playing';
  }

  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    return 'playing';
  }

  const target = guard.waypoints[guard.waypointIndex];
  const arrived = moveToward(guard, target, guard.speed, dt);
  if (arrived) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = 0.9;
  }
  return 'playing';
}

function nearestWaypoint(guard) {
  let best = 0;
  let bestDist = Infinity;
  guard.waypoints.forEach((w, i) => {
    const d = Math.hypot(w.x - guard.x, w.y - guard.y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}
