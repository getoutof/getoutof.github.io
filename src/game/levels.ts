import { BALL_RADIUS, TARGET_RADIUS, WORLD, type Rect, type Vec } from "./math.ts";

export type LevelDef = {
  name: string;
  wind: Vec;
  ball: Vec;
  platforms: Rect[];
  targets: Vec[];
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

export const LEVELS: LevelDef[] = [
  {
    name: "Первый бросок",
    wind: { x: 0, y: 0 },
    ball: ballOn(58),
    platforms: [floor(0, WORLD.w)],
    targets: [beaconOn(292)],
  },
  {
    name: "Два маяка",
    wind: { x: 0, y: 0 },
    ball: ballOn(48),
    platforms: [floor(0, WORLD.w)],
    targets: [beaconOn(188), beaconOn(308)],
  },
  {
    name: "Через пропасть",
    wind: { x: 0, y: 0 },
    ball: ballOn(52, 370),
    platforms: [floor(0, 110, 370), floor(250, 110, 370)],
    targets: [beaconOn(300, 370)],
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
  },
  {
    name: "Боковой ветер",
    wind: { x: 92, y: 0 },
    ball: ballOn(56),
    platforms: [floor(0, WORLD.w), { x: 210, y: 270, w: 100, h: 16 }],
    targets: [{ x: 258, y: 238 }],
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
  },
];

export function targetCircles(level: LevelDef) {
  return level.targets.map((t) => ({ ...t, r: TARGET_RADIUS }));
}
