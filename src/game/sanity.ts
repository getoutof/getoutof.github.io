import { controlPad, createGame, layoutCamera, nextLevel, pointerUp, predictPath, remainingShots, resetLevel, tick } from "./game.ts";
import { aimFromStick, knobFromPull, STICK_KNOB_R, stickKnobTravel, stickWellRadius } from "./input.ts";
import { GROUND_TOP, LEVELS } from "./levels.ts";
import { MAX_PULL, MAX_SHOTS } from "./math.ts";
import { createBall, hitsCircle, isSupported, stepWorld } from "./physics.ts";

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
g.aim = { origin: g.world.ball.pos, pull: { x: 40, y: -90 } };
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

const well = stickWellRadius(cam.scale);
const far = { x: pad.x + 400, y: pad.y + 400 };
const pull = aimFromStick(pad, far, cam.scale);
if (Math.abs(Math.hypot(pull.x, pull.y) - MAX_PULL) > 0.01) throw new Error("full drag should reach max pull");
const knob = knobFromPull(pad, pull, cam.scale);
const knobDist = Math.hypot(knob.x - pad.x, knob.y - pad.y);
const maxKnob = well + STICK_KNOB_R;
if (knobDist > maxKnob + 0.5) throw new Error(`knob escaped ${knobDist} > ${maxKnob}`);
if (knobDist < maxKnob - 0.5) throw new Error(`full pull should sit a knob-radius past the well, got ${knobDist}`);
if (Math.abs(stickKnobTravel(cam.scale) - maxKnob) > 0.01) throw new Error("stickKnobTravel should be well + knob");
const near = { x: pad.x + 20, y: pad.y };
const shortPull = aimFromStick(pad, near, cam.scale);
if (Math.hypot(shortPull.x, shortPull.y) >= MAX_PULL * 0.5) throw new Error("short drag should stay below half power");

console.log("ok", { phase: g.phase, shots: g.shots, collected: g.collected, ball: g.world.ball.pos });
