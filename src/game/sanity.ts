import { controlPad, createGame, flightRush, heatAmount, layoutCamera, nextLevel, pointerUp, predictPath, remainingShots, resetLevel, tick } from "./game.ts";
import { aimFromStick, knobFromPointer, STICK_KNOB_R } from "./input.ts";
import { GROUND_TOP, LEVELS } from "./levels.ts";
import { MAX_PULL, MAX_SHOTS, BALL_RADIUS, TARGET_RADIUS, WORLD } from "./math.ts";
import { createBall, hitsCircle, isSupported, stepWorld } from "./physics.ts";
import { rememberStars, starsFromShots } from "./progress.ts";
import { heatColor } from "./render.ts";

const silent = { bounce() {}, collect() {}, win() {}, fail() {} };
const start = LEVELS[0].ball;

const world = {
  ball: createBall(start),
  platforms: LEVELS[0].platforms,
  wind: { x: 0, y: 0 },
};
for (let i = 0; i < 120; i += 1) stepWorld(world, 1 / 60);
if (world.ball.pos.y > GROUND_TOP) throw new Error(`ball fell through floor ${world.ball.pos.y}`);
if (!isSupported(world.ball, world.platforms)) throw new Error("ball should be supported after settling");

const g = resetLevel(0);
if (remainingShots(g) !== MAX_SHOTS) throw new Error("level should start with full attempts");
if (g.banner !== LEVELS[0].name) throw new Error("level start should show name banner");
g.aim = { origin: g.world.ball.pos, pull: { x: 40, y: -90 }, pointer: { x: 180, y: 400 } };
const path = predictPath(g, g.aim.pull);
if (path.length < 5) throw new Error("path too short");
pointerUp(g, () => {});
if (String(g.phase) !== "flying") throw new Error(`expected flying, got ${g.phase}`);
for (let i = 0; i < 240; i += 1) tick(g, 1 / 60, silent);
if (g.phase === "aiming" && !isSupported(g.world.ball, g.world.platforms)) {
  throw new Error(`settled in mid-air at ${JSON.stringify(g.world.ball.pos)}`);
}

g.shots = 2;
g.world.ball.pos = { x: -120, y: 800 };
g.phase = "flying";
tick(g, 1 / 60, silent);
if (String(g.phase) !== "aiming") throw new Error(`expected respawn aiming, got ${g.phase}`);
if (!g.notice?.includes("укатился")) throw new Error(`expected roll-away notice, got ${g.notice}`);
if (remainingShots(g) !== 1) throw new Error(`expected 1 attempt left, got ${remainingShots(g)}`);

g.phase = "win";
g.shots = 2;
const nxt = nextLevel(g);
if (nxt.shots !== 0) throw new Error("next level should reset attempts");
if (remainingShots(nxt) !== MAX_SHOTS) throw new Error("next level should restore 3 attempts");
if (nxt.banner !== LEVELS[1].name) throw new Error("next level should flash its name");

if (!hitsCircle({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, r: 5 }, { x: 3, y: 0, r: 3 })) {
  throw new Error("hitsCircle false negative");
}

const title = createGame();
if (title.phase !== "title") throw new Error("expected title");
if (title.banner) throw new Error("title should not show level banner");

const view = { w: 360, h: 640 };
const cam = layoutCamera(view.w, view.h);
const pad = controlPad(view, cam, 0);
const groundY = cam.offsetY + GROUND_TOP * cam.scale;
const midY = (groundY + view.h) / 2;
if (Math.abs(pad.y - midY) > 0.01) throw new Error(`stick should sit between ground and screen, got ${pad.y} expected ${midY}`);

const far = { x: pad.x + 400, y: pad.y + 400 };
const pull = aimFromStick(pad, far, cam.scale);
if (Math.abs(Math.hypot(pull.x, pull.y) - MAX_PULL) > 0.01) throw new Error("full drag should reach max pull");
const upFinger = { x: pad.x, y: pad.y - 48 };
const upKnob = knobFromPointer(upFinger, view, 0);
if (Math.abs(upKnob.x - upFinger.x) > 0.01 || Math.abs(upKnob.y - upFinger.y) > 0.01) {
  throw new Error(`knob should follow finger up, knob=${JSON.stringify(upKnob)} finger=${JSON.stringify(upFinger)}`);
}
const topKnob = knobFromPointer({ x: pad.x, y: 0 }, view, 0);
if (Math.abs(topKnob.y - STICK_KNOB_R) > 0.01) {
  throw new Error(`finger at top should park knob on the edge, y=${topKnob.y}`);
}
const near = { x: pad.x + 20, y: pad.y };
const shortPull = aimFromStick(pad, near, cam.scale);
if (Math.hypot(shortPull.x, shortPull.y) >= MAX_PULL * 0.5) throw new Error("short drag should stay below half power");

