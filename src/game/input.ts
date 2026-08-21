import { clampVec, MAX_PULL, type Vec } from "./math.ts";

export type Aim = {
  origin: Vec;
  pull: Vec;
};

export const STICK_KNOB_R = 18;

export function stickWellRadius(scale: number): number {
  return MAX_PULL * scale * 0.42;
}

export function stickKnobTravel(scale: number): number {
  return stickWellRadius(scale) + STICK_KNOB_R;
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

export function knobFromPull(pad: Vec, pull: Vec, scale: number): Vec {
  const p = Math.hypot(pull.x, pull.y);
  if (p === 0) return { x: pad.x, y: pad.y };
  const t = Math.min(p * scale, stickKnobTravel(scale));
  return { x: pad.x - (pull.x / p) * t, y: pad.y - (pull.y / p) * t };
}

export function inControlZone(pad: Vec, pointer: Vec, scale: number): boolean {
  return Math.hypot(pointer.x - pad.x, pointer.y - pad.y) < stickKnobTravel(scale) + 24;
}
