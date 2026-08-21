import { TARGET_RADIUS, WORLD, type Rect, type Vec } from "./math.ts";

export type LevelDef = {
  name: string;
  wind: Vec;
  ball: Vec;
  platforms: Rect[];
  targets: Vec[];
};

export const LEVELS: LevelDef[] = [
  {
    name: "Первый бросок",
    wind: { x: 0, y: 0 },
    ball: { x: 58, y: 579 },
    platforms: [{ x: 0, y: 590, w: WORLD.w, h: 50 }],
    targets: [{ x: 292, y: 558 }],
  },
  {
    name: "Два маяка",
    wind: { x: 0, y: 0 },
    ball: { x: 48, y: 579 },
    platforms: [{ x: 0, y: 590, w: WORLD.w, h: 50 }],
    targets: [
      { x: 188, y: 558 },
      { x: 308, y: 558 },
    ],
  },
  {
    name: "Через пропасть",
    wind: { x: 0, y: 0 },
    ball: { x: 52, y: 519 },
    platforms: [
      { x: 0, y: 530, w: 110, h: 110 },
      { x: 250, y: 530, w: 110, h: 110 },
    ],
    targets: [{ x: 300, y: 498 }],
  },
  {
    name: "Банк от стены",
    wind: { x: 0, y: 0 },
    ball: { x: 54, y: 579 },
    platforms: [
      { x: 0, y: 590, w: WORLD.w, h: 50 },
      { x: 328, y: 220, w: 32, h: 370 },
      { x: 180, y: 430, w: 90, h: 18 },
    ],
    targets: [{ x: 224, y: 398 }],
  },
  {
    name: "Боковой ветер",
    wind: { x: 92, y: 0 },
    ball: { x: 56, y: 579 },
    platforms: [
      { x: 0, y: 590, w: WORLD.w, h: 50 },
      { x: 210, y: 430, w: 100, h: 16 },
    ],
    targets: [{ x: 258, y: 398 }],
  },
  {
    name: "Три орбиты",
    wind: { x: -48, y: 0 },
    ball: { x: 50, y: 579 },
    platforms: [
      { x: 0, y: 590, w: WORLD.w, h: 50 },
      { x: 130, y: 470, w: 80, h: 16 },
      { x: 250, y: 350, w: 90, h: 16 },
      { x: 0, y: 250, w: 24, h: 340 },
    ],
    targets: [
      { x: 168, y: 438 },
      { x: 292, y: 318 },
      { x: 292, y: 558 },
    ],
  },
];

export function targetCircles(level: LevelDef) {
  return level.targets.map((t) => ({ ...t, r: TARGET_RADIUS }));
}
