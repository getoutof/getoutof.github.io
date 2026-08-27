import { aimFromStick, clientOnCanvas, inControlZone, type Aim } from "./input.ts";
import { GROUND_TOP, LEVELS, targetCircles, type LevelDef } from "./levels.ts";
import { clamp, clone, LAUNCH_SCALE, MAX_PULL, MAX_SHOTS, WORLD, type Circle, type Vec } from "./math.ts";
import { createBall, hitsCircle, isResting, isSupported, speed, stepWorld, type Ball, type World } from "./physics.ts";

export type Phase = "title" | "aiming" | "flying" | "settle" | "win" | "fail";

export type Particle = {
  pos: Vec;
  vel: Vec;
  life: number;
  color: string;
  kind?: "ring";
  maxLife?: number;
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
  aim: Aim | null;
  particles: Particle[];
  trail: Vec[];
  shake: number;
  time: number;
  message: string;
  notice: string | null;
  noticeUntil: number;
  banner: string | null;
  bannerUntil: number;
  rumbleAfter: number;
  paused: boolean;
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
    banner: phase === "aiming" ? level.name : null,
    bannerUntil: phase === "aiming" ? 2.6 : 0,
    rumbleAfter: 0,
    paused: false,
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

export function controlPad(view: { w: number; h: number }, camera: Camera, safeBottom: number): Vec {
  const groundY = camera.offsetY + GROUND_TOP * camera.scale;
  const screenBottom = view.h - safeBottom;
  return { x: view.w / 2, y: (groundY + screenBottom) / 2 };
}

export function pointerDownStick(
  state: GameState,
  canvas: HTMLCanvasElement,
  camera: Camera,
  view: { w: number; h: number },
  safeBottom: number,
  clientX: number,
  clientY: number,
): void {
  if (state.paused || state.phase !== "aiming") return;
  const pad = controlPad(view, camera, safeBottom);
  const pointer = clientOnCanvas(clientX, clientY, canvas);
  if (!inControlZone(pad, pointer, camera.scale)) return;
  state.aim = {
    origin: state.world.ball.pos,
    pull: aimFromStick(pad, pointer, camera.scale),
    pointer,
  };
}

export function pointerMoveStick(
  state: GameState,
  canvas: HTMLCanvasElement,
  camera: Camera,
  view: { w: number; h: number },
  safeBottom: number,
  clientX: number,
  clientY: number,
): void {
  if (state.paused || state.phase !== "aiming" || !state.aim) return;
  const pad = controlPad(view, camera, safeBottom);
  const pointer = clientOnCanvas(clientX, clientY, canvas);
  state.aim = {
    origin: state.world.ball.pos,
    pull: aimFromStick(pad, pointer, camera.scale),
    pointer,
  };
}

export function pointerUp(state: GameState, onLaunch: (power: number) => void): void {
  if (state.paused || state.phase !== "aiming" || !state.aim) return;
  const power = Math.hypot(state.aim.pull.x, state.aim.pull.y);
  if (power < 12) {
    state.aim = null;
    return;
  }
  const charge = clamp(power / MAX_PULL, 0, 1);
  state.world.ball.vel = {
    x: state.aim.pull.x * LAUNCH_SCALE,
    y: state.aim.pull.y * LAUNCH_SCALE,
  };
  state.aim = null;
  state.phase = "flying";
  state.shots += 1;
  state.trail = [];
  state.rumbleAfter = state.time + 0.2 + (1 - charge) * 0.08;
  onLaunch(power);
}

export function flightRush(state: GameState): number {
  if (state.phase !== "flying" && state.phase !== "settle") return 0;
  return clamp((speed(state.world.ball) - 320) / 700, 0, 1);
}

export function heatAmount(state: GameState): number {
  if (state.aim) return clamp(Math.hypot(state.aim.pull.x, state.aim.pull.y) / MAX_PULL, 0, 1);
  if (state.phase === "flying" || state.phase === "settle") {
    return clamp((speed(state.world.ball) - 50) / 950, 0, 1);
  }
  return 0;
}

export function remainingShots(state: GameState): number {
  const spent = state.shots;
  const inFlight = state.phase === "flying" || state.phase === "settle";
  return Math.max(0, MAX_SHOTS - spent + (inFlight ? 1 : 0));
}

export function attemptsFraction(state: GameState): string {
  return `${remainingShots(state)} из ${MAX_SHOTS}`;
}

function attemptsWord(n: number): string {
  if (n === 1) return "попытка";
  if (n >= 2 && n <= 4) return "попытки";
  return "попыток";
}

export function tick(state: GameState, dt: number, sfx: SfxHooks): void {
  if (state.paused) return;
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 18);
  if (state.phase === "aiming" && state.aim) {
    const charge = clamp(Math.hypot(state.aim.pull.x, state.aim.pull.y) / MAX_PULL, 0, 1);
    const late = clamp((charge - 0.68) / 0.32, 0, 1);
    state.shake = Math.max(state.shake, late * late * 5.2);
  }
  if ((state.phase === "flying" || state.phase === "settle") && state.time >= state.rumbleAfter) {
    const rush = flightRush(state);
    state.shake = Math.min(9, Math.max(state.shake, rush * rush * 6.8));
  }
  if (state.notice && state.time >= state.noticeUntil) state.notice = null;
  if (state.banner && state.time >= state.bannerUntil) state.banner = null;
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
      state.shake = Math.max(state.shake, Math.min(8, prevSpeed / 150));
      sfx.bounce();
    }
    state.trail.push(clone(state.world.ball.pos));
    const trailCap = 12 + Math.round(flightRush(state) * 22);
    while (state.trail.length > trailCap) state.trail.shift();
    collectTargets(state, sfx);

    if (allCollected(state)) {
      state.phase = "win";
      burst(state, state.world.ball.pos, "#F2B62A", 22);
      sfx.win();
      return;
    }

    if (outOfWorld(state.world.ball)) {
      if (state.shots >= MAX_SHOTS) {
        state.phase = "fail";
        state.message = `Шар укатился. Попытки закончились — ${attemptsFraction(state)}`;
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
        state.message = `Попытки закончились — ${attemptsFraction(state)}. Маяки не собраны`;
        sfx.fail();
        return;
      }
      state.phase = "aiming";
      state.world.ball.vel = { x: 0, y: 0 };
      state.trail = [];
    }
  }
}

export function isLastLevel(index: number): boolean {
  return index >= LEVELS.length - 1;
}

export function nextLevel(state: GameState): GameState {
  if (isLastLevel(state.levelIndex)) return resetLevel(state.levelIndex);
  return resetLevel(state.levelIndex + 1);
}

export function remainingTargets(state: GameState): Circle[] {
  return targetCircles(currentLevel(state), state.time).filter((_, i) => !state.collected[i]);
}

function idleBob(ball: Ball, time: number): void {
  ball.pos.y = LEVELS[0].ball.y + Math.sin(time * 2.2) * 4;
}

function collectTargets(state: GameState, sfx: SfxHooks): void {
  const circles = targetCircles(currentLevel(state), state.time);
  circles.forEach((circle, index) => {
    if (state.collected[index]) return;
    if (hitsCircle(state.world.ball, circle)) {
      state.collected[index] = true;
      burst(state, circle, "#F2B62A", 16);
      state.particles.push({
        pos: clone(circle),
        vel: { x: 0, y: 0 },
        life: 0.55,
        maxLife: 0.55,
        color: "#F2B62A",
        kind: "ring",
      });
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
    if (p.kind === "ring") continue;
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.vel.y += 220 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

export { LEVELS, MAX_PULL, MAX_SHOTS };
