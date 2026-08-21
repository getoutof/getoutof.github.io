import { controlPad, currentLevel, layoutCamera, predictPath, remainingTargets, type Camera, type GameState } from "./game.ts";
import { knobFromPull, STICK_KNOB_R, stickWellRadius } from "./input.ts";
import { BALL_RADIUS, WORLD } from "./math.ts";

const BG = "#07080f";
const BALL = "#e8fbff";
const ACCENT = "#7df0ff";
const GOLD = "#ffb703";
const PLATFORM = "#1a2233";
const PLATFORM_TOP = "#2b3750";

const stars = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 97 + 13) % WORLD.w,
  y: (i * 53 + 29) % WORLD.h,
  r: 0.4 + (i % 4) * 0.35,
  a: 0.25 + (i % 5) * 0.1,
}));

export function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): { w: number; h: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: { w: number; h: number },
  safeBottom: number,
): Camera {
  const camera = layoutCamera(view.w, view.h);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, view.w, view.h);

  ctx.save();
  ctx.translate(camera.offsetX + (Math.random() - 0.5) * state.shake, camera.offsetY + (Math.random() - 0.5) * state.shake);
  ctx.scale(camera.scale, camera.scale);

  drawBackdrop(ctx, state.time);
  drawWind(ctx, state);
  drawPlatforms(ctx, state);
  drawTargets(ctx, state);
  drawTrail(ctx, state);
  if (state.aim) drawTrajectory(ctx, state);
  drawBall(ctx, state);
  drawParticles(ctx, state);

  ctx.restore();
  drawVignette(ctx, view.w, view.h);
  if (state.phase === "aiming" || state.phase === "flying" || state.phase === "settle") {
    drawStick(ctx, state, view, camera, safeBottom);
  }
  return camera;
}

function drawBackdrop(ctx: CanvasRenderingContext2D, time: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  g.addColorStop(0, "#0c1224");
  g.addColorStop(1, "#07080f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  for (const star of stars) {
    ctx.globalAlpha = star.a + Math.sin(time * 1.4 + star.x) * 0.08;
    ctx.fillStyle = "#d7e4ff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWind(ctx: CanvasRenderingContext2D, state: GameState): void {
  const wind = currentLevel(state).wind.x;
  if (Math.abs(wind) < 1) return;
  ctx.strokeStyle = "rgba(125, 240, 255, 0.28)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i += 1) {
    const y = 80 + i * 55;
    const x = ((state.time * wind * 1.6 + i * 40) % (WORLD.w + 40)) - 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sign(wind) * 28, y);
    ctx.stroke();
  }
}

function drawPlatforms(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.world.platforms) {
    roundRect(ctx, p.x, p.y, p.w, p.h, 8);
    ctx.fillStyle = PLATFORM;
    ctx.fill();
    ctx.fillStyle = PLATFORM_TOP;
    ctx.fillRect(p.x, p.y, p.w, 4);
  }
}

function drawTargets(ctx: CanvasRenderingContext2D, state: GameState): void {
  const live = remainingTargets(state);
  for (const t of live) {
    const pulse = 1 + Math.sin(state.time * 4) * 0.08;
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 1.55 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTrail(ctx: CanvasRenderingContext2D, state: GameState): void {
  state.trail.forEach((p, i) => {
    ctx.globalAlpha = (i / state.trail.length) * 0.45;
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawTrajectory(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.aim) return;
  const path = predictPath(state, state.aim.pull);
  path.forEach((p, i) => {
    ctx.globalAlpha = 1 - i / path.length;
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawStick(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: { w: number; h: number },
  camera: Camera,
  safeBottom: number,
): void {
  const pad = controlPad(view, camera, safeBottom);
  const active = state.phase === "aiming";
  ctx.globalAlpha = active ? 1 : 0.35;
  ctx.beginPath();
  ctx.arc(pad.x, pad.y, stickWellRadius(camera.scale), 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(125, 240, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const knob = state.aim ? knobFromPull(pad, state.aim.pull, camera.scale) : pad;
  ctx.beginPath();
  ctx.arc(knob.x, knob.y, STICK_KNOB_R, 0, Math.PI * 2);
  ctx.fillStyle = active ? "#e8fbff" : "rgba(232, 251, 255, 0.55)";
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBall(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { pos } = state.world.ball;
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 18;
  const g = ctx.createRadialGradient(pos.x - 3, pos.y - 4, 2, pos.x, pos.y, BALL_RADIUS);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.45, BALL);
  g.addColorStop(1, "#5bb8c8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}