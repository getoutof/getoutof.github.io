import { createGame, pointerDown, pointerMove, pointerUp, predictPath, resetLevel, tick } from "./game.ts";
import { LEVELS } from "./levels.ts";
import { createBall, hitsCircle, isSupported, stepWorld } from "./physics.ts";

const silent = { bounce() {}, collect() {}, win() {}, fail() {} };

const world = {
  ball: createBall({ x: 58, y: 579 }),
  platforms: LEVELS[0].platforms,
  wind: { x: 0, y: 0 },
};
for (let i = 0; i < 120; i += 1) stepWorld(world, 1 / 60);
if (world.ball.pos.y > 590) throw new Error(`ball fell through floor ${world.ball.pos.y}`);
if (!isSupported(world.ball, world.platforms)) throw new Error("ball should be supported after settling");

const g = resetLevel(0);
pointerDown(g, { x: 58, y: 650 });
pointerMove(g, { x: 58, y: 680 });
if (!g.aim) throw new Error("aim not started");
const path = predictPath(g, g.aim.pull);
if (path.length < 5) throw new Error("path too short");
pointerUp(g, () => {});
if (String(g.phase) !== "flying") throw new Error(`expected flying, got ${g.phase}`);
for (let i = 0; i < 240; i += 1) tick(g, 1 / 60, silent);
if (g.phase === "aiming" && !isSupported(g.world.ball, g.world.platforms)) {
  throw new Error(`settled in mid-air at ${JSON.stringify(g.world.ball.pos)}`);
}

if (!hitsCircle({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, r: 5 }, { x: 3, y: 0, r: 3 })) {
  throw new Error("hitsCircle false negative");
}

const title = createGame();
if (title.phase !== "title") throw new Error("expected title");

console.log("ok", { phase: g.phase, shots: g.shots, collected: g.collected, ball: g.world.ball.pos });
