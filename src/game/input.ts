import { clamp, clampVec, MAX_PULL, type Vec } from "./math.ts";

export type Aim = {
  origin: Vec;
  pull: Vec;
  pointer: Vec;
};

export const STICK_KNOB_R = 18;

export function stickWellRadius(scale: number): number {
  return MAX_PULL * scale * 0.42;
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

export function knobFromPointer(
  pointer: Vec,
  view: { w: number; h: number },
  safeBottom: number,
): Vec {
  return {
    x: clamp(pointer.x, STICK_KNOB_R, view.w - STICK_KNOB_R),
    y: clamp(pointer.y, STICK_KNOB_R, view.h - safeBottom - STICK_KNOB_R),
  };
}

export function inControlZone(pad: Vec, pointer: Vec, scale: number): boolean {
  return Math.hypot(pointer.x - pad.x, pointer.y - pad.y) < stickWellRadius(scale) + 28;
}
