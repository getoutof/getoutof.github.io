import { attemptsFraction, controlPad, createGame, flightRush, heatAmount, isLastLevel, layoutCamera, nextLevel, pointerUp, predictPath, remainingShots, remainingTargets, resetLevel, tick } from "./game.ts";
import { aimFromStick, knobFromPointer, STICK_KNOB_R } from "./input.ts";
import { GROUND_TOP, LEVELS, targetPos, type LevelDef, type TargetDef } from "./levels.ts";
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
if (remainingShots(g) !== MAX_SHOTS) {
  throw new Error(`in-flight first shot should still show ${MAX_SHOTS} remaining, got ${remainingShots(g)}`);
}
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

const lastFlight = resetLevel(0);
lastFlight.shots = MAX_SHOTS;
lastFlight.phase = "flying";
if (remainingShots(lastFlight) !== 1) {
  throw new Error(`last in-flight shot must still count as 1 attempt, got ${remainingShots(lastFlight)}`);
}
if (attemptsFraction(lastFlight) !== "1 из 3") {
  throw new Error(`HUD/fail copy must share remaining attempts, got ${attemptsFraction(lastFlight)}`);
}
lastFlight.phase = "settle";
if (remainingShots(lastFlight) !== 1) {
  throw new Error(`last settling shot must still count as 1 attempt, got ${remainingShots(lastFlight)}`);
}
lastFlight.phase = "flying";
lastFlight.world.ball.pos = { x: -120, y: 800 };
tick(lastFlight, 1 / 60, silent);
if (String(lastFlight.phase) !== "fail") throw new Error(`expected fail after last roll-away, got ${lastFlight.phase}`);
if (remainingShots(lastFlight) !== 0) throw new Error(`fail should show 0 remaining, got ${remainingShots(lastFlight)}`);
if (!lastFlight.message.includes("0 из 3")) {
  throw new Error(`fail copy should match HUD remaining, got ${lastFlight.message}`);
}

const paused = resetLevel(0);
paused.phase = "flying";
paused.paused = true;
paused.world.ball.pos = { ...targetPos(LEVELS[0].targets[0], paused.time) };
paused.world.ball.vel = { x: 420, y: -180 };
const frozen = { x: paused.world.ball.pos.x, y: paused.world.ball.pos.y, t: paused.time };
tick(paused, 1 / 60, silent);
if (String(paused.phase) !== "flying") throw new Error(`levels overlay must not resolve the shot, got ${paused.phase}`);
if (paused.collected[0]) throw new Error("levels overlay must not collect beacons");
if (paused.world.ball.pos.x !== frozen.x || paused.world.ball.pos.y !== frozen.y) {
  throw new Error("levels overlay must freeze physics");
}
if (paused.time !== frozen.t) throw new Error("levels overlay must freeze sim time");
paused.paused = false;
tick(paused, 1 / 60, silent);
if (paused.world.ball.pos.x === frozen.x && paused.world.ball.pos.y === frozen.y) {
  throw new Error("unpausing should resume the in-flight shot");
}

const noLaunch = resetLevel(0);
noLaunch.aim = { origin: noLaunch.world.ball.pos, pull: { x: 40, y: -90 }, pointer: { x: 180, y: 400 } };
noLaunch.paused = true;
pointerUp(noLaunch, () => {
  throw new Error("paused overlay must not launch");
});
if (String(noLaunch.phase) !== "aiming") throw new Error("paused overlay must keep the aimed shot");

g.phase = "win";
g.shots = 2;
const nxt = nextLevel(g);
if (nxt.shots !== 0) throw new Error("next level should reset attempts");
if (remainingShots(nxt) !== MAX_SHOTS) throw new Error("next level should restore 3 attempts");
if (nxt.banner !== LEVELS[1].name) throw new Error("next level should flash its name");

const ontoLast = nextLevel(resetLevel(LEVELS.length - 2));
if (ontoLast.levelIndex !== LEVELS.length - 1) throw new Error("penultimate nextLevel should open the finale");
const afterLast = nextLevel(resetLevel(LEVELS.length - 1));
if (afterLast.levelIndex === 0) throw new Error("nextLevel must not wrap to level 1 after the last win");
if (afterLast.levelIndex !== LEVELS.length - 1) throw new Error("nextLevel on the last level should stay there");
if (!isLastLevel(LEVELS.length - 1) || isLastLevel(0)) throw new Error("isLastLevel should only match the finale");

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

