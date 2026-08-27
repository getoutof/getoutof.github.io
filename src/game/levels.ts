import { BALL_RADIUS, TARGET_RADIUS, WORLD, type Rect, type Vec } from "./math.ts";

/** Visual-only backdrop. Does not affect physics, hitboxes, or layout. */
export type SkyNebula = {
  x: number;
  y: number;
  r: number;
  color: string;
  alpha: number;
};

export type SkyPlanet = {
  x: number;
  y: number;
  r: number;
  lit?: "left" | "right";
};

export type SkyDef = {
  top: string;
  bottom: string;
  stars: number;
  nebulae: SkyNebula[];
  planet?: SkyPlanet;
};

/**
 * Beacon motion the Designer can attach to a target.
 *
 * `{x,y}` on the target is always the rest pose:
 *   - static: the beacon sits there
 *   - orbit: the circle's center
 *   - line: one end of the patrol
 *
 * - `orbit`: around rest pose, `radius` world units, `period` seconds per revolution.
 *   Optional `phase` is turns in 0–1 (default 0). At phase 0 the beacon starts at rest +x.
 * - `line`: patrol rest pose ↔ `to`. `period` is seconds per round trip (out and back).
 *   Optional `phase` is 0–1 along that trip (default 0 = at rest).
 *
 * Examples:
 *   { x: 200, y: 240 }
 *   { x: 180, y: 200, motion: { kind: "orbit", radius: 40, period: 3 } }
 *   { x: 80, y: 300, motion: { kind: "line", to: { x: 280, y: 300 }, period: 4, phase: 0.25 } }
 */
export type TargetMotion =
  | { kind: "orbit"; radius: number; period: number; phase?: number }
  | { kind: "line"; to: Vec; period: number; phase?: number };

/** A beacon. Plain `{x,y}` / `beaconOn(...)` stays static. Add `motion` for orbit or line. */
export type TargetDef = Vec & { motion?: TargetMotion };

export type LevelDef = {
  name: string;
  wind: Vec;
  ball: Vec;
  platforms: Rect[];
  targets: TargetDef[];
  sky: SkyDef;
};

/** Top of the floor — high enough that a full pull-back stays on screen. */
export const GROUND_TOP = 430;

function floor(x: number, w: number, top = GROUND_TOP): Rect {
  return { x, y: top, w, h: WORLD.h - top };
}

function ballOn(x: number, top = GROUND_TOP): Vec {
  return { x, y: top - BALL_RADIUS };
}

function beaconOn(x: number, top = GROUND_TOP): Vec {
  return { x, y: top - 32 };
}

const NAVY_NEBULA: SkyNebula[] = [
  { x: 240, y: 190, r: 175, color: "#3d6cb0", alpha: 0.13 },
  { x: 80, y: 330, r: 130, color: "#1e3a68", alpha: 0.1 },
];

