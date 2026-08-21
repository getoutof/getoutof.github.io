import { clampVec, MAX_PULL, type Vec } from "./math.ts";

export type Aim = {
  origin: Vec;
  pull: Vec;
};

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

export function inControlZone(pad: Vec, pointer: Vec, viewH: number): boolean {
  if (Math.hypot(pointer.x - pad.x, pointer.y - pad.y) < 130) return true;
  return pointer.y > viewH - 160;
}