const delayed = resetLevel(0);
delayed.aim = { origin: delayed.world.ball.pos, pull: { x: 0, y: -MAX_PULL }, pointer: pad };
pointerUp(delayed, () => {});
tick(delayed, 1 / 60, silent);
if (delayed.shake > 0.4) throw new Error(`shake should wait after launch, got ${delayed.shake}`);
for (let i = 0; i < 18; i += 1) tick(delayed, 1 / 60, silent);
if (delayed.phase === "flying" && delayed.shake < 1.2) throw new Error(`late flight should rumble, got ${delayed.shake}`);

const rush = resetLevel(0);
rush.phase = "flying";
rush.world.ball.vel = { x: 920, y: -180 };
tick(rush, 1 / 60, silent);
if (flightRush(rush) < 0.7) throw new Error(`expected strong rush, got ${flightRush(rush)}`);
if (heatAmount(rush) < 0.7) throw new Error(`expected hot color, got ${heatAmount(rush)}`);
if (rush.shake < 2) throw new Error(`fast flight should shake, got ${rush.shake}`);

if (starsFromShots(1) !== 3 || starsFromShots(2) !== 2 || starsFromShots(3) !== 1) {
  throw new Error("stars should be 3/2/1 by attempt");
}
const best = rememberStars(0, 2);
if (best[0] !== 2) throw new Error(`best stars should record 2, got ${best[0]}`);
if (!heatColor(1).includes("255") || !heatColor(1).includes("90")) {
  throw new Error(`max heat should be coral-red, got ${heatColor(1)}`);
}

if (BALL_RADIUS !== 11) throw new Error(`ball radius must stay 11, got ${BALL_RADIUS}`);
if (TARGET_RADIUS !== 16) throw new Error(`beacon radius must stay 16, got ${TARGET_RADIUS}`);

const frozenPlatforms = [
  [{ x: 0, y: 430, w: 360, h: 210 }],
  [{ x: 0, y: 430, w: 360, h: 210 }],
  [
    { x: 0, y: 370, w: 110, h: 270 },
    { x: 250, y: 370, w: 110, h: 270 },
  ],
  [
    { x: 0, y: 430, w: 360, h: 210 },
    { x: 328, y: 60, w: 32, h: 370 },
    { x: 180, y: 270, w: 90, h: 18 },
  ],
  [
    { x: 0, y: 430, w: 360, h: 210 },
    { x: 210, y: 270, w: 100, h: 16 },
  ],
  [
    { x: 0, y: 430, w: 360, h: 210 },
    { x: 130, y: 310, w: 80, h: 16 },
    { x: 250, y: 190, w: 90, h: 16 },
    { x: 0, y: 90, w: 24, h: 340 },
  ],
] as const;

LEVELS.forEach((level, i) => {
  if (!level.sky) throw new Error(`level ${i} is missing sky data`);
  const got = JSON.stringify(level.platforms);
  const want = JSON.stringify(frozenPlatforms[i]);
  if (got !== want) throw new Error(`level ${i} platform layout changed: ${got}`);
});
if (LEVELS[0].sky.planet?.r !== 28) throw new Error("L1 planet radius should be ~28");
if (LEVELS[0].sky.planet && (LEVELS[0].sky.planet.x > WORLD.w / 2 || LEVELS[0].sky.planet.y > 160)) {
  throw new Error("L1 planet should sit upper-left");
}
if (LEVELS[1].sky.stars <= LEVELS[0].sky.stars) throw new Error("L2 should have denser stars than L1");
if (LEVELS[2].sky.planet) throw new Error("L3 should have no planet");
if (LEVELS[2].sky.stars >= LEVELS[0].sky.stars) throw new Error("L3 should have fewer stars than L1");
if (LEVELS[3].sky.planet) throw new Error("L4 should have no planet");
if (!LEVELS[4].sky.nebulae.some((n) => {
  const v = Number.parseInt(n.color.replace("#", ""), 16);
  const r = (v >> 16) & 255;
  const b = v & 255;
  return b > r + 40;
})) {
  throw new Error("L5 nebula should be cyan dust");
}
if (!LEVELS[5].sky.planet || LEVELS[5].sky.planet.x < WORLD.w / 2) throw new Error("L6 should have a small planet upper-right");

const grab = resetLevel(0);
grab.phase = "flying";
grab.world.ball.pos = { x: LEVELS[0].targets[0].x, y: LEVELS[0].targets[0].y };
grab.world.ball.vel = { x: 0, y: 0 };
tick(grab, 1 / 60, silent);
if (!grab.collected[0]) throw new Error("touching the beacon should collect it");
if (!grab.particles.some((p) => p.kind === "ring" && p.color === "#F2B62A")) {
  throw new Error("collect should spawn an expanding gold ring");
}
if (grab.particles.filter((p) => p.kind !== "ring").length < 8) {
  throw new Error("collect should keep burst particles");
}

console.log("ok", { phase: g.phase, shots: g.shots, collected: g.collected, ball: g.world.ball.pos });
