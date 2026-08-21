export type Vec = { x: number; y: number };

export type Rect = { x: number; y: number; w: number; h: number };

export type Circle = { x: number; y: number; r: number };

export const WORLD = { w: 360, h: 640 } as const;

export const GRAVITY = 980;
export const MAX_PULL = 120;
export const LAUNCH_SCALE = 8.4;
export const RESTITUTION = 0.58;
export const GROUND_FRICTION = 6.5;
export const REST_SPEED = 18;
export const BALL_RADIUS = 11;
export const TARGET_RADIUS = 16;
export const MAX_SHOTS = 6;

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec, s: number): Vec {
  return { x: v.x * s, y: v.y * s };
}

export function len(v: Vec): number {
  return Math.hypot(v.x, v.y);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function clampVec(v: Vec, max: number): Vec {
  const d = len(v);
  if (d <= max || d === 0) return { x: v.x, y: v.y };
  return scale(v, max / d);
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clone(v: Vec): Vec {
  return { x: v.x, y: v.y };
}
