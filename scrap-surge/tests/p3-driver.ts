import type { Game } from "../src/sim";
import type { Vec } from "../src/math";

const CENTER = { x: 600, y: 450 };
const ORBIT_RADIUS = 175;
const ORBIT_TANGENT_WEIGHT = 0.85;
const RADIAL_CORRECTION_WEIGHT = 0.35;
const ENEMY_AVOID_RADIUS = 260;
const ENEMY_AVOID_WEIGHT = 2.4;
const BULLET_AVOID_RADIUS = 165;
const BULLET_LOOKAHEAD = 0.45;
const BULLET_AVOID_WEIGHT = 4.8;
const SCRAP_RADIUS = 300;
const SCRAP_WEIGHT = 0.9;
const CHEST_RADIUS = 520;
const CHEST_WEIGHT = 1.4;
const WALL_MARGIN = 92;
const WALL_WEIGHT = 3.2;

function add(vector: Vec, x: number, y: number) {
  vector.x += x;
  vector.y += y;
}

function away(vector: Vec, from: Vec, to: Vec, weight: number) {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-9) return;
  add(vector, (dx / length) * weight, (dy / length) * weight);
}

function toward(vector: Vec, from: Vec, to: Vec, weight: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-9) return;
  add(vector, (dx / length) * weight, (dy / length) * weight);
}

// This is the sole movement/avoidance controller for all seven primary cohorts.
// It is deterministic, reads current public world state, and never mutates Game.
export function movementInput(game: Game): Vec {
  const player = game.player;
  const desired: Vec = { x: 0, y: 0 };
  const fromCenter = {
    x: player.x - CENTER.x,
    y: player.y - CENTER.y,
  };
  const radius = Math.hypot(fromCenter.x, fromCenter.y);
  const radial = {
    x: radius > 1e-9 ? fromCenter.x / radius : 1,
    y: radius > 1e-9 ? fromCenter.y / radius : 0,
  };
  const radialError = (ORBIT_RADIUS - radius) / Math.max(ORBIT_RADIUS, 1);
  add(
    desired,
    radial.x * radialError * RADIAL_CORRECTION_WEIGHT,
    radial.y * radialError * RADIAL_CORRECTION_WEIGHT,
  );
  const tangentSign = game.time % 40 < 20 ? 1 : -1;
  add(
    desired,
    -radial.y * tangentSign * ORBIT_TANGENT_WEIGHT,
    radial.x * tangentSign * ORBIT_TANGENT_WEIGHT,
  );

  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) continue;
    const predicted = {
      x: enemy.x + enemy.vx * 0.25,
      y: enemy.y + enemy.vy * 0.25,
    };
    const distance = Math.hypot(predicted.x - player.x, predicted.y - player.y);
    if (distance >= ENEMY_AVOID_RADIUS) continue;
    const influence =
      Math.pow(1 - distance / ENEMY_AVOID_RADIUS, 2) * ENEMY_AVOID_WEIGHT;
    away(desired, player, predicted, influence);
  }

  for (const bullet of game.bullets) {
    if (bullet.kind !== "enemy" || bullet.life <= 0) continue;
    const predicted = {
      x: bullet.x + bullet.vx * BULLET_LOOKAHEAD,
      y: bullet.y + bullet.vy * BULLET_LOOKAHEAD,
    };
    const distance = Math.hypot(predicted.x - player.x, predicted.y - player.y);
    if (distance >= BULLET_AVOID_RADIUS) continue;
    const influence =
      Math.pow(1 - distance / BULLET_AVOID_RADIUS, 2) * BULLET_AVOID_WEIGHT;
    away(desired, player, predicted, influence);
  }

  let nearestScrap: Vec | null = null;
  let nearestScrapDistance = Number.POSITIVE_INFINITY;
  for (const scrap of game.scraps) {
    if (scrap.collected === true) continue;
    const distance = Math.hypot(scrap.x - player.x, scrap.y - player.y);
    if (distance < nearestScrapDistance) {
      nearestScrap = scrap;
      nearestScrapDistance = distance;
    }
  }
  if (nearestScrap && nearestScrapDistance < SCRAP_RADIUS) {
    toward(
      desired,
      player,
      nearestScrap,
      (1 - nearestScrapDistance / SCRAP_RADIUS) * SCRAP_WEIGHT,
    );
  }

  let nearestChest: Vec | null = null;
  let nearestChestDistance = Number.POSITIVE_INFINITY;
  for (const chest of game.chests) {
    const distance = Math.hypot(chest.x - player.x, chest.y - player.y);
    if (distance < nearestChestDistance) {
      nearestChest = chest;
      nearestChestDistance = distance;
    }
  }
  if (nearestChest && nearestChestDistance < CHEST_RADIUS) {
    toward(
      desired,
      player,
      nearestChest,
      (1 - nearestChestDistance / CHEST_RADIUS) * CHEST_WEIGHT,
    );
  }

  if (player.x < WALL_MARGIN)
    add(desired, (1 - player.x / WALL_MARGIN) * WALL_WEIGHT, 0);
  if (player.x > 1200 - WALL_MARGIN)
    add(desired, -(1 - (1200 - player.x) / WALL_MARGIN) * WALL_WEIGHT, 0);
  if (player.y < WALL_MARGIN)
    add(desired, 0, (1 - player.y / WALL_MARGIN) * WALL_WEIGHT);
  if (player.y > 900 - WALL_MARGIN)
    add(desired, 0, -(1 - (900 - player.y) / WALL_MARGIN) * WALL_WEIGHT);

  const length = Math.hypot(desired.x, desired.y);
  if (length <= 1e-9) {
    return { x: -radial.y * tangentSign, y: radial.x * tangentSign };
  }
  return { x: desired.x / length, y: desired.y / length };
}
