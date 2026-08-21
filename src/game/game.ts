import { aimFromPointer, worldFromClient } from "./input.ts";
import { LEVELS, targetCircles, type LevelDef } from "./levels.ts";
import { clone, LAUNCH_SCALE, MAX_SHOTS, WORLD, type Circle, type Vec } from "./math.ts";
import { createBall, hitsCircle, isResting, isSupported, speed, stepWorld, type Ball, type World } from "./physics.ts";

export type Phase = "title" | "aiming" | "flying" | "settle" | "win" | "fail";

export type Particle = {
  pos: Vec;
  vel: Vec;
  life: number;
  color: string;
};

export type Camera = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type GameState = {
  phase: Phase;
  levelIndex: number;
  shots: number;
  collected: boolean[];
  world: World;
  aim: { origin: Vec; pull: Vec } | null;
  particles: Particle[];
  trail: Vec[];
  shake: number;
  time: number;
  message: string;
  notice: string | null;
  noticeUntil: number;
};

type SfxHooks = {
  bounce: () => void;
  collect: () => void;
  win: () => void;
  fail: () => void;
};

const SETTLE_TIME = 0.45;
let settleTimer = 0;
let lastBounce = 0;

function buildWorld(level: LevelDef): World {
  return {
    ball: createBall(level.ball),
    platforms: level.platforms.map((p) => ({ ...p })),
    wind: { ...level.wind },
  };
}

export function createGame(): GameState {
  return resetLevel(0, "title");
}

export function currentLevel(state: GameState): LevelDef {
  return LEVELS[state.levelIndex] ?? LEVELS[0];
}

export function resetLevel(index: number, phase: Phase = "aiming"): GameState {
  const level = LEVELS[index] ?? LEVELS[0];
  settleTimer = 0;
  return {
    phase,
    levelIndex: index,
    shots: 0,
    collected: level.targets.map(() => false),
    world: buildWorld(level),
    aim: null,
    particles: [],
    trail: [],
    shake: 0,
    time: 0,
    message: level.name,
    notice: null,
    noticeUntil: 0,
  };
}

export function layoutCamera(viewW: number, viewH: number): Camera {
  const scale = Math.min(viewW / WORLD.w, viewH / WORLD.h);
  return {
    scale,
    offsetX: (viewW - WORLD.w * scale) / 2,
    offsetY: (viewH - WORLD.h * scale) / 2,
  };
}

export function clientToWorld(
  canvas: HTMLCanvasElement,
  camera: Camera,
  clientX: number,
  clientY: number,
): Vec {
  return worldFromClient(clientX, clientY, canvas, camera.offsetX, camera.offsetY, camera.scale);
}

export function predictPath(state: GameState, pull: Vec, steps = 42): Vec[] {
  const ghost: World = {
    ball: {
      pos: clone(state.world.ball.pos),
      vel: { x: pull.x * LAUNCH_SCALE, y: pull.y * LAUNCH_SCALE },
      r: state.world.ball.r,
    },
    platforms: state.world.platforms,
    wind: state.world.wind,
  };
  const path: Vec[] = [];
  const dt = 1 / 50;
  for (let i = 0; i < steps; i += 1) {
    stepWorld(ghost, dt);
    path.push(clone(ghost.ball.pos));
    if (ghost.ball.pos.y > WORLD.h + 40 || ghost.ball.pos.x < -40 || ghost.ball.pos.x > WORLD.w + 40) {
      break;
    }
  }
  return path;
}

export function pointerDown(state: GameState, world: Vec): void {
  if (state.phase !== "aiming") return;
  state.aim = aimFromPointer(state.world.ball.pos, world);
}

export function pointerMove(state: GameState, world: Vec): void {
  if (state.phase !== "aiming" || !state.aim) return;
  state.aim = aimFromPointer(state.world.ball.pos, world);
}

export function pointerUp(state: GameState, onLaunch: () => void): void {
  if (state.phase !== "aiming" || !state.aim) return;
  const power = Math.hypot(state.aim.pull.x, state.aim.pull.y);
  if (power < 12) {
    state.aim = null;
    return;
  }
  state.world.ball.vel = {
    x: state.aim.pull.x * LAUNCH_SCALE,
    y: state.aim.pull.y * LAUNCH_SCALE,
  };
  state.aim = null;
  state.phase = "flying";
  state.shots += 1;
  state.trail = [];
  onLaunch();
}

