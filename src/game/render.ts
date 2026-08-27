import { controlPad, currentLevel, flightRush, heatAmount, layoutCamera, predictPath, remainingTargets, type Camera, type GameState } from "./game.ts";
import { knobFromPointer, STICK_KNOB_R, stickWellRadius } from "./input.ts";
import type { SkyDef, SkyNebula, SkyPlanet } from "./levels.ts";
import { BALL_RADIUS, TARGET_RADIUS, WORLD } from "./math.ts";

const BG = "#07080f";
const BALL = "#e8fbff";
const ACCENT = "#7df0ff";
const GOLD = "#F2B62A";
const CORE_HI = "#FFD678";
const SPECULAR = "#FFF6D8";
const PLATFORM_TOP = "#304056";
const PLATFORM_SPEC = "rgba(125, 240, 255, 0.22)";
const RIM_H = 6;

type Rgb = { r: number; g: number; b: number };

const CYAN_RGB: Rgb = { r: 125, g: 240, b: 255 };
const GOLD_RGB: Rgb = { r: 242, g: 182, b: 42 };
const HOT_RGB: Rgb = { r: 255, g: 90, b: 78 };

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function rgbCss(c: Rgb, a = 1): string {
  return a < 1 ? `rgba(${c.r}, ${c.g}, ${c.b}, ${a})` : `rgb(${c.r}, ${c.g}, ${c.b})`;
}

export function heatColor(t: number, alpha = 1): string {
  const u = Math.max(0, Math.min(1, t));
  const c = u < 0.55 ? mixRgb(CYAN_RGB, GOLD_RGB, u / 0.55) : mixRgb(GOLD_RGB, HOT_RGB, (u - 0.55) / 0.45);
  return rgbCss(c, alpha);
}

type Star = { x: number; y: number; r: number; a: number };

const starCache = new Map<number, Star[]>();

function starsFor(count: number): Star[] {
  let list = starCache.get(count);
  if (!list) {
    list = Array.from({ length: count }, (_, i) => ({
      x: (i * 97 + 13) % WORLD.w,
      y: (i * 53 + 29) % WORLD.h,
      r: 0.4 + (i % 4) * 0.35,
      a: 0.22 + (i % 5) * 0.1,
    }));
    starCache.set(count, list);
  }
  return list;
}

function hexRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

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

  drawBackdrop(ctx, currentLevel(state).sky, state.time);
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

