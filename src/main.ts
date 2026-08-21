import "./style.css";
import { createAudio } from "./game/audio.ts";
import {
  clientToWorld,
  createGame,
  currentLevel,
  layoutCamera,
  LEVELS,
  MAX_SHOTS,
  nextLevel,
  pointerDown,
  pointerMove,
  pointerUp,
  remainingShots,
  resetLevel,
  tick,
  type Camera,
  type GameState,
} from "./game/game.ts";
import { draw, resizeCanvas } from "./game/render.ts";
import { haptic, lockPageChrome } from "./platform.ts";

function required<T>(value: T | null, message: string): T {
  if (!value) throw new Error(message);
  return value;
}

const canvas = required(document.querySelector<HTMLCanvasElement>("#game"), "Нет canvas");
const overlay = required(document.querySelector<HTMLDivElement>("#overlay"), "Нет overlay");
const hud = required(document.querySelector<HTMLDivElement>("#hud"), "Нет hud");
const play = required(document.querySelector<HTMLButtonElement>("#play"), "Нет кнопки");
const restart = required(document.querySelector<HTMLButtonElement>("#restart"), "Нет restart");
const levelLabel = required(document.querySelector<HTMLSpanElement>("#level-label"), "Нет level");
const shotLabel = required(document.querySelector<HTMLSpanElement>("#shot-label"), "Нет shots");
const toast = required(document.querySelector<HTMLDivElement>("#toast"), "Нет toast");
const ctx = required(canvas.getContext("2d"), "Canvas 2D недоступен");

lockPageChrome();

const sfx = createAudio();
let state: GameState = createGame();
let view = resizeCanvas(canvas, ctx);
let camera: Camera = layoutCamera(view.w, view.h);
let last = performance.now();

function showOverlay(title: string, lead: string, action: string): void {
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="panel">
      <p class="eyebrow">${currentLevel(state).name}</p>
      <h1>${title}</h1>
      <p class="lead">${lead}</p>
      <button id="play" type="button" class="primary">${action}</button>
    </div>
  `;
  overlay.querySelector("button")?.addEventListener("click", onPlay);
}

function onPlay(): void {
  void sfx.resume();
  overlay.hidden = true;
  hud.hidden = false;
  if (state.phase === "win") {
    state = nextLevel(state);
  } else if (state.phase === "fail" || state.phase === "title") {
    state = resetLevel(state.phase === "title" ? 0 : state.levelIndex);
  }
  syncHud();
}

function syncHud(): void {
  const level = currentLevel(state);
  const left = remainingShots(state);
  levelLabel.textContent = `Уровень ${state.levelIndex + 1} · ${level.name}`;
  shotLabel.textContent = `Попытки ${left} из ${MAX_SHOTS}`;
  if (state.notice && overlay.hidden) {
    toast.hidden = false;
    toast.textContent = state.notice;
  } else {
    toast.hidden = true;
    toast.textContent = "";
  }
}

function toWorld(event: PointerEvent) {
  return clientToWorld(canvas, camera, event.clientX, event.clientY);
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointerDown(state, toWorld(event));
});

canvas.addEventListener("pointermove", (event) => {
  pointerMove(state, toWorld(event));
});

canvas.addEventListener("pointerup", () => {
  pointerUp(state, () => {
    sfx.launch();
    haptic("medium");
    syncHud();
  });
});

canvas.addEventListener("pointercancel", () => {
  state.aim = null;
});

restart.addEventListener("click", () => {
  state = resetLevel(state.levelIndex);
  overlay.hidden = true;
  syncHud();
});

play.addEventListener("click", onPlay);

window.addEventListener("resize", () => {
  view = resizeCanvas(canvas, ctx);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "r" || event.key === "R") {
    state = resetLevel(state.levelIndex);
    overlay.hidden = true;
    hud.hidden = false;
    syncHud();
  }
});

function frame(now: number): void {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  const prev = state.phase;
  tick(state, dt, sfx);
  camera = draw(ctx, state, view);
  if (state.phase !== prev) {
    if (state.phase === "win") {
      haptic("heavy");
      const lastLevel = state.levelIndex === LEVELS.length - 1;
      showOverlay(
        lastLevel ? "Орбита закрыта" : "Маяки собраны",
        lastLevel ? "Все шесть уровней пройдены. Можно крутить заново." : "Следующий уровень — снова 3 попытки.",
        lastLevel ? "Сначала" : "Дальше",
      );
    }
    if (state.phase === "fail") {
      haptic("heavy");
      showOverlay("Попытки закончились", state.message, "Ещё раз");
    }
  }
  syncHud();
  requestAnimationFrame(frame);
}

syncHud();
requestAnimationFrame(frame);