export function remainingShots(state: GameState): number {
  return Math.max(0, MAX_SHOTS - state.shots);
}

function attemptsWord(n: number): string {
  if (n === 1) return "попытка";
  if (n >= 2 && n <= 4) return "попытки";
  return "попыток";
}

export function tick(state: GameState, dt: number, sfx: SfxHooks): void {
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 18);
  if (state.notice && state.time >= state.noticeUntil) state.notice = null;
  updateParticles(state, dt);

  if (state.phase === "title") {
    idleBob(state.world.ball, state.time);
    return;
  }

  if (state.phase === "win" || state.phase === "fail") return;

  if (state.phase === "flying" || state.phase === "settle") {
    const prevVy = state.world.ball.vel.y;
    const prevSpeed = speed(state.world.ball);
    stepWorld(state.world, dt);
    const bounced = state.world.ball.vel.y < 0 && prevVy > 80 && prevSpeed > 90;
    if (bounced && state.time - lastBounce > 0.12) {
      lastBounce = state.time;
      state.shake = Math.min(7, prevSpeed / 180);
      sfx.bounce();
    }
    state.trail.push(clone(state.world.ball.pos));
    if (state.trail.length > 16) state.trail.shift();
    collectTargets(state, sfx);

    if (allCollected(state)) {
      state.phase = "win";
      burst(state, state.world.ball.pos, "#ffb703", 22);
      sfx.win();
      return;
    }

    if (outOfWorld(state.world.ball)) {
      if (state.shots >= MAX_SHOTS) {
        state.phase = "fail";
        state.message = "Шар укатился. Попытки закончились — 3 из 3";
        sfx.fail();
        return;
      }
      respawn(state);
      return;
    }

    if (state.phase === "flying" && isResting(state.world.ball) && isSupported(state.world.ball, state.world.platforms)) {
      state.phase = "settle";
      settleTimer = 0;
    }
  }

  if (state.phase === "settle") {
    settleTimer += dt;
    if (settleTimer >= SETTLE_TIME) {
      if (state.shots >= MAX_SHOTS && !allCollected(state)) {
        state.phase = "fail";
        state.message = "Попытки закончились — 3 из 3. Маяки не собраны";
        sfx.fail();
        return;
      }
      state.phase = "aiming";
      state.world.ball.vel = { x: 0, y: 0 };
      state.trail = [];
    }
  }
}

export function nextLevel(state: GameState): GameState {
  const next = state.levelIndex + 1;
  if (next >= LEVELS.length) return resetLevel(0);
  return resetLevel(next);
}

export function remainingTargets(state: GameState): Circle[] {
  return targetCircles(currentLevel(state)).filter((_, i) => !state.collected[i]);
}

function idleBob(ball: Ball, time: number): void {
  ball.pos.y = LEVELS[0].ball.y + Math.sin(time * 2.2) * 4;
}

function collectTargets(state: GameState, sfx: SfxHooks): void {
  const circles = targetCircles(currentLevel(state));
  circles.forEach((circle, index) => {
    if (state.collected[index]) return;
    if (hitsCircle(state.world.ball, circle)) {
      state.collected[index] = true;
      burst(state, circle, "#ffb703", 16);
      sfx.collect();
    }
  });
}

function allCollected(state: GameState): boolean {
  return state.collected.every(Boolean);
}

function outOfWorld(ball: Ball): boolean {
  return ball.pos.y > WORLD.h + 80 || ball.pos.x < -80 || ball.pos.x > WORLD.w + 80;
}

function respawn(state: GameState): void {
  const level = currentLevel(state);
  state.world.ball = createBall(level.ball);
  state.phase = "aiming";
  state.trail = [];
  const left = remainingShots(state);
  state.notice =
    left === 1
      ? "Шар укатился. Осталась последняя попытка"
      : `Шар укатился. Осталось ${left} ${attemptsWord(left)}`;
  state.noticeUntil = state.time + 3.2;
}

function burst(state: GameState, pos: Vec, color: string, count: number): void {
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const s = 40 + Math.random() * 120;
    state.particles.push({
      pos: clone(pos),
      vel: { x: Math.cos(a) * s, y: Math.sin(a) * s },
      life: 0.45 + Math.random() * 0.3,
      color,
    });
  }
}

function updateParticles(state: GameState, dt: number): void {
  for (const p of state.particles) {
    p.life -= dt;
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.vel.y += 220 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

export { LEVELS, MAX_SHOTS };
