import { clamp, clampVec, MAX_PULL, type Vec } from "./math.ts";

export type Aim = {
  origin: Vec;
  pull: Vec;
};

export const STICK_KNOB_R = 18;

export function stickWellRadius(scale: number): number {
  return MAX_PULL * scale * 0.42;
}

export function distToScreenEdge(
  pad: Vec,
  dir: Vec,
  view: { w: number; h: number },
  safeBottom: number,
  margin: number,
): number {
  let t = Number.POSITIVE_INFINITY;
  if (dir.x > 1e-6) t = Math.min(t, (view.w - margin - pad.x) / dir.x);
  else if (dir.x < -1e-6) t = Math.min(t, (margin - pad.x) / dir.x);
  const bottom = view.h - safeBottom - margin;
  if (dir.y > 1e-6) t = Math.min(t, (bottom - pad.y) / dir.y);
  else if (dir.y < -1e-6) t = Math.min(t, (margin - pad.y) / dir.y);
  return Math.max(0, t);
}

export function worldFromClient(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  offsetX: number,
  offsetY: number,
  scale: number,
): Vec {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - offsetX) / scale,
    y: (clientY - rect.top - offsetY) / scale,
  };
}

export function clientOnCanvas(clientX: number, clientY: number, canvas: HTMLCanvasElement): Vec {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

export function aimFromStick(pad: Vec, pointer: Vec, scale: number): Vec {
  return clampVec(
    {
      x: (pad.x - pointer.x) / scale,
      y: (pad.y - pointer.y) / scale,
    },
    MAX_PULL,
  );
}

export function knobFromPull(
  pad: Vec,
  pull: Vec,
  view: { w: number; h: number },
  safeBottom: number,
): Vec {
  const p = Math.hypot(pull.x, pull.y);
  if (p === 0) return { x: pad.x, y: pad.y };
  const dir = { x: -pull.x / p, y: -pull.y / p };
  const edge = distToScreenEdge(pad, dir, view, safeBottom, STICK_KNOB_R);
  const t = (p / MAX_PULL) * edge;
  return {
    x: clamp(pad.x + dir.x * t, STICK_KNOB_R, view.w - STICK_KNOB_R),
    y: clamp(pad.y + dir.y * t, STICK_KNOB_R, view.h - safeBottom - STICK_KNOB_R),
  };
}

export function inControlZone(pad: Vec, pointer: Vec, scale: number): boolean {
  return Math.hypot(pointer.x - pad.x, pointer.y - pad.y) < stickWellRadius(scale) + 28;
}