function drawBackdrop(ctx: CanvasRenderingContext2D, sky: SkyDef, time: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  g.addColorStop(0, sky.top);
  g.addColorStop(1, sky.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  for (const blob of sky.nebulae) drawNebula(ctx, blob);
  for (const star of starsFor(sky.stars)) {
    ctx.globalAlpha = star.a + Math.sin(time * 1.4 + star.x) * 0.08;
    ctx.fillStyle = "#d7e4ff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (sky.planet) drawPlanet(ctx, sky.planet);
}

function drawNebula(ctx: CanvasRenderingContext2D, blob: SkyNebula): void {
  const rgb = hexRgb(blob.color);
  const g = ctx.createRadialGradient(blob.x, blob.y, blob.r * 0.08, blob.x, blob.y, blob.r);
  g.addColorStop(0, rgbCss(rgb, blob.alpha));
  g.addColorStop(0.55, rgbCss(rgb, blob.alpha * 0.45));
  g.addColorStop(1, rgbCss(rgb, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlanet(ctx: CanvasRenderingContext2D, planet: SkyPlanet): void {
  const { x, y, r } = planet;
  const litRight = planet.lit !== "left";
  const lightX = litRight ? x + r * 0.32 : x - r * 0.32;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  const body = ctx.createRadialGradient(lightX, y - r * 0.18, r * 0.15, x, y, r);
  body.addColorStop(0, "#252d3c");
  body.addColorStop(0.45, "#141a26");
  body.addColorStop(1, "#07090e");
  ctx.fillStyle = body;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  const shade = ctx.createLinearGradient(litRight ? x - r : x + r, y, litRight ? x + r : x - r, y);
  shade.addColorStop(0, "rgba(0,0,0,0.62)");
  shade.addColorStop(0.48, "rgba(0,0,0,0.18)");
  shade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shade;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(170, 186, 210, 0.28)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, r - 0.7, litRight ? -Math.PI * 0.42 : Math.PI * 0.58, litRight ? Math.PI * 0.42 : Math.PI * 1.42);
  ctx.stroke();
  ctx.restore();
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
    ctx.save();
    roundRect(ctx, p.x, p.y, p.w, p.h, 4);
    ctx.clip();
    const shade = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    shade.addColorStop(0, "#161e2c");
    shade.addColorStop(0.45, "#121826");
    shade.addColorStop(1, "#0c121c");
    ctx.fillStyle = shade;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    const rim = Math.min(RIM_H, p.h);
    ctx.fillStyle = PLATFORM_TOP;
    ctx.fillRect(p.x, p.y, p.w, rim);
    ctx.fillStyle = PLATFORM_SPEC;
    ctx.fillRect(p.x, p.y, p.w, 1);
    ctx.restore();
  }
}

function drawTargets(ctx: CanvasRenderingContext2D, state: GameState): void {
  const live = remainingTargets(state);
  for (const t of live) {
    const pulse = 1 + Math.sin(state.time * 4) * 0.08;
    const bloom = ctx.createRadialGradient(t.x, t.y, t.r * 0.2, t.x, t.y, t.r * 2.45);
    bloom.addColorStop(0, "rgba(242, 182, 42, 0.42)");
    bloom.addColorStop(0.38, "rgba(242, 182, 42, 0.16)");
    bloom.addColorStop(1, "rgba(242, 182, 42, 0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 2.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 1.48 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.88;
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(t.x + Math.cos(a) * t.r * 1.7, t.y + Math.sin(a) * t.r * 1.7);
      ctx.lineTo(t.x + Math.cos(a) * t.r * 2.0, t.y + Math.sin(a) * t.r * 2.0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";

    const coreR = t.r - 2.6;
    const core = ctx.createRadialGradient(t.x - coreR * 0.32, t.y - coreR * 0.38, coreR * 0.06, t.x, t.y, coreR);
    core.addColorStop(0, CORE_HI);
    core.addColorStop(1, GOLD);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(t.x, t.y, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = SPECULAR;
    ctx.beginPath();
    ctx.arc(t.x - coreR * 0.32, t.y - coreR * 0.38, Math.max(1.15, coreR * 0.14), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTrail(ctx: CanvasRenderingContext2D, state: GameState): void {
  const rush = flightRush(state);
  const heat = heatAmount(state);
  state.trail.forEach((p, i) => {
    const t = i / Math.max(1, state.trail.length);
    ctx.globalAlpha = t * (0.4 + rush * 0.5);
    ctx.fillStyle = heatColor(heat * (0.35 + t * 0.65));
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4 + rush * 4.2 * t, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawTrajectory(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.aim) return;
  const heat = heatAmount(state);
  const path = predictPath(state, state.aim.pull);
  path.forEach((p, i) => {
    ctx.globalAlpha = 1 - i / path.length;
    ctx.fillStyle = heatColor(heat);
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
  const heat = heatAmount(state);
  ctx.globalAlpha = active ? 1 : 0.35;
  ctx.beginPath();
  ctx.arc(pad.x, pad.y, stickWellRadius(camera.scale), 0, Math.PI * 2);
  ctx.strokeStyle = heatColor(heat, 0.32 + heat * 0.5);
  ctx.lineWidth = 2 + heat * 2.4;
  ctx.stroke();

  const knob = state.aim ? knobFromPointer(state.aim.pointer, view, safeBottom) : pad;
  ctx.beginPath();
  ctx.arc(knob.x, knob.y, STICK_KNOB_R, 0, Math.PI * 2);
  ctx.fillStyle = active ? heatColor(heat) : "rgba(232, 251, 255, 0.55)";
  ctx.fill();
  ctx.strokeStyle = heat > 0.04 ? heatColor(Math.min(1, heat + 0.12)) : ACCENT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBall(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { pos, vel } = state.world.ball;
  const rush = flightRush(state);
  const heat = heatAmount(state);
  drawSpeedLines(ctx, pos.x, pos.y, vel.x, vel.y, rush, heat, state.time);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  if (rush > 0.04) {
    const stretch = 1 + rush * 0.72;
    ctx.rotate(Math.atan2(vel.y, vel.x));
    ctx.scale(stretch, 1 / Math.sqrt(stretch));
  }
  if (heat < 0.08) {
    const glow = ctx.createRadialGradient(0, 0, BALL_RADIUS * 0.2, 0, 0, BALL_RADIUS * 3.1);
    glow.addColorStop(0, "rgba(125, 240, 255, 0.32)");
    glow.addColorStop(0.45, "rgba(125, 240, 255, 0.1)");
    glow.addColorStop(1, "rgba(125, 240, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS * 3.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowColor = heatColor(heat);
  ctx.shadowBlur = 24 + rush * 26;
  const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, BALL_RADIUS);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.42, heat < 0.08 ? BALL : heatColor(heat * 0.55));
  g.addColorStop(1, heat < 0.08 ? "#5bb8c8" : heatColor(heat));
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
  heat: number,
  time: number,
): void {
  if (rush < 0.08) return;
  const s = Math.hypot(vx, vy);
  if (s < 1) return;
  const ux = vx / s;
  const uy = vy / s;
  const n = 5 + Math.floor(rush * 9);
  ctx.strokeStyle = heatColor(heat);
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
    if (p.kind === "ring") {
      const maxLife = p.maxLife ?? 0.55;
      const u = 1 - Math.max(0, p.life) / maxLife;
      ctx.globalAlpha = Math.max(0, 1 - u) * 0.9;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, TARGET_RADIUS + u * 38, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
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