export const LEVELS: LevelDef[] = [
  {
    name: "Первый бросок",
    wind: { x: 0, y: 0 },
    ball: ballOn(58),
    platforms: [floor(0, WORLD.w)],
    targets: [beaconOn(292)],
    sky: {
      top: "#070b14",
      bottom: "#10182a",
      stars: 70,
      nebulae: NAVY_NEBULA,
      planet: { x: 54, y: 86, r: 28, lit: "right" },
    },
  },
  {
    name: "Два маяка",
    wind: { x: 0, y: 0 },
    ball: ballOn(48),
    platforms: [floor(0, WORLD.w)],
    targets: [beaconOn(188), beaconOn(308)],
    sky: {
      top: "#070b14",
      bottom: "#111a2c",
      stars: 96,
      nebulae: NAVY_NEBULA,
    },
  },
  {
    name: "Через пропасть",
    wind: { x: 0, y: 0 },
    ball: ballOn(52, 370),
    platforms: [floor(0, 110, 370), floor(250, 110, 370)],
    targets: [beaconOn(300, 370)],
    sky: {
      top: "#04050a",
      bottom: "#080a12",
      stars: 32,
      nebulae: [],
    },
  },
  {
    name: "Банк от стены",
    wind: { x: 0, y: 0 },
    ball: ballOn(54),
    platforms: [
      floor(0, WORLD.w),
      { x: 328, y: 60, w: 32, h: GROUND_TOP - 60 },
      { x: 180, y: 270, w: 90, h: 18 },
    ],
    targets: [{ x: 224, y: 238 }],
    sky: {
      top: "#070b14",
      bottom: "#0c1422",
      stars: 64,
      nebulae: [{ x: 160, y: 200, r: 150, color: "#2a4480", alpha: 0.1 }],
    },
  },
  {
    name: "Боковой ветер",
    wind: { x: 92, y: 0 },
    ball: ballOn(56),
    platforms: [floor(0, WORLD.w), { x: 210, y: 270, w: 100, h: 16 }],
    targets: [{ x: 258, y: 238 }],
    sky: {
      top: "#061018",
      bottom: "#0a1a24",
      stars: 108,
      nebulae: [
        { x: 200, y: 170, r: 210, color: "#4ec8dc", alpha: 0.16 },
        { x: 70, y: 90, r: 140, color: "#7df0ff", alpha: 0.09 },
        { x: 300, y: 280, r: 120, color: "#2a8aaa", alpha: 0.1 },
      ],
    },
  },
  {
    name: "Три орбиты",
    wind: { x: -48, y: 0 },
    ball: ballOn(50),
    platforms: [
      floor(0, WORLD.w),
      { x: 130, y: 310, w: 80, h: 16 },
      { x: 250, y: 190, w: 90, h: 16 },
      { x: 0, y: 90, w: 24, h: GROUND_TOP - 90 },
    ],
    targets: [
      { x: 168, y: 278 },
      { x: 292, y: 158 },
      beaconOn(292),
    ],
    sky: {
      top: "#0c0c14",
      bottom: "#161018",
      stars: 78,
      nebulae: [
        { x: 150, y: 230, r: 190, color: "#c47a3a", alpha: 0.14 },
        { x: 280, y: 120, r: 110, color: "#e09050", alpha: 0.08 },
      ],
      planet: { x: 312, y: 70, r: 16, lit: "left" },
    },
  },
  {
    name: "Карусель",
    wind: { x: 0, y: 0 },
    ball: ballOn(58),
    platforms: [floor(0, WORLD.w)],
    targets: [{ x: 210, y: 250, motion: { kind: "orbit", radius: 48, period: 3.5 } }],
    sky: {
      top: "#071018",
      bottom: "#0e1c2c",
      stars: 88,
      nebulae: [
        { x: 210, y: 240, r: 160, color: "#3d8cb8", alpha: 0.14 },
        { x: 80, y: 120, r: 100, color: "#5ec8e0", alpha: 0.08 },
      ],
      planet: { x: 42, y: 78, r: 18, lit: "right" },
    },
  },
  {
    name: "Маятник",
    wind: { x: 0, y: 0 },
    ball: ballOn(52),
    platforms: [floor(0, WORLD.w), { x: 88, y: 278, w: 184, h: 16 }],
    targets: [{ x: 96, y: 236, motion: { kind: "line", to: { x: 264, y: 220 }, period: 4 } }],
    sky: {
      top: "#080c16",
      bottom: "#12182a",
      stars: 74,
      nebulae: [
        { x: 180, y: 160, r: 200, color: "#2a5088", alpha: 0.12 },
        { x: 300, y: 300, r: 90, color: "#1e3a68", alpha: 0.1 },
      ],
    },
  },
  {
    name: "Три берега",
    wind: { x: 0, y: 0 },
    ball: ballOn(36),
    platforms: [floor(0, 70), floor(155, 50), floor(300, 60)],
    targets: [beaconOn(330)],
    sky: {
      top: "#05060c",
      bottom: "#0a0c16",
      stars: 44,
      nebulae: [{ x: 180, y: 360, r: 140, color: "#1a2848", alpha: 0.12 }],
    },
  },
  {
    name: "Восходящий",
    wind: { x: 0, y: -70 },
    ball: ballOn(54),
    platforms: [floor(0, WORLD.w), { x: 248, y: 108, w: 96, h: 16 }],
    targets: [beaconOn(298, 108)],
    sky: {
      top: "#05141c",
      bottom: "#0a2030",
      stars: 100,
      nebulae: [
        { x: 180, y: 80, r: 180, color: "#4ec8dc", alpha: 0.14 },
        { x: 90, y: 220, r: 120, color: "#7df0ff", alpha: 0.07 },
      ],
      planet: { x: 48, y: 64, r: 18, lit: "right" },
    },
  },
  {
    name: "Две орбиты",
    wind: { x: 40, y: 0 },
    ball: ballOn(50),
    platforms: [floor(0, WORLD.w), { x: 230, y: 310, w: 110, h: 16 }],
    targets: [
      { x: 150, y: 250, motion: { kind: "orbit", radius: 44, period: 3.1 } },
      { x: 268, y: 155, motion: { kind: "orbit", radius: 32, period: 4.8, phase: 0.42 } },
    ],
    sky: {
      top: "#070e18",
      bottom: "#101a28",
      stars: 92,
      nebulae: [
        { x: 100, y: 180, r: 130, color: "#3d6cb0", alpha: 0.13 },
        { x: 260, y: 120, r: 120, color: "#5aa0c8", alpha: 0.11 },
      ],
    },
  },
  {
    name: "Последний круг",
    wind: { x: 44, y: -66 },
    ball: ballOn(46, 395),
    platforms: [floor(0, 100, 395), floor(252, 108, 395)],
    targets: [{ x: 298, y: 308, motion: { kind: "orbit", radius: 42, period: 3.4, phase: 0.12 } }],
    sky: {
      top: "#100c14",
      bottom: "#1a1418",
      stars: 84,
      nebulae: [
        { x: 160, y: 200, r: 200, color: "#c47a3a", alpha: 0.15 },
        { x: 300, y: 90, r: 100, color: "#e09050", alpha: 0.09 },
      ],
      planet: { x: 40, y: 78, r: 22, lit: "right" },
    },
  },
];

function pingPong(tau: number): number {
  const u = tau - Math.floor(tau);
  return u < 0.5 ? u * 2 : 2 - u * 2;
}

/** Live beacon position at sim time (seconds). Pause freezes this because `state.time` does not advance. */
export function targetPos(target: TargetDef, time: number): Vec {
  const motion = target.motion;
  if (!motion) return { x: target.x, y: target.y };
  const phase = motion.phase ?? 0;
  const tau = motion.period > 0 ? time / motion.period + phase : phase;
  if (motion.kind === "orbit") {
    const a = tau * Math.PI * 2;
    return {
      x: target.x + motion.radius * Math.cos(a),
      y: target.y + motion.radius * Math.sin(a),
    };
  }
  const t = pingPong(tau);
  return {
    x: target.x + (motion.to.x - target.x) * t,
    y: target.y + (motion.to.y - target.y) * t,
  };
}

export function targetCircles(level: LevelDef, time = 0) {
  return level.targets.map((t) => {
    const p = targetPos(t, time);
    return { x: p.x, y: p.y, r: TARGET_RADIUS };
  });
}
