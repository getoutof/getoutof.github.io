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

export type LevelDef = {
  name: string;
  wind: Vec;
  ball: Vec;
  platforms: Rect[];
  targets: Vec[];
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
];

export function targetCircles(level: LevelDef) {
  return level.targets.map((t) => ({ ...t, r: TARGET_RADIUS }));
}
