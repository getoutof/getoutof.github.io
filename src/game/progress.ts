import { LEVELS } from "./levels.ts";
import { clamp } from "./math.ts";

const KEY = "trajectry.bestStars";

export function starsFromShots(shots: number): number {
  if (shots <= 1) return 3;
  if (shots === 2) return 2;
  return 1;
}

export function emptyStars(): number[] {
  return LEVELS.map(() => 0);
}

export function loadBestStars(): number[] {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return emptyStars();
    return LEVELS.map((_, i) => {
      const n = Number(raw[i]);
      return Number.isFinite(n) ? clamp(Math.round(n), 0, 3) : 0;
    });
  } catch {
    return emptyStars();
  }
}

export function rememberStars(levelIndex: number, stars: number): number[] {
  const best = loadBestStars();
  if (levelIndex < 0 || levelIndex >= best.length) return best;
  best[levelIndex] = Math.max(best[levelIndex] ?? 0, clamp(stars, 0, 3));
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(best));
  } catch {
    /* private mode */
  }
  return best;
}

export function firstOpenLevel(): number {
  const i = loadBestStars().findIndex((stars) => stars === 0);
  return i === -1 ? 0 : i;
}