if (LEVELS.length !== 12) throw new Error(`expected 12 levels, got ${LEVELS.length}`);
const frozenNames = ["Первый бросок", "Два маяка", "Через пропасть", "Банк от стены", "Боковой ветер", "Три орбиты"] as const;
const newNames = ["Карусель", "Маятник", "Три берега", "Восходящий", "Две орбиты", "Последний круг"] as const;
frozenNames.forEach((name, i) => {
  if (LEVELS[i].name !== name) throw new Error(`level ${i} name changed: ${LEVELS[i].name}`);
});
newNames.forEach((name, i) => {
  if (LEVELS[i + 6].name !== name) throw new Error(`level ${i + 6} should be ${name}, got ${LEVELS[i + 6].name}`);
});
if (new Set(LEVELS.map((l) => l.name)).size !== LEVELS.length) throw new Error("level names must be unique");
LEVELS.forEach((level, i) => {
  if (!level.sky) throw new Error(`level ${i} is missing sky data`);
});
frozenPlatforms.forEach((want, i) => {
  const got = JSON.stringify(LEVELS[i].platforms);
  if (got !== JSON.stringify(want)) throw new Error(`level ${i} platform layout changed: ${got}`);
});
const frozenWind = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 92, y: 0 },
  { x: -48, y: 0 },
] as const;
frozenWind.forEach((want, i) => {
  if (LEVELS[i].wind.x !== want.x || LEVELS[i].wind.y !== want.y) {
    throw new Error(`level ${i} wind changed: ${JSON.stringify(LEVELS[i].wind)}`);
  }
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
grab.world.ball.pos = { ...targetPos(LEVELS[0].targets[0], grab.time) };
grab.world.ball.vel = { x: 0, y: 0 };
tick(grab, 1 / 60, silent);
if (!grab.collected[0]) throw new Error("touching the beacon should collect it");
if (!grab.particles.some((p) => p.kind === "ring" && p.color === "#F2B62A")) {
  throw new Error("collect should spawn an expanding gold ring");
}
if (grab.particles.filter((p) => p.kind !== "ring").length < 8) {
  throw new Error("collect should keep burst particles");
}

const frozenTargets = [
  [{ x: 292, y: GROUND_TOP - 32 }],
  [
    { x: 188, y: GROUND_TOP - 32 },
    { x: 308, y: GROUND_TOP - 32 },
  ],
  [{ x: 300, y: 370 - 32 }],
  [{ x: 224, y: 238 }],
  [{ x: 258, y: 238 }],
  [
    { x: 168, y: 278 },
    { x: 292, y: 158 },
    { x: 292, y: GROUND_TOP - 32 },
  ],
] as const;

LEVELS.slice(0, 6).forEach((level, i) => {
  level.targets.forEach((t, j) => {
    if (t.motion) throw new Error(`pack level ${i} target ${j} must stay static`);
  });
  const got = JSON.stringify(level.targets.map((t) => ({ x: t.x, y: t.y })));
  const want = JSON.stringify(frozenTargets[i]);
  if (got !== want) throw new Error(`level ${i} target layout changed: ${got}`);
});

function sampleTarget(target: TargetDef, samples = 48): { x: number; y: number }[] {
  return Array.from({ length: samples }, (_, i) => targetPos(target, (i / samples) * 12));
}

LEVELS.forEach((level, i) => {
  if (level.targets.length < 1) throw new Error(`level ${i} needs a beacon`);
  level.targets.forEach((target, j) => {
    for (const p of sampleTarget(target)) {
      if (p.x < 18 || p.x > 342 || p.y < 40 || p.y > 410) {
        throw new Error(`level ${i} target ${j} leaves the screen at ${JSON.stringify(p)}`);
      }
      const inside = level.platforms.some(
        (r) => p.x > r.x + 2 && p.x < r.x + r.w - 2 && p.y > r.y + 2 && p.y < r.y + r.h - 2,
      );
      if (inside) throw new Error(`level ${i} target ${j} parks inside a wall at ${JSON.stringify(p)}`);
    }
  });
});

const carousel = LEVELS[6];
if (carousel.platforms.length !== 1 || carousel.wind.x !== 0 || carousel.wind.y !== 0) {
  throw new Error("Карусель should be a still full-floor orbit lesson");
}
const carouselOrbit = carousel.targets[0]?.motion;
if (carousel.targets.length !== 1 || carouselOrbit?.kind !== "orbit") throw new Error("Карусель needs one orbiting beacon");
if (Math.abs(carousel.targets[0].x - 210) > 8 || Math.abs(carousel.targets[0].y - 250) > 8) {
  throw new Error("Карусель orbit center should sit near 210,250");
}
if (Math.abs(carouselOrbit.radius - 48) > 4 || Math.abs(carouselOrbit.period - 3.5) > 0.3) {
  throw new Error("Карусель orbit should be ~radius 48 / period 3.5");
}

const pendulum = LEVELS[7];
if (pendulum.wind.x !== 0 || pendulum.wind.y !== 0) throw new Error("Маятник should have no wind");
if (pendulum.platforms.length < 2) throw new Error("Маятник needs a mid platform");
const pendulumLine = pendulum.targets[0]?.motion;
if (pendulum.targets.length !== 1 || pendulumLine?.kind !== "line") throw new Error("Маятник needs one line-patrol beacon");
if (Math.abs(pendulumLine.period - 4) > 0.3) throw new Error("Маятник patrol period should be ~4");

const shores = LEVELS[8];
if (shores.wind.x !== 0 || shores.wind.y !== 0) throw new Error("Три берега should have no wind");
if (shores.platforms.length !== 3) throw new Error("Три берега needs three floor pads");
if (shores.targets.some((t) => t.motion)) throw new Error("Три берега beacon should stay static");
const abyss = WORLD.w - shores.platforms.reduce((sum, p) => sum + p.w, 0);
if (abyss <= 140) throw new Error(`Три берега should have more abyss than level 3, got ${abyss}`);
if (shores.ball.x > 80) throw new Error("Три берега ball should start on the left pad");
if (shores.targets[0].x < 280) throw new Error("Три берега beacon should sit on the right pad");

const updraft = LEVELS[9];
if (updraft.wind.x !== 0 || updraft.wind.y !== -70) throw new Error("Восходящий wind should be {x:0,y:-70}");
if (updraft.platforms.length !== 2) throw new Error("Восходящий should be full floor plus a high shelf");
const shelf = updraft.platforms[1];
if (shelf.y > 140) throw new Error("Восходящий shelf should sit high");
if (updraft.targets[0].motion) throw new Error("Восходящий beacon should stay static");
if (updraft.targets[0].x < shelf.x || updraft.targets[0].x > shelf.x + shelf.w) {
  throw new Error("Восходящий beacon should sit on the high shelf");
}

const dual = LEVELS[10];
if (Math.abs(dual.wind.x - 40) > 8 || dual.wind.y !== 0) throw new Error("Две орбиты should have gentle side wind");
const dualOrbits = dual.targets.map((t) => t.motion);
if (dualOrbits.length !== 2 || dualOrbits.some((m) => m?.kind !== "orbit")) throw new Error("Две орбиты needs two orbiting beacons");
const [a, b] = dualOrbits;
if (a?.kind !== "orbit" || b?.kind !== "orbit") throw new Error("Две орбиты orbits missing");
if (a.radius === b.radius && a.period === b.period && (a.phase ?? 0) === (b.phase ?? 0)) {
  throw new Error("Две орбиты orbits must not share radius, period, and phase");
}

const finale = LEVELS[11];
if (finale.wind.x === 0 || finale.wind.y === 0) throw new Error("Последний круг wind needs both x and y");
if (finale.platforms.length !== 2) throw new Error("Последний круг needs a gap between two pads");
const finaleOrbit = finale.targets[0]?.motion;
if (finale.targets.length !== 1 || finaleOrbit?.kind !== "orbit") throw new Error("Последний круг needs one orbiting beacon");
const farPad = finale.platforms[1];
if (finale.targets[0].x < farPad.x || finale.targets[0].x > farPad.x + farPad.w) {
  throw new Error("Последний круг orbit center should sit over the far pad");
}
const pitLeft = finale.platforms[0].x + finale.platforms[0].w;
for (const p of sampleTarget(finale.targets[0])) {
  if (p.x < pitLeft && p.y > farPad.y) throw new Error("Последний круг orbit must not drop into the pit");
}

if (!LEVELS[11].sky.nebulae.some((n) => {
  const v = Number.parseInt(n.color.replace("#", ""), 16);
  const r = (v >> 16) & 255;
  const bch = v & 255;
  return r > bch + 40;
})) {
  throw new Error("Последний круг sky should be a warm nebula like Три орбиты");
}

const orbitBeacon = { x: 180, y: 200, motion: { kind: "orbit" as const, radius: 50, period: 2 } };
const orbitRest = targetPos(orbitBeacon, 0);
if (Math.abs(orbitRest.x - 230) > 1e-9 || Math.abs(orbitRest.y - 200) > 1e-9) {
  throw new Error(`orbit at t=0 should sit at rest +x, got ${JSON.stringify(orbitRest)}`);
}
const orbitQuarter = targetPos(orbitBeacon, 0.5);
if (Math.abs(orbitQuarter.x - 180) > 1e-9 || Math.abs(orbitQuarter.y - 250) > 1e-9) {
  throw new Error(`orbit should translate to +y at T/4, got ${JSON.stringify(orbitQuarter)}`);
}

const lineBeacon = { x: 80, y: 300, motion: { kind: "line" as const, to: { x: 280, y: 300 }, period: 4 } };
const lineMid = targetPos(lineBeacon, 2);
if (Math.abs(lineMid.x - 280) > 1e-9 || Math.abs(lineMid.y - 300) > 1e-9) {
  throw new Error(`line patrol should reach 'to' at period/2, got ${JSON.stringify(lineMid)}`);
}
const lineBack = targetPos(lineBeacon, 4);
if (Math.abs(lineBack.x - 80) > 1e-9 || Math.abs(lineBack.y - 300) > 1e-9) {
  throw new Error(`line patrol should return to rest at period, got ${JSON.stringify(lineBack)}`);
}

const motionLevel: LevelDef = {
  name: "motion-sanity",
  wind: { x: 0, y: 0 },
  ball: LEVELS[0].ball,
  platforms: LEVELS[0].platforms,
  targets: [orbitBeacon],
  sky: LEVELS[0].sky,
};
LEVELS.push(motionLevel);
try {
  const hit = resetLevel(LEVELS.length - 1);
  hit.phase = "flying";
  const dt = 1 / 60;
  hit.time = 0.5 - dt;
  const live = targetPos(orbitBeacon, 0.5);
  hit.world.ball.pos = { x: live.x, y: live.y };
  hit.world.ball.vel = { x: 0, y: 0 };
  tick(hit, dt, silent);
  if (!hit.collected[0]) throw new Error("collect must use the moving beacon position");

  const miss = resetLevel(LEVELS.length - 1);
  miss.phase = "flying";
  miss.time = 0.5 - dt;
  miss.world.ball.pos = { x: orbitBeacon.x, y: orbitBeacon.y };
  miss.world.ball.vel = { x: 0, y: 0 };
  tick(miss, dt, silent);
  if (miss.collected[0]) throw new Error("collect must not hit the orbit rest pose while the beacon is away");

  const frozenMotion = resetLevel(LEVELS.length - 1);
  frozenMotion.paused = true;
  const before = remainingTargets(frozenMotion)[0];
  tick(frozenMotion, 1, silent);
  const after = remainingTargets(frozenMotion)[0];
  if (before.x !== after.x || before.y !== after.y) {
    throw new Error("pause must freeze beacon motion");
  }
} finally {
  LEVELS.pop();
}

console.log("ok", { phase: g.phase, shots: g.shots, collected: g.collected, ball: g.world.ball.pos });
