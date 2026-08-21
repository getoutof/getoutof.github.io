import { controlPad, currentLevel, flightRush, layoutCamera, predictPath, remainingTargets, type Camera, type GameState } from "./game.ts";
import { knobFromPull, STICK_KNOB_R, stickWellRadius } from "./input.ts";
import { BALL_RADIUS, MAX_PULL, WORLD } from "./math.ts";

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

  const rush = flightRush(state);
  const look = rush * 0.014;
  ctx.save();
  ctx.translate(
    camera.offsetX + (Math.random() - 0.5) * state.shake + state.world.ball.vel.x * look * camera.scale,
    camera.offsetY + (Math.random() - 0.5) * state.shake + state.world.ball.vel.y * look * camera.scale,
  );
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
  drawVignette(ctx, view.w, view.h, rush);
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
  const rush = flightRush(state);
  state.trail.forEach((p, i) => {
    const t = i / Math.max(1, state.trail.length);
    ctx.globalAlpha = t * (0.4 + rush * 0.5);
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4 + rush * 4.2 * t, 0, Math.PI * 2);
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
  const charge = state.aim ? Math.min(1, Math.hypot(state.aim.pull.x, state.aim.pull.y) / MAX_PULL) : 0;
  ctx.globalAlpha = active ? 1 : 0.35;
  ctx.beginPath();
  ctx.arc(pad.x, pad.y, stickWellRadius(camera.scale), 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(125, 240, 255, ${0.32 + charge * 0.5})`;
  ctx.lineWidth = 2 + charge * 2.4;
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
  const { pos, vel } = state.world.ball;
  const rush = flightRush(state);
  drawSpeedLines(ctx, pos.x, pos.y, vel.x, vel.y, rush, state.time);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  if (rush > 0.04) {
    const stretch = 1 + rush * 0.72;
    ctx.rotate(Math.atan2(vel.y, vel.x));
    ctx.scale(stretch, 1 / Math.sqrt(stretch));
  }
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 18 + rush * 26;
  const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, BALL_RADIUS);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.45, BALL);
  g.addColorStop(1, "#5bb8c8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vx: number,
  vy: number,
  rush: number,
  time: number,
): void {
  if (rush < 0.08) return;
  const s = Math.hypot(vx, vy);
  if (s < 1) return;
  const ux = vx / s;
  const uy = vy / s;
  const n = 5 + Math.floor(rush * 9);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.2 + rush * 1.6;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i += 1) {
    const along = 14 + i * (7 + rush * 9) + ((time * 140 + i * 19) % 18);
    const side = ((i % 2) * 2 - 1) * (7 + (i % 4) * 3.2) * (0.55 + rush);
    ctx.globalAlpha = (0.12 + rush * 0.5) * (1 - i / n);
    ctx.beginPath();
    const sx = x - ux * along + -uy * side;
    const sy = y - uy * along + ux * side;
    const len = 9 + rush * 22;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - ux * len, sy - uy * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
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

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, rush: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (0.25 - rush * 0.08), w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.42 + rush * 0.22})`);
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