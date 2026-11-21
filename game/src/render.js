// All drawing for Shadow Line: a top-down night map, guards with visible
// vision cones, crates and bushes you can hide behind, a glowing exit, and
// the HUD. Nothing here is loaded from the network — every pixel is canvas.

import { TILE, LEVELS } from './levels.js';
import { CONE_RANGE, CONE_HALF_ANGLE } from './guards.js';

const VIEW_W = 960;
const VIEW_H = 704; // 64px HUD + 16 tiles of 40px
const HUD_H = 64;

function tileRect(t) {
  return { x: t.x * TILE, y: t.y * TILE, w: TILE, h: TILE };
}

function drawFloor(ctx, parsed) {
  ctx.fillStyle = '#161b28';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW_W; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, VIEW_H);
    ctx.stroke();
  }
  for (let y = HUD_H; y <= VIEW_H; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_W, y);
    ctx.stroke();
  }
  for (const s of parsed.shadows) {
    const r = tileRect(s);
    ctx.fillStyle = 'rgba(4,6,12,0.55)';
    ctx.fillRect(r.x, r.y + HUD_H, r.w, r.h);
  }
}

function drawCover(ctx, parsed) {
  for (const c of parsed.crates) {
    const r = tileRect(c);
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(r.x + 3, r.y + HUD_H + 3, r.w - 6, r.h - 6);
    ctx.strokeStyle = '#8a6238';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 3, r.y + HUD_H + 3, r.w - 6, r.h - 6);
    ctx.beginPath();
    ctx.moveTo(r.x + 3, r.y + HUD_H + 3);
    ctx.lineTo(r.x + r.w - 3, r.y + HUD_H + r.h - 3);
    ctx.moveTo(r.x + r.w - 3, r.y + HUD_H + 3);
    ctx.lineTo(r.x + 3, r.y + HUD_H + r.h - 3);
    ctx.stroke();
  }
  for (const b of parsed.bushes) {
    const r = tileRect(b);
    ctx.fillStyle = '#1e4d2a';
    ctx.beginPath();
    ctx.arc(r.x + 12, r.y + HUD_H + 14, 11, 0, Math.PI * 2);
    ctx.arc(r.x + 27, r.y + HUD_H + 11, 12, 0, Math.PI * 2);
    ctx.arc(r.x + 20, r.y + HUD_H + 27, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a6b3a';
    ctx.beginPath();
    ctx.arc(r.x + 16, r.y + HUD_H + 12, 5, 0, Math.PI * 2);
    ctx.arc(r.x + 26, r.y + HUD_H + 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWalls(ctx, parsed) {
  for (const w of parsed.walls) {
    const r = tileRect(w);
    ctx.fillStyle = '#2c3448';
    ctx.fillRect(r.x, r.y + HUD_H, r.w, r.h);
    ctx.fillStyle = '#3d4a66';
    ctx.fillRect(r.x, r.y + HUD_H, r.w, 5);
  }
}

function drawExit(ctx, parsed, time) {
  const r = tileRect(parsed.exit);
  const cx = r.x + TILE / 2;
  const cy = r.y + HUD_H + TILE / 2;
  const pulse = 0.55 + Math.sin(time * 3) * 0.2;
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
  glow.addColorStop(0, `rgba(64,224,120,${pulse})`);
  glow.addColorStop(1, 'rgba(64,224,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 34, cy - 34, 68, 68);
  ctx.fillStyle = '#2fbf6a';
  ctx.fillRect(r.x + 8, r.y + HUD_H + 8, TILE - 16, TILE - 16);
  ctx.fillStyle = '#0a0d14';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', cx, cy);
}

function drawCone(ctx, guard) {
  const hot = guard.suspicion > 0.25;
  const alpha = hot ? 0.34 : 0.20;
  ctx.fillStyle = hot ? `rgba(255,72,72,${alpha})` : `rgba(255,214,64,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y + HUD_H);
  ctx.arc(guard.x, guard.y + HUD_H, CONE_RANGE, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hot ? 'rgba(255,72,72,0.5)' : 'rgba(255,214,64,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard) {
  const y = guard.y + HUD_H;
  ctx.fillStyle = guard.state === 'chase' ? '#ff4040' : '#d83a3a';
  ctx.beginPath();
  ctx.arc(guard.x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 6, y + Math.sin(guard.facing) * 6, 4, 0, Math.PI * 2);
  ctx.fill();
  if (guard.suspicion > 0.05) {
    const w = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(guard.x - w / 2, y - 28, w, 5);
    ctx.fillStyle = guard.suspicion > 0.7 ? '#ff4040' : '#ffd23e';
    ctx.fillRect(guard.x - w / 2, y - 28, w * guard.suspicion, 5);
  }
  if (guard.state === 'investigate' || guard.state === 'suspicious') {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, y - 32);
  } else if (guard.state === 'chase') {
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, y - 32);
  }
}

function drawPlayer(ctx, player, time) {
  const y = player.y + HUD_H;
  for (const ring of player.rings) {
    const age = (time - ring.born) / 0.7;
    if (age < 0 || age > 1) continue;
    ctx.strokeStyle = `rgba(140,200,255,${0.5 * (1 - age)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, y, 8 + age * ring.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.hiddenInBush) {
    ctx.fillStyle = 'rgba(42,107,58,0.45)';
    ctx.beginPath();
    ctx.arc(player.x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = player.crouching ? '#7fb3ff' : '#4d9fff';
  ctx.beginPath();
  ctx.arc(player.x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dceaff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, y);
  ctx.lineTo(player.x + Math.cos(player.facing) * 15, y + Math.sin(player.facing) * 15);
  ctx.stroke();
  if (player.crouching) {
    ctx.fillStyle = '#dceaff';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CROUCH', player.x, y + 24);
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SHADOW LINE  ·  ${LEVELS[game.levelIndex].name}`, 16, 22);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#9aa5bd';
  ctx.fillText(
    `Level ${game.levelIndex + 1}/${LEVELS.length}   Time ${formatTime(game.elapsed)}   Spotted ${game.timesSpotted}x`,
    16,
    46,
  );
  const meterX = 620;
  const meterW = 220;
  ctx.fillStyle = '#9aa5bd';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DETECTION', meterX, 22);
  ctx.fillStyle = '#232a3d';
  ctx.fillRect(meterX, 34, meterW, 12);
  const heat = game.maxSuspicion;
  ctx.fillStyle = heat > 0.7 ? '#ff4040' : heat > 0.25 ? '#ffd23e' : '#4d9fff';
  ctx.fillRect(meterX, 34, meterW * heat, 12);
  ctx.strokeStyle = '#4a5570';
  ctx.strokeRect(meterX, 34, meterW, 12);
  ctx.fillStyle = game.noiseLabel === 'LOUD' ? '#ff9d5c' : '#9aa5bd';
  ctx.textAlign = 'right';
  ctx.fillText(`NOISE: ${game.noiseLabel}`, 944, 22);
  ctx.fillStyle = '#9aa5bd';
  ctx.fillText(game.stanceLabel, 944, 46);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6,8,14,0.82)';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, 250);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, 310 + i * 30);
  });
}

export function render(ctx, game, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.screen === 'title') {
    drawTitle(ctx, time);
    return;
  }
  const parsed = game.parsed;
  drawFloor(ctx, parsed);
  drawExit(ctx, parsed, time);
  drawCover(ctx, parsed);
  drawWalls(ctx, parsed);
  for (const guard of game.guards) drawCone(ctx, guard);
  for (const guard of game.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, game.player, time);
  drawHud(ctx, game);
  if (game.screen === 'caught') {
    overlay(ctx, 'CAUGHT!', [
      'A guard got you. The patrols reset — learn their rhythm and try again.',
      'Press R to restart the level, or Enter to go back to the title.',
    ], '#ff4040');
  } else if (game.screen === 'win') {
    overlay(ctx, 'YOU MADE IT OUT', [
      `All ${LEVELS.length} levels cleared in ${formatTime(game.elapsed)} with ${game.timesSpotted} alarms raised.`,
      `Rating: ${game.rating}`,
      'Press Enter to play again.',
    ], '#40e078');
  } else if (game.screen === 'levelclear') {
    overlay(ctx, 'LEVEL CLEAR', [
      LEVELS[game.levelIndex].name + ' — you slipped past every guard.',
      'Press Enter for the next level.',
    ], '#40e078');
  } else if (game.paused) {
    overlay(ctx, 'PAUSED', ['Press P to keep sneaking.'], '#e8ecf4');
  }
}

function drawTitle(ctx, time) {
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const glow = ctx.createRadialGradient(480, 300, 10, 480, 300, 420);
  glow.addColorStop(0, 'rgba(77,159,255,0.16)');
  glow.addColorStop(1, 'rgba(77,159,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('SHADOW LINE', VIEW_W / 2, 200);
  ctx.fillStyle = '#ffd23e';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('a top-down stealth game', VIEW_W / 2, 248);
  ctx.fillStyle = '#9aa5bd';
  ctx.font = '16px system-ui, sans-serif';
  const lines = [
    'Sneak past the guards. Stay out of the yellow cones,',
    'hide in bushes, use crates for cover and shadows to stay unseen.',
    'Reach the green EXIT without being caught.',
    '',
    'WASD / arrows — move      Shift — run (loud!)      C — crouch (quiet)',
    'P — pause      R — restart level',
    '',
    'Press Enter to start',
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, 310 + i * 26);
  });
  const blink = 0.5 + Math.sin(time * 4) * 0.5;
  ctx.fillStyle = `rgba(232,236,244,${0.4 + blink * 0.6})`;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('▶  PRESS ENTER  ◀', VIEW_W / 2, 560);
}
