import {
  BALL_RADIUS,
  GRAVITY,
  GROUND_FRICTION,
  REST_SPEED,
  RESTITUTION,
  type Circle,
  type Rect,
  type Vec,
} from "./math.ts";

export type Ball = {
  pos: Vec;
  vel: Vec;
  r: number;
};

export type World = {
  ball: Ball;
  platforms: Rect[];
  wind: Vec;
};

export function createBall(pos: Vec): Ball {
  return { pos: { ...pos }, vel: { x: 0, y: 0 }, r: BALL_RADIUS };
}

export function stepWorld(world: World, dt: number): void {
  const { ball } = world;
  ball.vel.x += world.wind.x * dt;
  ball.vel.y += (GRAVITY + world.wind.y) * dt;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;

  for (const platform of world.platforms) {
    resolveCircleRect(ball, platform, dt);
  }
}

export function speed(ball: Ball): number {
  return Math.hypot(ball.vel.x, ball.vel.y);
}

export function isResting(ball: Ball): boolean {
  return speed(ball) < REST_SPEED;
}

export function isSupported(ball: Ball, platforms: Rect[]): boolean {
  return platforms.some((rect) => {
    const closestX = Math.max(rect.x, Math.min(ball.pos.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(ball.pos.y, rect.y + rect.h));
    const d = Math.hypot(ball.pos.x - closestX, ball.pos.y - closestY);
    return d <= ball.r + 1.5;
  });
}

export function hitsCircle(ball: Ball, c: Circle): boolean {
  const dx = ball.pos.x - c.x;
  const dy = ball.pos.y - c.y;
  return dx * dx + dy * dy <= (ball.r + c.r) * (ball.r + c.r);
}

function resolveCircleRect(ball: Ball, rect: Rect, dt: number): void {
  const closestX = Math.max(rect.x, Math.min(ball.pos.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(ball.pos.y, rect.y + rect.h));
  let nx = ball.pos.x - closestX;
  let ny = ball.pos.y - closestY;
  const d2 = nx * nx + ny * ny;
  if (d2 > ball.r * ball.r) return;

  let d = Math.sqrt(d2);
  if (d === 0) {
    const left = ball.pos.x - rect.x;
    const right = rect.x + rect.w - ball.pos.x;
    const top = ball.pos.y - rect.y;
    const bottom = rect.y + rect.h - ball.pos.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) {
      nx = -1;
      ny = 0;
    } else if (min === right) {
      nx = 1;
      ny = 0;
    } else if (min === top) {
      nx = 0;
      ny = -1;
    } else {
      nx = 0;
      ny = 1;
    }
    d = 0;
  } else {
    nx /= d;
    ny /= d;
  }

  const overlap = ball.r - d;
  ball.pos.x += nx * overlap;
  ball.pos.y += ny * overlap;

  const vn = ball.vel.x * nx + ball.vel.y * ny;
  if (vn < 0) {
    ball.vel.x -= (1 + RESTITUTION) * vn * nx;
    ball.vel.y -= (1 + RESTITUTION) * vn * ny;
  }

  const isFloor = ny < -0.7;
  if (isFloor && Math.abs(ball.vel.y) < REST_SPEED) {
    ball.vel.y = 0;
    const damp = Math.exp(-GROUND_FRICTION * dt);
    ball.vel.x *= damp;
    if (Math.abs(ball.vel.x) < 8) ball.vel.x = 0;
  }
}
