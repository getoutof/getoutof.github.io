import { clampVec, MAX_PULL, type Vec } from "./math.ts";

export type Pointer = {
  id: number;
  world: Vec;
};

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

export function aimFromPointer(ball: Vec, pointer: Vec): Aim {
  const pull = clampVec(
    { x: ball.x - pointer.x, y: ball.y - pointer.y },
    MAX_PULL,
  );
  return { origin: ball, pull };
}
